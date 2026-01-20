import { prisma } from '@/configs';
import { CreateProductInterface, UpdateProductInterface } from './interfaces';

export class ProductService {

    // 1. CREAR
    async create(businessId: number, userId: number, data: CreateProductInterface) {
        try {
            // =================================================================
            // FASE 1: VALIDACIONES PARALELAS (Optimización)
            // =================================================================
            const [business, category, unit, existingSku] = await Promise.all([
                // 1. Negocio
                prisma.business.findUnique({ where: { id: businessId } }),

                // 2. Categoría (Debe ser mía)
                prisma.category.findFirst({
                    where: { id: data.categoryId, businessId }
                }),

                // 3. Unidad de Medida (Es global, no tiene businessId)
                prisma.measurementUnit.findUnique({
                    where: { id: data.unitId }
                }),

                // 4. SKU Único (Opcional)
                data.sku
                    ? prisma.product.findFirst({ where: { sku: data.sku, businessId } })
                    : Promise.resolve(null)
            ]);

            // --- Chequeos ---
            if (!business) return { message: 'Negocio no encontrado', status: 404, data: null };
            if (!category) return { message: 'Categoría inválida o no pertenece a tu negocio', status: 404, data: null };
            if (!unit) return { message: 'Unidad de medida no encontrada', status: 404, data: null };
            if (existingSku) return { message: `El SKU "${data.sku}" ya está en uso`, status: 400, data: null };

            // =================================================================
            // FASE 2: CREACIÓN
            // =================================================================
            const product = await prisma.product.create({
                data: {
                    businessId,
                    categoryId: data.categoryId,
                    unitId: data.unitId, // <--- NUEVO CAMPO OBLIGATORIO
                    name: data.name,
                    sku: data.sku || null,
                    description: data.description,
                    imageUrl: data.imageUrl || null,
                    costPrice: data.costPrice,
                    salePrice: data.salePrice, // <--- NUEVO (IVA)
                    minStock: data.minStock || 0,
                    isService: data.isService || false,
                    isPerishable: data.isPerishable || false,
                    updatedById: userId
                },
                include: {
                    category: { select: { id: true, name: true } },
                    unit: { select: { id: true, name: true, symbol: true } }, // <--- INCLUIMOS UNIDAD
                    business: { select: { id: true, name: true } }
                }
            });

            return {
                message: 'Producto creado exitosamente',
                status: 201,
                data: product
            };

        } catch (error) {
            console.error('Error al crear el producto:', error);
            return { message: 'Error interno al crear el producto', status: 500, data: null };
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
            const existingProduct = await prisma.product.findFirst({ where: { id, businessId } });
            if (!existingProduct) return { message: 'Producto no encontrado', status: 404, data: null };

            const validations = [];

            // A. Cambio de Categoría
            if (data.categoryId && data.categoryId !== existingProduct.categoryId) {
                validations.push(
                    prisma.category.findFirst({ where: { id: data.categoryId, businessId } })
                        .then(cat => { if (!cat) throw new Error('Categoría inválida'); })
                );
            }

            // B. Cambio de Unidad
            if (data.unitId && data.unitId !== existingProduct.unitId) {
                validations.push(
                    prisma.measurementUnit.findUnique({ where: { id: data.unitId } })
                        .then(u => { if (!u) throw new Error('Unidad de medida inválida'); })
                );
            }

            // C. Cambio de SKU
            if (data.sku && data.sku !== existingProduct.sku) {
                validations.push(
                    prisma.product.findFirst({
                        where: { sku: data.sku, businessId, NOT: { id } }
                    }).then(prod => { if (prod) throw new Error(`El SKU ${data.sku} ya está en uso`); })
                );
            }

            if (validations.length > 0) {
                try {
                    await Promise.all(validations);
                } catch (validationError: any) {
                    return { message: validationError.message, status: 400, data: null };
                }
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    ...data,
                    updatedById: userId
                },
                include: {
                    category: { select: { id: true, name: true } },
                    unit: { select: { id: true, symbol: true } }
                }
            });

            return {
                message: 'Producto actualizado exitosamente',
                status: 200,
                data: updatedProduct
            };

        } catch (error) {
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