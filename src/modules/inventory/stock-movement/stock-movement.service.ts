import { prisma } from '@/configs';
import { CreateStockMovementInterface, UpdateStockMovementInterface } from './interfaces';

export class StockMovementService {

    // 1. CREAR
    async create(businessId: number, data: CreateStockMovementInterface) {
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

            // Verificar que el miembro existe y pertenece al negocio
            const member = await prisma.businessMember.findFirst({
                where: { 
                    id: data.memberId,
                    businessId: businessId,
                    isActive: true
                }
            });

            if (!member) {
                return {
                    message: 'Miembro no encontrado, no pertenece a este negocio o está inactivo',
                    status: 404,
                    data: null
                };
            }

            // Verificar que el producto no sea un servicio (excepto para ajustes)
            if (product.isService && data.type !== 'ADJUSTMENT') {
                return {
                    message: 'No se puede gestionar movimientos de stock para productos que son servicios',
                    status: 400,
                    data: null
                };
            }

            // Validar que la cantidad sea positiva para entradas y negativa para salidas
            if (data.type === 'IN' && data.quantity <= 0) {
                return {
                    message: 'La cantidad debe ser positiva para movimientos de entrada',
                    status: 400,
                    data: null
                };
            }

            if (data.type === 'OUT' && data.quantity >= 0) {
                return {
                    message: 'La cantidad debe ser negativa para movimientos de salida',
                    status: 400,
                    data: null
                };
            }

            // Crear el movimiento
            const stockMovement = await prisma.stockMovement.create({
                data: {
                    businessId: businessId,
                    productId: data.productId,
                    memberId: data.memberId,
                    depotId: data.depotId,
                    type: data.type,
                    quantity: data.quantity,
                    reason: data.reason,
                    date: data.date || new Date()
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
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!stockMovement) {
                return {
                    message: 'No se pudo crear el movimiento de stock',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Movimiento de stock creado exitosamente',
                status: 201,
                data: stockMovement
            };

        } catch (error) {

            console.error('Error al crear el movimiento de stock:', error);

            return {
                message: 'Error al crear el movimiento de stock',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODOS (de un negocio)
    async findAll(businessId: number) {
        try {

            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId
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
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            if (stockMovements.length === 0) {
                return {
                    message: 'No hay movimientos de stock disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

        } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNO
    async findOne(businessId: number, id: number) {
        try {
            const stockMovement = await prisma.stockMovement.findFirst({
                where: { 
                    id,
                    businessId: businessId
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
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!stockMovement) {
                return {
                    message: 'Movimiento de stock no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Movimiento de stock obtenido exitosamente',
                status: 200,
                data: stockMovement
            };

         } catch (error) {

            console.error('Error al obtener el movimiento de stock:', error);

            return {
                message: 'Error al obtener el movimiento de stock',
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

            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId,
                    productId: productId
                },
                include: {
                    depot: {
                        select: {
                            id: true,
                            name: true,
                            location: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

         } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 5. LISTAR POR DEPÓSITO
    async findByDepot(businessId: number, depotId: number) {
        try {
            // Verificar que el depósito pertenece al negocio
            const depot = await prisma.depot.findFirst({
                where: { 
                    id: depotId,
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

            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId,
                    depotId: depotId
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true
                        }
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

         } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 6. LISTAR POR TIPO
    async findByType(businessId: number, type: string) {
        try {
            const stockMovements = await prisma.stockMovement.findMany({
                where: {
                    businessId: businessId,
                    type: type as any
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
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                },
                orderBy: {
                    date: 'desc'
                }
            });

            if (stockMovements.length === 0) {
                return {
                    message: 'No hay movimientos de stock de este tipo',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Movimientos de stock obtenidos exitosamente',
                status: 200,
                data: stockMovements
            };

         } catch (error) {

            console.error('Error al obtener los movimientos de stock:', error);

            return {
                message: 'Error al obtener los movimientos de stock',
                status: 500,
                data: null
            };
        }
    }

    // 7. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdateStockMovementInterface) {

        try {

            // Verificar que el movimiento pertenece al negocio
            const existingMovement = await prisma.stockMovement.findFirst({
                where: { 
                    id,
                    businessId: businessId
                }
            });

            if (!existingMovement) {
                return {
                    message: 'Movimiento de stock no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Validar cantidad según el tipo
            if (data.quantity !== undefined) {
                if (existingMovement.type === 'IN' && data.quantity <= 0) {
                    return {
                        message: 'La cantidad debe ser positiva para movimientos de entrada',
                        status: 400,
                        data: null
                    };
                }

                if (existingMovement.type === 'OUT' && data.quantity >= 0) {
                    return {
                        message: 'La cantidad debe ser negativa para movimientos de salida',
                        status: 400,
                        data: null
                    };
                }
            }

            const updatedStockMovement = await prisma.stockMovement.update({
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
                    },
                    member: {
                        select: {
                            id: true,
                            user: {
                                select: {
                                    id: true,
                                    name: true
                                }
                            }
                        }
                    }
                }
            });

            if (!updatedStockMovement) {
                return {
                    message: 'No se pudo actualizar el movimiento de stock',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Movimiento de stock actualizado exitosamente',
                status: 200,
                data: updatedStockMovement
            };

        } catch (error) {

            console.error('Error al actualizar el movimiento de stock:', error);
            
            return {
                message: 'Error al actualizar el movimiento de stock',
                status: 500,
                data: null
            };
        }
    }

    // 8. ELIMINAR
    async remove(businessId: number, id: number) {
        try {

            const stockMovement = await prisma.stockMovement.findFirst({
                where: { 
                    id,
                    businessId: businessId
                }
            });
            
            if (!stockMovement) {
                return {
                    message: 'Movimiento de stock no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            await prisma.stockMovement.delete({
                where: { id }
            });

            return {
                message: 'Movimiento de stock eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar el movimiento de stock:', error);

            return {
                message: 'Error al eliminar el movimiento de stock',
                status: 500,
                data: null
            };
        }
    }
}
