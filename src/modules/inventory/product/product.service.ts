import { prisma } from '@/configs';
import { CreateProductInterface, UpdateProductInterface } from './interfaces';
import { ProductType } from '@prisma/client';
import { BusinessError } from '@/utils';

export class ProductService {

    // 1. CREAR (Soporta Recetas y Combos)
    async create(businessId: number, userId: number, data: CreateProductInterface) {
        try {
            // =================================================================
            // FASE 1: VALIDACIONES BÁSICAS
            // =================================================================
            const [business, category, unit, tax, existingSku] = await Promise.all([
                prisma.business.findUnique({ where: { id: businessId } }),
                prisma.category.findFirst({ where: { id: data.categoryId, businessId } }),
                prisma.measurementUnit.findUnique({ where: { id: data.unitId } }),
                prisma.tax.findUnique({ where: { id: data.taxId } }),
                data.sku
                    ? prisma.product.findFirst({ where: { sku: data.sku, businessId } })
                    : Promise.resolve(null)
            ]);

            if (!business) return { message: 'Negocio no encontrado', status: 404, data: null };
            if (!category) return { message: 'Categoría inválida', status: 404, data: null };
            if (!unit) return { message: 'Unidad inválida', status: 404, data: null };
            if (!tax) return { message: 'Impuesto inválido', status: 404, data: null };
            if (existingSku) return { message: `SKU "${data.sku}" ya existe`, status: 400, data: null };

            // =================================================================
            // FASE 1.5: VALIDACIÓN DE RECETA (Si es COMPOSITE)
            // =================================================================
            if (data.type === ProductType.COMPOSITE) {
                if (!data.components || data.components.length === 0) {
                    return { message: 'Un producto compuesto (Receta/Combo) debe tener ingredientes.', status: 400, data: null };
                }

                // Verificar que los ingredientes existan y sean del mismo negocio
                const ingredientIds = data.components.map(c => c.childProductId);
                const countIngredients = await prisma.product.count({
                    where: {
                        id: { in: ingredientIds },
                        businessId: businessId // Seguridad: Que no use productos de otro negocio
                    }
                });

                if (countIngredients !== ingredientIds.length) {
                    return { message: 'Uno o más ingredientes no existen o no pertenecen a tu negocio.', status: 400, data: null };
                }
            }

            // =================================================================
            // FASE 2: CREACIÓN TRANSACCIONAL
            // =================================================================
            // Prisma permite crear el Padre y sus relaciones (Hijos) en una sola query.
            
            const product = await prisma.product.create({
                data: {
                    businessId,
                    updatedById: userId,
                    
                    // Datos Básicos
                    name: data.name,
                    sku: data.sku || null,
                    description: data.description,
                    imageUrl: data.imageUrl || null,
                    
                    // Relaciones
                    categoryId: data.categoryId,
                    unitId: data.unitId,
                    taxId: data.taxId,

                    // --- EL CORAZÓN DEL CAMBIO ---
                    type: data.type, // Enum: SIMPLE, COMPOSITE, SERVICE
                    isPerishable: data.isPerishable || false, // Ya no existe isService

                    // Finanzas
                    costPrice: data.costPrice,
                    profitMargin: data.profitMargin,
                    salePrice: data.salePrice,
                    minStock: data.minStock || 0,
                    
                    // Si es COMPOSITE, creamos la "Receta" aquí mismo
                    components: data.type === ProductType.COMPOSITE && data.components 
                        ? {
                            create: data.components.map(comp => ({
                                childProductId: comp.childProductId,
                                quantity: comp.quantity // Ej: 0.200 (200 gramos)
                            }))
                          }
                        : undefined
                },
                include: {
                    unit: { select: { symbol: true } },
                    // Devolvemos los componentes creados para confirmar al frontend
                    components: {
                        include: {
                            child: { select: { id: true, name: true, unit: { select: { symbol: true } } } }
                        }
                    }
                }
            });

            return {
                message: 'Producto creado exitosamente',
                status: 201,
                data: product
            };

        } catch (error) {
            console.error('Error al crear producto:', error);
            return { message: 'Error interno', status: 500, data: null };
        }
    }

    // 2. LISTAR TODOS
    async findAll(businessId: number, query: { page?: number, limit?: number, search?: string, categoryId?: number }) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const skip = (page - 1) * limit;
            const search = query.search ? String(query.search).trim() : undefined;
            const categoryId = query.categoryId ? Number(query.categoryId) : undefined;

            const whereClause: any = { businessId };

            if (categoryId) {
                whereClause.categoryId = categoryId;
            }

            if (search) {
                whereClause.OR = [
                    { name: { contains: search, mode: 'insensitive' } },
                    { sku: { contains: search, mode: 'insensitive' } }
                ];
            }

            const [products, total] = await Promise.all([
                prisma.product.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { id: 'desc' },
                    include: {
                        category: { select: { id: true, name: true } },
                        unit: { select: { id: true, symbol: true } }, // <--- ÚTIL PARA EL FRONTEND
                        presentations: true, // <--- Include presentations
                        // Opcional: Traer stock total sumado de los lotes
                        stockLots: { select: { quantity: true } }
                    }
                }),
                prisma.product.count({ where: whereClause })
            ]);

            const formattedProducts = products.map(product => {
                // 1. Calculamos la suma
                const totalStock = product.stockLots.reduce((acc, lot) => acc + lot.quantity, 0);

                // 2. Retornamos un nuevo objeto limpio (sin el array stockLots si no es necesario)
                return {
                    ...product,
                    stockLots: undefined, // Opcional: Eliminamos la lista de lotes para no ensuciar el payload
                    currentStock: totalStock // Agregamos la propiedad calculada
                };
            });

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

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const product = await prisma.product.findFirst({
                where: { id, businessId },
                include: {
                    category: { select: { id: true, name: true } },
                    unit: { select: { id: true, name: true, symbol: true } },
                    presentations: true,
                    stockLots: { 
                        include: { 
                            depot: { 
                                select: { 
                                    id: true, 
                                    name: true 
                                }
                            } 
                        } 
                    },
                    components: {
                        include: {
                            child: { // Traer datos del ingrediente (Hijo)
                                select: { 
                                    id: true, 
                                    name: true, 
                                    sku: true,
                                    unit: { select: { symbol: true } }
                                }
                            }
                        }
                    },
                    componentOf: {
                        include: {
                            parent: { select: { id: true, name: true } }
                        }
                    },
                    _count: {
                        select: {
                            stockLots: true,
                            saleItems: true,
                            purchaseItems: true,
                            stockMovements: true
                        }
                    }
                }
            });

            if (!product) return { message: 'Producto no encontrado', status: 404, data: null };

            // Calculamos el stock total sumado de los lotes
            const totalStock = product.stockLots.reduce((acc, lot) => acc + lot.quantity, 0);
            const productWithStock = {
                ...product,
                currentStock: totalStock
            };

            return { message: 'Producto encontrado', status: 200, data: productWithStock };

        } catch (error) {
            console.error('Error al obtener el producto:', error);
            return { message: 'Error interno', status: 500, data: null };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, userId: number, id: number, data: UpdateProductInterface) {
        try {
            // 1. Verificar existencia
            const existingProduct = await prisma.product.findFirst({ where: { id, businessId } });
            if (!existingProduct) return { message: 'Producto no encontrado', status: 404, data: null };

            // 2. Separamos los 'components' del resto de la data para tratarlos especial
            // 'rest' contiene nombre, precio, sku, etc.
            const { components, ...rest } = data;

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
            
            // Preparamos el objeto de manejo de componentes para Prisma
            let componentsUpdateLogic: any = undefined;

            // CASO 1: Si me envían una nueva lista de componentes (están editando la receta)
            if (components && rest.type === ProductType.COMPOSITE) {
                componentsUpdateLogic = {
                    deleteMany: {}, // 1. Borramos los ingredientes viejos
                    create: components.map(c => ({ // 2. Creamos los nuevos
                        childProductId: c.childProductId,
                        quantity: c.quantity
                    }))
                };
            } 
            // CASO 2: Si el producto ERA Composite y ahora lo cambian a SIMPLE
            else if (rest.type === ProductType.SIMPLE && existingProduct.type === ProductType.COMPOSITE) {
                componentsUpdateLogic = {
                    deleteMany: {} // Borramos la receta porque ya no es un plato
                };
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    ...rest, // Actualiza nombre, precio, sku, type, etc.
                    updatedById: userId,
                    
                    // Aquí inyectamos la lógica calculada arriba
                    components: componentsUpdateLogic
                },
                include: {
                    category: { select: { id: true, name: true } },
                    unit: { select: { id: true, symbol: true } },
                    // Devolvemos la receta actualizada para que el frontend actualice la tabla
                    components: {
                        include: {
                            child: { select: { id: true, name: true, unit: { select: { symbol: true } } } }
                        }
                    }
                }
            });

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

    // 5. ELIMINAR
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
}