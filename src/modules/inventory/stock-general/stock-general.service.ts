import { prisma } from '@/configs';
import { CreateStockGeneralInterface, UpdateStockGeneralInterface } from './interfaces';

export class StockGeneralService {

    // 1. CREAR O ACTUALIZAR (Upsert)
    async createOrUpdate(businessId: number, data: CreateStockGeneralInterface) {
        try {
            
            // Verificar que el producto existe y pertenece al negocio
            const product = await prisma.product.findFirst({
                where: { 
                    id: data.productId,
                    businessId: businessId
                }
            });

            if (!product) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar que el depósito existe y pertenece al negocio
            const depot = await prisma.depot.findFirst({
                where: { 
                    id: data.depotId,
                    businessId: businessId
                }
            });

            if (!depot) {
                return {
                    message: 'Depósito no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar que el producto no sea un servicio
            if (product.isService) {
                return {
                    message: 'No se puede gestionar stock de productos que son servicios',
                    status: 400,
                    data: null
                };
            }

            // Upsert: Si existe, actualiza; si no, crea
            const stockGeneral = await prisma.stockGeneral.upsert({
                where: {
                    productId_depotId: {
                        productId: data.productId,
                        depotId: data.depotId
                    }
                },
                update: {
                    quantity: data.quantity
                },
                create: {
                    productId: data.productId,
                    depotId: data.depotId,
                    quantity: data.quantity
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    }
                }
            });

            return {
                message: 'Stock general actualizado exitosamente',
                status: 200,
                data: stockGeneral
            };

        } catch (error) {

            console.error('Error al crear/actualizar el stock general:', error);

            return {
                message: 'Error al crear/actualizar el stock general',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const stockGenerals = await prisma.stockGeneral.findMany({
                where: {
                    product: {
                        businessId: businessId
                    }
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            minStock: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    }
                },
                orderBy: [
                    { product: { name: 'asc' } },
                    { depot: { name: 'asc' } }
                ]
            });

            if (stockGenerals.length === 0) {
                return {
                    message: 'No hay registros de stock general disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Stock general obtenido exitosamente',
                status: 200,
                data: stockGenerals
            };

        } catch (error) {

            console.error('Error al obtener el stock general:', error);

            return {
                message: 'Error al obtener el stock general',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR POR PRODUCTO Y DEPÓSITO
    async findOne(businessId: number, productId: number, depotId: number) {
        try {
            // Verificar que el producto pertenece al negocio
            const product = await prisma.product.findFirst({
                where: { 
                    id: productId,
                    businessId: businessId
                }
            });

            if (!product) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const stockGeneral = await prisma.stockGeneral.findUnique({
                where: {
                    productId_depotId: {
                        productId: productId,
                        depotId: depotId
                    }
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                            minStock: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    }
                }
            });

            if (!stockGeneral) {
                return {
                    message: 'Registro de stock general no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Stock general obtenido exitosamente',
                status: 200,
                data: stockGeneral
            };

         } catch (error) {

            console.error('Error al obtener el stock general:', error);

            return {
                message: 'Error al obtener el stock general',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR CANTIDAD
    async update(businessId: number, productId: number, depotId: number, data: UpdateStockGeneralInterface) {

        try {

            // Verificar que el producto pertenece al negocio
            const product = await prisma.product.findFirst({
                where: { 
                    id: productId,
                    businessId: businessId
                }
            });

            if (!product) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updatedStockGeneral = await prisma.stockGeneral.update({
                where: {
                    productId_depotId: {
                        productId: productId,
                        depotId: depotId
                    }
                },
                data: data,
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    depot: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!updatedStockGeneral) {
                return {
                    message: 'No se pudo actualizar el stock general',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Stock general actualizado exitosamente',
                status: 200,
                data: updatedStockGeneral
            };

        } catch (error) {

            console.error('Error al actualizar el stock general:', error);
            
            return {
                message: 'Error al actualizar el stock general',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR
    async remove(businessId: number, productId: number, depotId: number) {
        try {

            // Verificar que el producto pertenece al negocio
            const product = await prisma.product.findFirst({
                where: { 
                    id: productId,
                    businessId: businessId
                }
            });

            if (!product) {
                return {
                    message: 'Producto no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const stockGeneral = await prisma.stockGeneral.findUnique({
                where: {
                    productId_depotId: {
                        productId: productId,
                        depotId: depotId
                    }
                }
            });
            
            if (!stockGeneral) {
                return {
                    message: 'Registro de stock general no encontrado',
                    status: 404,
                    data: null
                };
            }

            await prisma.stockGeneral.delete({
                where: {
                    productId_depotId: {
                        productId: productId,
                        depotId: depotId
                    }
                }
            });

            return {
                message: 'Stock general eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el stock general:', error);

            return {
                message: 'Error al eliminar el stock general',
                status: 500,
                data: null
            };
        }
    }
}
