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
                    salePrice: data.salePrice,
                    taxRate: data.taxRate || 0, // <--- NUEVO (IVA)
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
    async findAll(businessId: number, query: { page?: number, limit?: number, search?: string }) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const skip = (page - 1) * limit;
            const search = query.search ? String(query.search).trim() : undefined;

            const whereClause: any = { businessId };

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
                        // stockLots: { select: { quantity: true } } 
                    }
                }),
                prisma.product.count({ where: whereClause })
            ]);

            return {
                message: 'Productos obtenidos exitosamente',
                status: 200,
                data: products,
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
                    presentations: true, // <--- NUEVO: Mostrar cajas/bultos disponibles
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

            return { message: 'Producto encontrado', status: 200, data: product };

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
    async remove(businessId: number, id: number) {
        try {
            const product = await prisma.product.findFirst({
                where: { id, businessId },
                include: {
                    _count: {
                        select: {
                            stockLots: true,
                            saleItems: true,
                            purchaseItems: true,
                            stockMovements: true,
                            presentations: true // <--- También chequeamos si tiene presentaciones
                        }
                    }
                }
            });
            
            if (!product) return { message: 'Producto no encontrado', status: 404, data: null };

            const totalRecords = 
                product._count.stockLots + 
                product._count.saleItems + 
                product._count.purchaseItems + 
                product._count.stockMovements;
            
            if (totalRecords > 0) {
                return {
                    message: `No se puede eliminar: El producto tiene ${totalRecords} movimientos históricos.`,
                    status: 409,
                    data: null
                };
            }

            // Nota: Si tiene presentaciones (ProductPresentation), Prisma las borrará en cascada 
            // si configuraste onDelete: Cascade en el schema. Si no, tendrás que borrarlas manual.
            
            await prisma.product.delete({ where: { id } });

            return { message: 'Producto eliminado exitosamente', status: 200, data: null };

        } catch (error) {
            console.error('Error al eliminar:', error);
            return { message: 'Error interno al eliminar', status: 500, data: null };
        }
    }
}