import { prisma } from '@/configs';
import { CreateStockLotInterface, UpdateStockLotInterface } from './interfaces';

export class StockLotService {

    // 1. CREAR
    async create(businessId: number, data: CreateStockLotInterface) {
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
                    businessId: businessId,
                    isActive: true
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
                    message: 'No se puede gestionar lotes de productos que son servicios',
                    status: 400,
                    data: null
                };
            }

            const stockLot = await prisma.stockLot.create({
                data: {
                    productId: data.productId,
                    depotId: data.depotId,
                    quantity: data.quantity,
                    expirationDate: data.expirationDate,
                    lotCost: data.lotCost
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

            if (!stockLot) {
                return {
                    message: 'No se pudo crear el lote',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Lote creado exitosamente',
                status: 201,
                data: stockLot
            };

        } catch (error) {

            console.error('Error al crear el lote:', error);

            return {
                message: 'Error al crear el lote',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const stockLots = await prisma.stockLot.findMany({
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
                },
                orderBy: [
                    { expirationDate: 'asc' }, // Los que vencen primero
                    { createdAt: 'asc' } // FIFO
                ]
            });

            if (stockLots.length === 0) {
                return {
                    message: 'No hay lotes disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Lotes obtenidos exitosamente',
                status: 200,
                data: stockLots
            };

        } catch (error) {

            console.error('Error al obtener los lotes:', error);

            return {
                message: 'Error al obtener los lotes',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const stockLot = await prisma.stockLot.findFirst({
                where: { 
                    id,
                    product: {
                        businessId: businessId
                    }
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

            if (!stockLot) {
                return {
                    message: 'Lote no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Lote obtenido exitosamente',
                status: 200,
                data: stockLot
            };

         } catch (error) {

            console.error('Error al obtener el lote:', error);

            return {
                message: 'Error al obtener el lote',
                status: 500,
                data: null
            };
        }
    }

    // 4. LISTAR POR PRODUCTO
    async findByProduct(businessId: number, productId: number) {
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

            const stockLots = await prisma.stockLot.findMany({
                where: {
                    productId: productId
                },
                include: {
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    }
                },
                orderBy: [
                    { expirationDate: 'asc' },
                    { createdAt: 'asc' }
                ]
            });

            return {
                message: 'Lotes obtenidos exitosamente',
                status: 200,
                data: stockLots
            };

         } catch (error) {

            console.error('Error al obtener los lotes:', error);

            return {
                message: 'Error al obtener los lotes',
                status: 500,
                data: null
            };
        }
    }

    // 5. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateStockLotInterface) {

        try {

            // Verificar que el lote pertenece a un producto del negocio
            const existingLot = await prisma.stockLot.findFirst({
                where: { 
                    id,
                    product: {
                        businessId: businessId
                    }
                }
            });

            if (!existingLot) {
                return {
                    message: 'Lote no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updatedStockLot = await prisma.stockLot.update({
                where: { id },
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

            if (!updatedStockLot) {
                return {
                    message: 'No se pudo actualizar el lote',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Lote actualizado exitosamente',
                status: 200,
                data: updatedStockLot
            };

        } catch (error) {

            console.error('Error al actualizar el lote:', error);
            
            return {
                message: 'Error al actualizar el lote',
                status: 500,
                data: null
            };
        }
    }

    // 6. ELIMINAR
    async remove(businessId: number, id: number) {
        try {

            const stockLot = await prisma.stockLot.findFirst({
                where: { 
                    id,
                    product: {
                        businessId: businessId
                    }
                },
                include: {
                    _count: {
                        select: {
                            saleItemLots: true
                        }
                    }
                }
            });
            
            if (!stockLot) {
                return {
                    message: 'Lote no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Verificar si hay ventas asociadas
            if (stockLot._count.saleItemLots > 0) {
                return {
                    message: `No se puede eliminar el lote porque tiene ${stockLot._count.saleItemLots} venta(s) asociada(s)`,
                    status: 400,
                    data: null
                };
            }

            await prisma.stockLot.delete({
                where: { id }
            });

            return {
                message: 'Lote eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el lote:', error);

            return {
                message: 'Error al eliminar el lote',
                status: 500,
                data: null
            };
        }
    }
}
