import { prisma } from '@/configs';
import { CreateProductInterface, DepotInterface, StockLotInterface, UpdateProductInterface, BatchImportDTO } from './interfaces';
import { ProductType, Prisma } from '@prisma/client';
import { BusinessError, calculatePriceWithMarkup, updateRecursiveRecipeCosts } from '@/utils';
import { Decimal } from '@prisma/client/runtime/client';
import { v2 as cloudinary } from 'cloudinary';

export class ProductService {

    private getCloudinaryConfig() {
        const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
        const apiKey = process.env.CLOUDINARY_API_KEY;
        const apiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudName || !apiKey || !apiSecret) return null;

        return { cloudName, apiKey, apiSecret };
    }

    private extractCloudinaryPublicIdFromUrl(imageUrl: string, cloudName: string): string | null {
        // Only attempt extraction for this Cloudinary cloud
        if (!imageUrl.includes(`res.cloudinary.com/${cloudName}/`)) return null;

        // Typical Cloudinary URL:
        // https://res.cloudinary.com/<cloudName>/image/upload/v12345/folder/name.ext
        const match = imageUrl.match(/\/upload\/(?:v\d+\/)?(.+?)\.[a-z0-9]+(?:\?.*)?$/i);
        if (!match?.[1]) return null;
        return match[1];
    }

    private async deleteCloudinaryAssetIfPossible(publicId: string) {
        const cfg = this.getCloudinaryConfig();
        if (!cfg) return;

        cloudinary.config({
            cloud_name: cfg.cloudName,
            api_key: cfg.apiKey,
            api_secret: cfg.apiSecret,
        });

        await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });
    }

    async deleteCloudinaryImage(publicId: string) {
        try {
            const cfg = this.getCloudinaryConfig();
            if (!cfg) {
                return {
                    status: 500,
                    message: 'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET',
                    data: null
                };
            }

            cloudinary.config({
                cloud_name: cfg.cloudName,
                api_key: cfg.apiKey,
                api_secret: cfg.apiSecret,
            });

            const destroyResult = await cloudinary.uploader.destroy(publicId, { resource_type: 'image', invalidate: true });

            return {
                status: 200,
                message: 'Imagen eliminada',
                data: destroyResult
            };
        } catch (error) {
            console.error('Error deleteCloudinaryImage:', error);
            return {
                status: 500,
                message: 'No se pudo eliminar la imagen',
                data: null
            };
        }
    }

    // Helper para obtener el nombre en español del tipo de producto
    private getProductTypeName(type: ProductType): string {
        const typeNames: Record<ProductType, string> = {
            [ProductType.SIMPLE]: 'Simple',
            [ProductType.COMPOSITE]: 'Compuesto',
            [ProductType.SERVICE]: 'Servicio'
        };
        return typeNames[type] || type;
    }

    async create(businessId: number, userId: number, membershipId: number, data: CreateProductInterface) {
        try {
            const initialStock = Number(data.stockInitial || 0);
            const hasInitialStock = initialStock > 0;

            if (hasInitialStock && (!data.initialDepotId || data.initialDepotId <= 0)) {
                return {
                    message: 'Si ingresas stock inicial, debes seleccionar un depósito inicial',
                    status: 400,
                    data: null
                };
            }

            // =================================================================
            // FASE 1: VALIDACIONES BÁSICAS (Paralelizadas)
            // =================================================================
            const [business, category, unit, tax, existingSku, initialDepot] = await Promise.all([
                prisma.business.findUnique({ where: { id: businessId } }),
                prisma.category.findFirst({ where: { id: data.categoryId, businessId } }),
                prisma.measurementUnit.findUnique({ where: { id: data.unitId } }),
                prisma.tax.findUnique({ where: { id: data.taxId } }),
                data.sku ? prisma.product.findFirst({ where: { sku: data.sku, businessId } }) : null,
                hasInitialStock
                    ? prisma.depot.findFirst({
                        where: {
                            id: Number(data.initialDepotId),
                            businessId,
                            isActive: true
                        }
                    })
                    : Promise.resolve(null)
            ]);

            if (!business) return { message: 'Negocio no encontrado', status: 404, data: null };
            if (!category) return { message: 'Categoría inválida', status: 404, data: null };
            if (!unit) return { message: 'Unidad inválida', status: 404, data: null };
            if (!tax) return { message: 'Impuesto inválido', status: 404, data: null };
            if (existingSku) return { message: `SKU "${data.sku}" ya existe`, status: 400, data: null };
            if (hasInitialStock && !initialDepot) {
                return { message: 'Depósito inicial inválido o no pertenece al negocio', status: 404, data: null };
            }

            // Variable mutable para el costo final
            let finalCostPrice = data.costPrice;

            // =================================================================
            // FASE 1.5: LÓGICA DE RECETAS (COMPOSITE)
            // =================================================================
            if (data.type === ProductType.COMPOSITE) {

                if (!data.components || data.components.length === 0) {
                    return { message: 'Un producto compuesto debe tener ingredientes.', status: 400, data: null };
                }

                // 1. Eliminar duplicados de IDs enviados para evitar errores
                const uniqueComponentIds = [...new Set(data.components.map(c => c.childProductId))];

                if (uniqueComponentIds.length !== data.components.length) {
                    return { message: 'No puedes repetir el mismo ingrediente dos veces.', status: 400, data: null };
                }

                // 2. Buscar ingredientes y sus COSTOS actuales
                const ingredients = await prisma.product.findMany({
                    where: {
                        id: { in: uniqueComponentIds },
                        businessId: businessId // Seguridad de Tenant
                    },
                    select: { id: true, costPrice: true } // Necesitamos el costo
                });

                if (ingredients.length !== uniqueComponentIds.length) {
                    return { message: 'Uno o más ingredientes no existen o no son válidos.', status: 400, data: null };
                }

                // 3. CALCULO AUTOMÁTICO DE COSTO (La Magia)
                // Costo Padre = Suma(Costo Hijo * Cantidad Receta)
                let calculatedCost = 0;

                for (const comp of data.components) {
                    const ingredient = ingredients.find(i => i.id === comp.childProductId);
                    if (ingredient) {
                        // Convertimos a Number para calcular, asumiendo que Prisma devuelve Decimal o Number
                        const cost = Number(ingredient.costPrice);
                        const qty = Number(comp.quantity);
                        calculatedCost += (cost * qty);
                    }
                }

                // Sobreescribimos el costo que envió el usuario
                finalCostPrice = calculatedCost;
            }

            // =================================================================
            // FASE 2: CREACIÓN
            // =================================================================
            const productCreated = await prisma.$transaction(async (tx) => {
                const product = await tx.product.create({
                    data: {
                        businessId,
                        updatedById: userId,
                        name: data.name,
                        sku: data.sku || null,
                        description: data.description,
                        imageUrl: data.imageUrl || null,
                        imagePublicId: data.imagePublicId || null,
                        categoryId: data.categoryId,
                        unitId: data.unitId,
                        taxId: data.taxId,
                        type: data.type,
                        isPerishable: data.isPerishable || false,

                        // USAMOS EL COSTO CALCULADO O EL MANUAL
                        costPrice: finalCostPrice,

                        profitMargin: (() => {
                            if (data.profitMargin !== undefined && data.profitMargin !== null && !isNaN(Number(data.profitMargin))) {
                                let m = Number(data.profitMargin);
                                if (m > 1) m = m / 100;
                                return Number(Math.max(0, Math.min(9.9999, m)).toFixed(4));
                            }
                            return 0;
                        })(),
                        salePrice: data.salePrice,
                        minStock: data.minStock || 0,

                        // Creación de relaciones
                        components: data.type === ProductType.COMPOSITE && data.components
                            ? {
                                create: data.components.map(comp => ({
                                    childProductId: comp.childProductId,
                                    quantity: comp.quantity
                                }))
                            }
                            : undefined
                    },
                    include: {
                        unit: { select: { symbol: true } },
                        components: {
                            include: {
                                child: { select: { id: true, name: true } }
                            }
                        }
                    }
                });

                if (hasInitialStock) {
                    const stockLot = await tx.stockLot.create({
                        data: {
                            productId: product.id,
                            depotId: Number(data.initialDepotId),
                            quantity: initialStock,
                            expirationDate: new Date('2099-12-31'),
                            lotCost: finalCostPrice
                        }
                    });

                    await tx.stockMovement.create({
                        data: {
                            businessId,
                            depotId: Number(data.initialDepotId),
                            productId: product.id,
                            quantity: initialStock,
                            type: 'IN',
                            reason: 'Stock inicial al crear producto',
                            memberId: membershipId,
                            historicalCost: finalCostPrice,
                            stockLotId: stockLot.id
                        }
                    });

                }

                return product;

            });

            return {
                message: 'Producto creado exitosamente',
                status: 201,
                data: productCreated
            };

        } catch (error) {
            console.error('Error al crear producto:', error);
            // Tip: En desarrollo devuelve error.message, en producción un mensaje genérico
            return { message: 'Error interno al procesar la solicitud', status: 500, data: null };
        }
    }

    // 2. LISTAR TODOS
    async findAll(
        businessId: number,
        query: {
            page?: number;
            limit?: number;
            search?: string;
            categoryId?: number;
            type?: string;
            withPresentations?: string | number | boolean;
        }
    ) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const skip = (page - 1) * limit;
            const search = query.search ? String(query.search).trim() : undefined;
            const categoryId = query.categoryId ? Number(query.categoryId) : undefined;
            const type = query.type ? String(query.type) : undefined;

            const whereClause: any = { businessId, isActive: true };

            if (categoryId) whereClause.categoryId = categoryId;
            if (search) {
                whereClause.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } },
                    { presentations: { some: { name: { contains: search, mode: 'insensitive' } } } },
                    { presentations: { some: { barCode: { contains: search, mode: 'insensitive' } } } }
                ];
            }

            if (type) {
                whereClause.type = type;
            }

            const withPresentations =
                query.withPresentations === true ||
                query.withPresentations === 1 ||
                String(query.withPresentations || '').toLowerCase() === 'true' ||
                String(query.withPresentations || '') === '1';

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { id: 'desc' },
                    include: {
                        category: { select: { id: true, name: true } },
                        unit: { select: { id: true, symbol: true } },
                        presentations: { where: { isActive: true } },

                        // --- CAMBIO 1: Traemos el stock físico (para productos Simples) ---
                        stockLots: {
                            where: { quantity: { gt: 0 } },
                            select: {
                                quantity: true,
                                expirationDate: true,
                                depot: {
                                    select: {
                                        id: true,
                                        name: true
                                    }
                                }
                            }
                        },

                        // --- CAMBIO 2: Traemos la receta y el stock de los ingredientes (para Compuestos) ---
                        components: {
                            include: {
                                child: { // El producto "Ingrediente"
                                    select: {
                                        type: true,
                                        // Necesitamos sumar sus lotes para saber cuánto hay
                                        stockLots: { select: { quantity: true } }
                                    }
                                }
                            }
                        },
                        tax: {
                            select: {
                                id: true,
                                name: true,
                                rate: true,
                            }
                        }
                    }
                }),
                prisma.product.count({ where: whereClause })
            ]);

            const baseProducts = products.map(product => {
                // =========================================================
                // LÓGICA DE CÁLCULO (STOCK EN UNIDAD BASE)
                // =========================================================
                let calculatedStockBase = new Decimal(0);

                if (product.type === 'SERVICE') {
                    calculatedStockBase = new Decimal(0);
                } else if (product.type === 'SIMPLE') {
                    calculatedStockBase = product.stockLots.reduce(
                        (acc, lot) => acc.add(new Decimal(lot.quantity)),
                        new Decimal(0)
                    );
                } else if (product.type === 'COMPOSITE') {
                    if (!product.components || product.components.length === 0) {
                        calculatedStockBase = new Decimal(0);
                    } else {
                        // Ignorar servicios del cálculo físico (los servicios no limitan el stock físico)
                        const physicalComponents = product.components.filter(c => c.child?.type !== 'SERVICE');
                        if (physicalComponents.length === 0) {
                            calculatedStockBase = new Decimal(0);
                        } else {
                            const possibleQuantities = physicalComponents.map(component => {
                                const requiredQty = new Decimal(component.quantity);
                                if (requiredQty.isZero() || requiredQty.isNegative()) return new Decimal(0);

                                const ingredientTotalStock = component.child.stockLots.reduce(
                                    (acc, lot) => acc.add(new Decimal(lot.quantity)),
                                    new Decimal(0)
                                );

                                return ingredientTotalStock.div(requiredQty).floor();
                            });

                            calculatedStockBase = possibleQuantities.length > 0
                                ? possibleQuantities.reduce((min, current) => (current.lessThan(min) ? current : min))
                                : new Decimal(0);
                        }
                    }
                }

                const baseItem = {
                    ...product,
                    typeName: this.getProductTypeName(product.type),
                    stockLots: undefined,
                    components: undefined,
                    currentStock: calculatedStockBase.toNumber(),
                    stockByDepot: this.groupStockByDepot(product.stockLots),
                    isPresentation: false,
                    baseProductId: product.id,
                    presentationId: null as number | null,
                    factor: 1
                };

                return baseItem;
            });

            const formattedProducts = withPresentations
                ? baseProducts.flatMap((baseItem: any) => {
                    const presentationItems = (baseItem.presentations || []).map((p: any) => {
                        const factor = new Decimal(p.factor || 1);
                        const currentStockPresentation = factor.lte(0)
                            ? new Decimal(0)
                            : new Decimal(baseItem.currentStock).div(factor).floor();

                        return {
                            ...baseItem,
                            name: `${baseItem.name} - ${p.name}`,
                            sku: p.barCode || baseItem.sku,
                            salePrice: new Decimal(p.price).toNumber(),
                            presentations: [
                                {
                                    ...p,
                                    price: new Decimal(p.price).toNumber(),
                                    factor: factor.toNumber()
                                }
                            ],
                            currentStock: currentStockPresentation.toNumber(),
                            stockByDepot: null,
                            isPresentation: true,
                            baseProductId: baseItem.id,
                            presentationId: p.id,
                            factor: factor.toNumber()
                        };
                    });

                    return [baseItem, ...presentationItems];
                })
                : baseProducts;



            return {
                message: 'Productos obtenidos exitosamente',
                status: 200,
                data: formattedProducts,
                meta: { total, page, lastPage: Math.ceil(total / limit), limit }
            };

        } catch (error) {
            console.error('Error al obtener los productos:', error);
            return { message: 'Error al obtener los productos', status: 500, data: null };
        }
    }

    async findOne(businessId: number, id: number) {
        try {
            const product = await prisma.product.findFirst({
                where: { id, businessId },
                include: {
                    category: { select: { id: true, name: true } },
                    unit: { select: { id: true, name: true, symbol: true } },
                    presentations: { where: { isActive: true } }, // Solo activas

                    // OJO: Solo traemos lotes con stock positivo para el frontend
                    // Así no envías 500 lotes vacíos viejos.
                    stockLots: {
                        where: { quantity: { gt: 0 } },
                        include: {
                            depot: { select: { id: true, name: true } }
                        },
                        orderBy: { expirationDate: 'asc' } // FEFO (Primero en vencer)
                    },
                    components: {
                        include: {
                            child: {
                                select: { id: true, name: true, sku: true, type: true, unit: { select: { symbol: true } }, stockLots: { select: { quantity: true } } }
                            }
                        }
                    },
                    componentOf: true, // Saber si es ingrediente de algo
                    _count: true,
                    tax: {
                        select: {
                            id: true,
                            name: true,
                            rate: true,
                        }
                    }
                }
            });

            if (!product) return { message: 'Producto no encontrado', status: 404, data: null };

            // =========================================================
            // LÓGICA DE STOCK TOTAL (Vital para el Front)
            // =========================================================
            let calculatedStock = new Decimal(0);

            if (product.type === 'SERVICE') {
                calculatedStock = new Decimal(0);
            }

            else if (product.type === 'SIMPLE') {
                // SUMA PRECIS: Usamos .add() en lugar de +
                calculatedStock = product.stockLots.reduce(
                    (acc, lot) => acc.add(new Decimal(lot.quantity)),
                    new Decimal(0)
                );
            }

            else if (product.type === 'COMPOSITE') {
                // LÓGICA DEL FACTOR LIMITANTE (Reactivo Limitante)

                if (!product.components || product.components.length === 0) {
                    calculatedStock = new Decimal(0);
                } else {
                    // Ignorar servicios del cálculo físico (los servicios no limitan el stock físico)
                    const physicalComponents = product.components.filter(c => c.child?.type !== 'SERVICE');
                    if (physicalComponents.length === 0) {
                        calculatedStock = new Decimal(0);
                    } else {
                        // Mapeamos a un array de Decimals con la cantidad posible por ingrediente
                        const possibleQuantities = physicalComponents.map(component => {
                            const requiredQty = new Decimal(component.quantity);

                            // Evitar división por cero
                            if (requiredQty.isZero() || requiredQty.isNegative()) return new Decimal(0);

                            // 1. Sumamos el stock del ingrediente (child)
                            const ingredientTotalStock = component.child.stockLots.reduce(
                                (acc, lot) => acc.add(new Decimal(lot.quantity)),
                                new Decimal(0)
                            );

                            // 2. División precisa: StockDisponible / CantidadRequerida
                            // Ej: 1000g Harina / 250g Receta = 4 Pasteles
                            // Usamos .floor() porque no podemos hacer 3.9 pasteles completos
                            return ingredientTotalStock.div(requiredQty).floor();
                        });

                        // 3. Encontrar el Mínimo (Cuello de botella)
                        // Decimal.min(...array) funciona si usas la librería directa, 
                        // pero para mayor compatibilidad con Prisma iteramos:
                        if (possibleQuantities.length > 0) {
                            calculatedStock = possibleQuantities.reduce((min, current) =>
                                current.lessThan(min) ? current : min
                            );
                        } else {
                            calculatedStock = new Decimal(0);
                        }
                    }
                }
            }

            // =========================================================
            // MAPEO (TRANSFORMACIÓN) PARA EL FRONTEND
            // =========================================================
            const sanitizedProduct = {
                id: product.id,
                name: product.name,
                sku: product.sku,
                description: product.description,
                imageUrl: product.imageUrl,
                type: product.type,
                typeName: this.getProductTypeName(product.type),
                isPerishable: product.isPerishable,

                // Conversión de Decimal a Number (JS nativo)
                salePrice: new Decimal(product.salePrice).toNumber(),
                costPrice: new Decimal(product.costPrice).toNumber(),
                profitMargin: new Decimal(product.profitMargin).toNumber(),

                minStock: product.minStock,

                // Info Calculada
                currentStock: calculatedStock.toNumber(),

                // Relaciones limpias
                category: product.category,
                unit: product.unit,

                // Presentaciones con precios convertidos
                presentations: product.presentations.map(p => ({
                    ...p,
                    price: new Decimal(p.price).toNumber(),
                    factor: new Decimal(p.factor).toNumber()
                })),

                // Componentes (Si es Receta)
                components: product.components.map(c => ({
                    // 1. IDs para lógica (Frontend necesita esto para Editar/Borrar)
                    id: c.id,                      // ID de la relación (ProductComponent)
                    childProductId: c.childProductId, // ID del Ingrediente (Para pre-seleccionar en el combo)

                    // 2. Datos para Mostrar (Tabla visual)
                    ingredientName: c.child.name,
                    sku: c.child.sku,              // Útil para que el cocinero verifique

                    // 3. Cantidades limpias (Numbers, no Strings ni Decimal objects)
                    quantity: new Decimal(c.quantity).toNumber(),

                    // 4. Unidad aplanada (Para no poner c.child.unit.symbol)
                    unitSymbol: c.child.unit.symbol,

                    // Opcional: Costo calculado al momento (si quieres mostrar cuánto cuesta esa línea)
                    // cost: new Decimal(c.child.costPrice).mul(c.quantity).toNumber()
                })),

                // NOTA: No enviamos 'stockLots' completos para no revelar costos.
                // Si necesitas mostrar desglose por almacén, crea un objeto resumido:
                stockByDepot: this.groupStockByDepot(product.stockLots),

                // Impuesto del producto
                tax: product.tax
            };

            return { message: 'Producto encontrado', status: 200, data: sanitizedProduct };

        } catch (error) {
            console.error('Error al obtener el producto:', error);
            return { message: 'Error interno', status: 500, data: null };
        }
    }

    // Helper para agrupar stock visualmente sin dar costos
    private groupStockByDepot(lots: any[]): DepotInterface[] {
        // 1. Usamos un Map para garantizar unicidad por ID de depósito y acceso rápido
        const depotMap = new Map<number, DepotInterface>();

        lots.forEach(lot => {
            // Asumo que 'lot.depot' tiene 'id' y 'name'
            const { id: depotId, name: depotName } = lot.depot;

            // 2. Si el depósito no existe en el mapa, lo inicializamos
            if (!depotMap.has(depotId)) {
                depotMap.set(depotId, {
                    depotId: depotId,
                    name: depotName,
                    stockLots: [] // Inicializamos el array vacío
                });
            }

            // 3. Mapeamos el lote crudo a tu interfaz StockLotInterface
            const stockLot: StockLotInterface = {
                quantity: new Decimal(lot.quantity).toNumber(),
                expirationDate: new Date(lot.expirationDate), // Aseguramos que sea objeto Date
                lotCost: new Decimal(lot.cost || 0).toNumber() // Asumiendo que 'cost' viene en el lote
            };

            // 4. Agregamos el lote al depósito correspondiente
            // El uso de '!' es seguro aquí porque acabamos de garantizar que existe en el paso 2
            depotMap.get(depotId)!.stockLots!.push(stockLot);
        });

        // 5. Convertimos los valores del mapa a un array limpio
        return Array.from(depotMap.values());
    }

    // 4. ACTUALIZAR
    async update(businessId: number, userId: number, membershipId: number | undefined, id: number, data: UpdateProductInterface) {
        try {
            console.log('Iniciando actualización de producto:', { businessId, userId, id, data });
            // 1. Verificar existencia
            const existingProduct = await prisma.product.findFirst({ where: { id, businessId } });
            if (!existingProduct) return { message: 'Producto no encontrado', status: 404, data: null };

            // 2. Separamos los 'components' y las flags de revalorización del resto de la data
            // para tratarlos por separado (no son campos del Product)
            const { components, revalueLots, confirmProductName, ...rest } = data;

            // Revalorización general: requiere confirmar escribiendo el nombre exacto del producto
            const revalue = revalueLots === true;
            if (revalue && confirmProductName?.trim() !== existingProduct.name) {
                throw new BusinessError('El nombre escrito no coincide con el producto. Revalorización cancelada.', 400);
            }

            // =================================================================
            // FASE DE VALIDACIONES (Igual que antes)
            // =================================================================
            const validations = [];

            if (rest.categoryId && rest.categoryId !== existingProduct.categoryId) {

                validations.push(prisma.category.findFirst({ where: { id: rest.categoryId, businessId } })
                    .then(cat => { if (!cat) throw new BusinessError('Categoría inválida', 400); }));
            }

            if (rest.unitId && rest.unitId !== existingProduct.unitId) {
                validations.push(prisma.measurementUnit.findUnique({ where: { id: rest.unitId } })
                    .then(u => { if (!u) throw new BusinessError('Unidad de medida inválida', 400); }));
            }

            if (rest.sku && rest.sku !== existingProduct.sku) {
                validations.push(prisma.product.findFirst({ where: { sku: rest.sku, businessId, NOT: { id } } })
                    .then(prod => { if (prod) throw new BusinessError(`El SKU ${rest.sku} ya está en uso`, 400); }));
            }

            // Validación Extra: Si envían componentes, verificar que existan (Igual que en create)
            if (rest.type === ProductType.COMPOSITE && components && components.length > 0) {
                const ingredientIds = components.map(c => c.childProductId);
                validations.push(prisma.product.count({ where: { id: { in: ingredientIds }, businessId } })
                    .then(count => { if (count !== ingredientIds.length) throw new BusinessError('Ingredientes inválidos', 400); }));
            }

            if (validations.length > 0) {
                try {
                    await Promise.all(validations);
                } catch (validationError: any) {
                    return { message: validationError.message, status: 400, data: null };
                }
            }

            // =================================================================
            // FASE DE ACTUALIZACIÓN (La Lógica Senior)
            // =================================================================

            let newCostPrice = new Decimal(rest.costPrice || existingProduct.costPrice);
            let componentsUpdateLogic: any = undefined;

            // CASO A: Es (o se volvió) un Producto COMPUESTO y enviaron receta nueva
            if ((rest.type === ProductType.COMPOSITE || existingProduct.type === ProductType.COMPOSITE) && components) {

                // 1. Buscamos los costos REALES de los ingredientes en la BD
                const ingredientIds = components.map(c => c.childProductId);

                const dbIngredients = await prisma.product.findMany({
                    where: { id: { in: ingredientIds }, businessId },
                    select: { id: true, costPrice: true } // Solo necesitamos esto
                });

                // 2. Calculamos el nuevo costo total usando Decimal
                let calculatedRecipeCost = new Decimal(0);

                for (const comp of components) {

                    const dbItem = dbIngredients.find(i => i.id === comp.childProductId);

                    if (dbItem) {

                        const cost = new Decimal(dbItem.costPrice);
                        const qty = new Decimal(comp.quantity);

                        // Sumar: Costo * Cantidad
                        calculatedRecipeCost = calculatedRecipeCost.add(cost.mul(qty));
                    }
                }

                // 3. Asignamos el costo calculado para guardarlo
                newCostPrice = calculatedRecipeCost;

                // 4. Preparamos lógica de Prisma para reemplazar ingredientes
                componentsUpdateLogic = {
                    deleteMany: {}, // Borrar viejos
                    create: components.map(c => ({ // Crear nuevos
                        childProductId: c.childProductId,
                        quantity: c.quantity // Prisma acepta Decimal o number aquí
                    }))
                };
            }
            // CASO B: Cambió de COMPOSITE a SIMPLE
            else if (rest.type === ProductType.SIMPLE && existingProduct.type === ProductType.COMPOSITE) {
                // El costo es el que digite el usuario manualmente (rest.costPrice)
                // Borramos la receta
                componentsUpdateLogic = { deleteMany: {} };
            }

            // =================================================================
            // FASE DE PRECIO DE VENTA (AUTOMATIZACIÓN) 📈
            // =================================================================
            // Si el costo cambió, ¿Debemos actualizar el precio de venta?
            // Generalmente SÍ, para mantener el margen de ganancia.

            // Normalizar y blindar margen de ganancia si vino en la petición
            if (rest.profitMargin !== undefined && rest.profitMargin !== null && !isNaN(Number(rest.profitMargin))) {
                let m = Number(rest.profitMargin);
                if (m > 1) m = m / 100;
                rest.profitMargin = Number(Math.max(0, Math.min(9.9999, m)).toFixed(4));
            }

            let newSalePrice = rest.salePrice; // Por defecto mantenemos el que envían o el que estaba

            // Si no enviaron precio manual, recalculamos basado en el margen actual
            if (!rest.salePrice) {
                const margin = rest.profitMargin || existingProduct.profitMargin;
                // Usamos tu utilidad blindada con Decimal
                newSalePrice = calculatePriceWithMarkup(margin, newCostPrice);
            }

            // =================================================================
            // FASE DE PERSISTENCIA
            // =================================================================
            const wantsToUpdateImage =
                Object.prototype.hasOwnProperty.call(rest, 'imageUrl') ||
                Object.prototype.hasOwnProperty.call(rest, 'imagePublicId');

            const oldImageUrl = existingProduct.imageUrl || null;
            const oldImagePublicId = existingProduct.imagePublicId || null;

            const persist = async (client: Prisma.TransactionClient) => {
                const updated = await client.product.update({
                    where: { id },
                    data: {
                        ...rest,
                        businessId,
                        updatedById: userId,

                        // Valores Financieros Calculados
                        costPrice: newCostPrice,
                        salePrice: newSalePrice,

                        // Relaciones
                        components: componentsUpdateLogic
                    },
                    include: {
                        category: true,
                        unit: true,
                        components: {
                            include: {
                                child: { select: { id: true, name: true, unit: { select: { symbol: true } } } }
                            }
                        }
                    }
                });

                // REVALORIZACIÓN GENERAL: actualiza TODOS los lotes al nuevo costo
                // y registra un movimiento por lote en el kardex (sin mover stock).
                if (revalue) {
                    const lots = await client.stockLot.findMany({
                        where: { productId: id, quantity: { gt: 0 } }
                    });

                    for (const lot of lots) {
                        await client.stockLot.update({
                            where: { id: lot.id },
                            data: { lotCost: newCostPrice }
                        });

                        if (membershipId) {
                            await client.stockMovement.create({
                                data: {
                                    businessId,
                                    productId: id,
                                    memberId: membershipId,
                                    depotId: lot.depotId,
                                    type: 'REVALUATION',
                                    quantity: 0,
                                    historicalCost: newCostPrice,
                                    reason: `Revalorización de costo: ${Number(existingProduct.costPrice)} → ${Number(newCostPrice)}`,
                                    date: new Date(),
                                    stockLotId: lot.id
                                }
                            });
                        }
                    }
                }

                return updated;
            };

            const updatedProduct = revalue
                ? await prisma.$transaction((tx) => persist(tx))
                : await persist(prisma);

            // =================================================================
            // FASE DE LIMPIEZA CLOUDINARY (NO BLOQUEANTE) 🧹
            // =================================================================
            if (wantsToUpdateImage) {
                const newImageUrl = updatedProduct.imageUrl || null;
                const newImagePublicId = updatedProduct.imagePublicId || null;

                const imageChanged = oldImageUrl !== newImageUrl;

                if (imageChanged && oldImageUrl) {
                    const cfg = this.getCloudinaryConfig();

                    // Solo borramos si Cloudinary está configurado y la imagen anterior
                    // pertenece a este cloud.
                    if (cfg && oldImageUrl.includes(`res.cloudinary.com/${cfg.cloudName}/`)) {
                        const publicIdToDelete =
                            oldImagePublicId || this.extractCloudinaryPublicIdFromUrl(oldImageUrl, cfg.cloudName);

                        if (publicIdToDelete && publicIdToDelete !== newImagePublicId) {
                            this.deleteCloudinaryAssetIfPossible(publicIdToDelete)
                                .catch((e) => console.error('Cloudinary delete failed:', e));
                        }
                    }
                }
            }

            // =================================================================
            // FASE DE RECURSIVIDAD (EFECTO DOMINÓ) 🎲
            // =================================================================
            // Si este producto (ej: Salsa) cambió de precio, y es usado en otros (ej: Pizza),
            // debemos actualizar a los padres.
            const oldCost = new Decimal(existingProduct.costPrice);

            // Solo disparamos la recursividad si hubo un cambio real de dinero (> 0.001)
            if (oldCost.sub(newCostPrice).abs().gt(new Decimal(0.001))) {
                // Ejecutamos en segundo plano (sin await) para no bloquear la respuesta al usuario
                updateRecursiveRecipeCosts(prisma, id).catch(e => console.error(e));
            }

            return {
                message: 'Producto actualizado exitosamente',
                status: 200,
                data: updatedProduct
            };

        } catch (error) {
            if (error instanceof BusinessError) {
                return { message: error.message, status: error.status, data: null };
            }

            console.error('Error al actualizar:', error);
            return { message: 'Error interno al actualizar', status: 500, data: null };
        }
    }

    // 5. ELIMINAR INTELIGENTE (Híbrido)
    async remove(businessId: number, id: number) {
        try {
            // 1. Buscar el producto con sus conteos y su Stock actual
            const product = await prisma.product.findFirst({
                where: { id, businessId },
                include: {
                    _count: {
                        select: {
                            saleItems: true,
                            purchaseItems: true,
                            stockMovements: true,
                            stockLots: true // Lotes (pueden estar en 0)
                        }
                    },
                    // Traemos los lotes para ver si tienen cantidad > 0
                    stockLots: {
                        where: { quantity: { gt: 0 } }, // Solo los que tienen stock real
                        select: { id: true }
                    }
                }
            });

            if (!product) {
                return { message: 'Producto no encontrado', status: 404, data: null };
            }

            // 2. REGLA DE ORO: No tocar si hay stock físico
            if (product.stockLots.length > 0) {
                return {
                    message: 'No puedes eliminar ni archivar un producto con existencia física. Ajusta el inventario a 0 primero.',
                    status: 409, // Conflict
                    data: null
                };
            }

            // 3. Evaluar Historial para decidir el destino
            const hasHistory =
                product._count.saleItems > 0 ||
                product._count.purchaseItems > 0 ||
                product._count.stockMovements > 0;

            if (hasHistory) {
                // === ESCENARIO A: SOFT DELETE (Archivar) ===
                // Tiene historia, no podemos borrarlo, lo ocultamos.

                // Si ya estaba archivado, avisamos
                if (!product.isActive) {
                    return { message: 'El producto ya se encuentra archivado', status: 400, data: null };
                }

                const archivedProduct = await prisma.product.update({
                    where: { id },
                    data: { isActive: false }
                });

                return {
                    message: 'Producto archivado correctamente (Se mantiene el historial contable)',
                    status: 200,
                    data: archivedProduct
                };

            } else {
                // === ESCENARIO B: HARD DELETE (Borrado Físico) ===
                // Es un producto "fantasma" o error de dedo. Limpiamos la BD.

                // Usamos transacción para borrar sus hijos (Presentations) y luego al padre
                await prisma.$transaction(async (tx) => {
                    // 1. Borrar presentaciones asociadas
                    await tx.productPresentation.deleteMany({
                        where: { productId: id }
                    });

                    // 2. Borrar lotes vacíos (si existen y están en 0)
                    await tx.stockLot.deleteMany({
                        where: { productId: id }
                    });

                    // 3. Borrar el producto
                    await tx.product.delete({
                        where: { id }
                    });
                });

                return {
                    message: 'Producto eliminado permanentemente (Sin historial previo)',
                    status: 200,
                    data: null
                };
            }

        } catch (error) {
            console.error('Error al eliminar producto:', error);
            return { message: 'Error interno al procesar la eliminación', status: 500, data: null };
        }
    }

    // 8. IMPORTACIÓN MASIVA POR LOTES (EXCEL / CSV)
    async batchImport(businessId: number, userId: number, membershipId: number, dto: BatchImportDTO) {
        try {
            if (!dto.products || !Array.isArray(dto.products) || dto.products.length === 0) {
                return {
                    status: 400,
                    message: 'No se enviaron productos para importar',
                    data: null
                };
            }

            const [business, taxes, units, depots, existingCategories] = await Promise.all([
                prisma.business.findUnique({ where: { id: businessId } }),
                prisma.tax.findMany({ where: { isActive: true } }),
                prisma.measurementUnit.findMany({ where: { isActive: true } }),
                prisma.depot.findMany({ where: { businessId, isActive: true } }),
                prisma.category.findMany({ where: { businessId, isActive: true } })
            ]);

            if (!business) {
                return { status: 404, message: 'Negocio no encontrado', data: null };
            }

            // Impuesto por defecto (preferir 16% o el primero disponible)
            const defaultTax = taxes.find(t => Number(t.rate) === 0.16) || taxes[0];
            if (!defaultTax) {
                return { status: 400, message: 'No hay impuestos configurados en el sistema', data: null };
            }

            // Unidad por defecto (preferir "und" o "unidad" o la primera disponible)
            const defaultUnit = units.find(u => 
                u.symbol.toLowerCase() === 'und' || 
                u.name.toLowerCase().includes('unidad')
            ) || units[0];

            if (!defaultUnit) {
                return { status: 400, message: 'No hay unidades de medida configuradas en el sistema', data: null };
            }

            // Depósito por defecto
            let defaultDepot = depots.find(d => d.id === dto.defaultDepotId) || depots[0] || null;

            // Mapa de categorías para resolución rápida
            const categoryMap = new Map<string, number>();
            existingCategories.forEach(c => categoryMap.set(c.name.trim().toLowerCase(), c.id));

            // Mapa de unidades por símbolo y por nombre
            const unitMap = new Map<string, number>();
            units.forEach(u => {
                unitMap.set(u.symbol.trim().toLowerCase(), u.id);
                unitMap.set(u.name.trim().toLowerCase(), u.id);
            });

            // Mapa de depósitos por nombre
            const depotNameMap = new Map<string, number>();
            depots.forEach(d => depotNameMap.set(d.name.trim().toLowerCase(), d.id));

            // Mapa de productos existentes por SKU y por Nombre para actualizar si ya existen
            const existingProducts = await prisma.product.findMany({
                where: { businessId },
                select: {
                    id: true,
                    sku: true,
                    name: true,
                    costPrice: true,
                    salePrice: true,
                    profitMargin: true,
                    categoryId: true,
                    unitId: true,
                    minStock: true
                }
            });
            const skuMap = new Map<string, any>();
            const nameMap = new Map<string, any>();
            existingProducts.forEach(p => {
                if (p.sku) skuMap.set(p.sku.trim().toLowerCase(), p);
                if (p.name) nameMap.set(p.name.trim().toLowerCase(), p);
            });

            let createdCount = 0;
            let updatedCount = 0;
            const errors: { row: number; name?: string; error: string }[] = [];

            // Procesamos fila a fila dentro de una transacción o por batches seguros
            await prisma.$transaction(async (tx) => {
                for (let i = 0; i < dto.products.length; i++) {
                    const rowNum = i + 1;
                    const item = dto.products[i];

                    const rawSku = item.sku ? String(item.sku).trim() : '';
                    const rawName = item.name ? String(item.name).trim() : '';
                    const skuKey = rawSku ? rawSku.toLowerCase() : null;
                    const nameKey = rawName ? rawName.toLowerCase() : null;

                    // Buscar producto existente por SKU o por Nombre
                    const existingProduct = (skuKey ? skuMap.get(skuKey) : null) || (nameKey ? nameMap.get(nameKey) : null);

                    // Si no existe y no tiene nombre, no se puede crear
                    if (!existingProduct && !rawName) {
                        errors.push({
                            row: rowNum,
                            name: rawSku || `Fila ${rowNum}`,
                            error: `Artículo con código "${rawSku || '-'}" no existe en Guardián para actualizar precio (requiere nombre para registrarse como nuevo).`
                        });
                        continue;
                    }

                    // Resolver o crear categoría (solo si vino en el archivo o si es creación nueva)
                    let categoryId: number | undefined = undefined;
                    if (item.categoryName && String(item.categoryName).trim()) {
                        const catKey = String(item.categoryName).trim().toLowerCase();
                        if (categoryMap.has(catKey)) {
                            categoryId = categoryMap.get(catKey)!;
                        } else {
                            const newCat = await tx.category.create({
                                data: {
                                    businessId,
                                    name: String(item.categoryName).trim(),
                                    description: 'Creada por importación de Excel'
                                }
                            });
                            categoryId = newCat.id;
                            categoryMap.set(catKey, newCat.id);
                        }
                    } else if (!existingProduct) {
                        categoryId = dto.defaultCategoryId || (existingCategories.length > 0 ? existingCategories[0].id : undefined);
                        if (!categoryId) {
                            const generalCat = await tx.category.create({
                                data: {
                                    businessId,
                                    name: 'General',
                                    description: 'Categoría general creada automáticamente'
                                }
                            });
                            categoryId = generalCat.id;
                            categoryMap.set('general', generalCat.id);
                        }
                    }

                    // Resolver unidad (solo si vino en el archivo o si es creación nueva)
                    let unitId: number | undefined = undefined;
                    if (item.unitSymbolOrName && String(item.unitSymbolOrName).trim()) {
                        const unitKey = String(item.unitSymbolOrName).trim().toLowerCase();
                        if (unitMap.has(unitKey)) {
                            unitId = unitMap.get(unitKey)!;
                        }
                    } else if (!existingProduct) {
                        unitId = defaultUnit.id;
                    }

                    // Precios
                    const hasSalePrice = item.salePrice !== undefined && item.salePrice !== null && !isNaN(Number(item.salePrice)) && Number(item.salePrice) > 0;
                    const hasCostPrice = item.costPrice !== undefined && item.costPrice !== null && !isNaN(Number(item.costPrice)) && Number(item.costPrice) > 0;

                    const initialStock = Math.max(0, Math.floor(Number(item.stockInitial) || 0));
                    const sku = rawSku || null;

                    // Resolver depósito si hay stock inicial
                    let targetDepotId: number | null = null;
                    if (initialStock > 0) {
                        if (item.depotNameOrId) {
                            if (typeof item.depotNameOrId === 'number' && depots.some(d => d.id === item.depotNameOrId)) {
                                targetDepotId = item.depotNameOrId;
                            } else if (typeof item.depotNameOrId === 'string' && depotNameMap.has(item.depotNameOrId.trim().toLowerCase())) {
                                targetDepotId = depotNameMap.get(item.depotNameOrId.trim().toLowerCase())!;
                            }
                        }
                        if (!targetDepotId && defaultDepot) {
                            targetDepotId = defaultDepot.id;
                        }
                    }

                    const costPrice = hasCostPrice ? Number(item.costPrice) : (existingProduct ? Number(existingProduct.costPrice || 0) : 0);
                    const salePrice = hasSalePrice ? Number(item.salePrice) : (existingProduct ? Number(existingProduct.salePrice || 0) : 0);

                    let productId: number;

                    if (existingProduct) {
                        const existingId = existingProduct.id;
                        const updateData: any = {
                            updatedById: userId,
                            isActive: true
                        };

                        // Actualizar nombre solo si vino explícito
                        if (rawName) updateData.name = rawName;
                        if (item.description && String(item.description).trim()) updateData.description = String(item.description).trim();
                        if (categoryId) updateData.categoryId = categoryId;
                        if (unitId) updateData.unitId = unitId;

                        if (hasSalePrice) updateData.salePrice = salePrice;
                        if (hasCostPrice) updateData.costPrice = costPrice;

                        if (item.profitMargin !== undefined && item.profitMargin !== null && !isNaN(Number(item.profitMargin)) && Number(item.profitMargin) > 0) {
                            let margin = Number(item.profitMargin);
                            if (margin > 1) margin = margin / 100;
                            updateData.profitMargin = Number(Math.max(0, Math.min(9.9999, margin)).toFixed(4));
                        } else if (hasSalePrice || hasCostPrice) {
                            if (costPrice > 0 && salePrice > costPrice) {
                                const margin = (salePrice - costPrice) / costPrice;
                                updateData.profitMargin = Number(Math.max(0, Math.min(9.9999, margin)).toFixed(4));
                            } else {
                                updateData.profitMargin = 0;
                            }
                        }

                        if (item.minStock !== undefined && item.minStock !== null && !isNaN(Number(item.minStock)) && Number(item.minStock) > 0) {
                            updateData.minStock = Math.floor(Number(item.minStock));
                        }

                        await tx.product.update({
                            where: { id: existingId },
                            data: updateData
                        });

                        // Actualizar en memoria para filas siguientes
                        if (hasSalePrice) existingProduct.salePrice = salePrice;
                        if (hasCostPrice) existingProduct.costPrice = costPrice;

                        productId = existingId;
                        updatedCount++;
                    } else {
                        // Crear nuevo producto
                        let safeProfitMargin = 0;
                        if (item.profitMargin !== undefined && item.profitMargin !== null && !isNaN(Number(item.profitMargin)) && Number(item.profitMargin) > 0) {
                            let margin = Number(item.profitMargin);
                            if (margin > 1) margin = margin / 100;
                            safeProfitMargin = Number(Math.max(0, Math.min(9.9999, margin)).toFixed(4));
                        } else if (costPrice > 0 && salePrice > costPrice) {
                            const margin = (salePrice - costPrice) / costPrice;
                            safeProfitMargin = Number(Math.max(0, Math.min(9.9999, margin)).toFixed(4));
                        }
                        const minStock = Math.max(0, Math.floor(Number(item.minStock) || 0));

                        const newProduct = await tx.product.create({
                            data: {
                                businessId,
                                updatedById: userId,
                                name: rawName,
                                sku,
                                description: item.description || '',
                                categoryId: categoryId!,
                                unitId: unitId!,
                                taxId: defaultTax.id,
                                type: item.type || ProductType.SIMPLE,
                                isPerishable: item.isPerishable || false,
                                costPrice,
                                profitMargin: safeProfitMargin,
                                salePrice,
                                minStock
                            }
                        });
                        productId = newProduct.id;
                        if (skuKey) skuMap.set(skuKey, newProduct);
                        if (nameKey) nameMap.set(nameKey, newProduct);
                        createdCount++;
                    }

                    // Registrar stock inicial si aplica
                    if (initialStock > 0 && targetDepotId) {
                        const stockLot = await tx.stockLot.create({
                            data: {
                                productId,
                                depotId: targetDepotId,
                                quantity: initialStock,
                                expirationDate: new Date('2099-12-31'),
                                lotCost: costPrice
                            }
                        });

                        await tx.stockMovement.create({
                            data: {
                                businessId,
                                depotId: targetDepotId,
                                productId,
                                quantity: initialStock,
                                type: 'IN',
                                reason: 'Stock inicial por importación de Excel',
                                memberId: membershipId,
                                historicalCost: costPrice,
                                stockLotId: stockLot.id
                            }
                        });
                    }
                }
            }, {
                maxWait: 15000,
                timeout: 60000
            });

            return {
                status: 200,
                message: `Importación completada: ${createdCount} creados, ${updatedCount} actualizados.`,
                data: {
                    createdCount,
                    updatedCount,
                    totalProcessed: dto.products.length,
                    errors
                }
            };
        } catch (error: any) {
            console.error('Error en batchImport:', error);
            return {
                status: 500,
                message: error?.message || 'Error al procesar la importación por lotes',
                data: null
            };
        }
    }
}