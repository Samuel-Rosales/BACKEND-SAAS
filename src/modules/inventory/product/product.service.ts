import { prisma } from '@/configs';
import { CreateProductInterface, UpdateProductInterface } from './interfaces';

export class ProductService {

    // 1. CREAR
    async create(businessId: number, userId: number, data: CreateProductInterface) {
        try {
            
            // Verificar que el negocio existe
            const business = await prisma.business.findUnique({
                where: { id: businessId }
            });

            if (!business) {
                return {
                    message: 'Negocio no encontrado',
                    status: 404,
                    data: null
                };
            }

            // Verificar que la categoría existe y pertenece al negocio
            const category = await prisma.category.findFirst({
                where: { 
                    id: data.categoryId,
                    businessId: businessId
                }
            });

            if (!category) {
                return {
                    message: 'Categoría no encontrada o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const product = await prisma.product.create({
                data: {
                    businessId: businessId,
                    categoryId: data.categoryId,
                    name: data.name,
                    sku: data.sku,
                    description: data.description,
                    imageUrl: data.imageUrl,
                    costPrice: data.costPrice,
                    salePrice: data.salePrice,
                    minStock: data.minStock || 0,
                    isService: data.isService || false,
                    isPerishable: data.isPerishable || false,
                    updatedById: userId
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!product) {
                return {
                    message: 'No se pudo crear el producto',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Producto creado exitosamente',
                status: 201,
                data: product
            };

        } catch (error) {

            console.error('Error al crear el producto:', error);

            return {
                message: 'Error al crear el producto',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const products = await prisma.product.findMany({
                where: { businessId },
                orderBy: { id: 'desc' },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (products.length === 0) {
                return {
                    message: 'No hay productos disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Productos obtenidos exitosamente',
                status: 200,
                data: products
            };

        } catch (error) {

            console.error('Error al obtener los productos:', error);

            return {
                message: 'Error al obtener los productos',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const product = await prisma.product.findFirst({
                where: { 
                    id,
                    businessId // Seguridad: solo si pertenece al negocio
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    },
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!product) {
                return {
                    message: 'Producto no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Producto obtenido exitosamente',
                status: 200,
                data: product
            };

         } catch (error) {

            console.error('Error al obtener el producto:', error);

            return {
                message: 'Error al obtener el producto',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, userId: number, id: number, data: UpdateProductInterface) {

        try {

            // Verificar que el producto pertenece al negocio
            const existingProduct = await prisma.product.findFirst({
                where: { id, businessId }
            });

            if (!existingProduct) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Si se actualiza la categoría, verificar que pertenece al negocio
            if (data.categoryId) {
                const category = await prisma.category.findFirst({
                    where: { 
                        id: data.categoryId,
                        businessId: businessId
                    }
                });

                if (!category) {
                    return {
                        message: 'Categoría no encontrada o no pertenece a este negocio',
                        status: 404,
                        data: null
                    };
                }
            }

            const updatedProduct = await prisma.product.update({
                where: { id },
                data: {
                    ...data,
                    updatedById: userId
                },
                include: {
                    category: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!updatedProduct) {
                return {
                    message: 'No se pudo actualizar el producto',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Producto actualizado exitosamente',
                status: 200,
                data: updatedProduct
            };

        } catch (error) {

            console.error('Error al actualizar el producto:', error);
            
            return {
                message: 'Error al actualizar el producto',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR (Con protección de integridad)
    async remove(businessId: number, id: number) {
        try {

            const product = await prisma.product.findFirst({
                where: { id, businessId },
                include: {
                    _count: {
                        select: {
                            stockGenerals: true,
                            stockLots: true,
                            saleItems: true,
                            purchaseItems: true,
                            stockMovements: true
                        }
                    }
                }
            });
            
            if (!product) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay registros asociados
            const totalRecords = 
                product._count.stockGenerals + 
                product._count.stockLots + 
                product._count.saleItems + 
                product._count.purchaseItems + 
                product._count.stockMovements;
            
            if (totalRecords > 0) {
                return {
                    message: `No se puede eliminar el producto porque tiene ${totalRecords} registro(s) de inventario/ventas asociado(s)`,
                    status: 400,
                    data: null
                };
            }

            await prisma.product.delete({
                where: { id }
            });

            return {
                message: 'Producto eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el producto:', error);

            return {
                message: 'Error al eliminar el producto',
                status: 500,
                data: null
            };
        }
    }
}
