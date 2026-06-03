import { prisma } from '@/configs';
import { CreateOrderInterface, UpdateOrderInterface } from './interfaces';

export class OrderService {

    async create(businessId: number, data: CreateOrderInterface) {
        try {
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

            if (data.tableId) {
                const table = await prisma.restaurantTable.findFirst({
                    where: { id: data.tableId, businessId, isActive: true }
                });

                if (!table) {
                    return {
                        message: 'Mesa no encontrada o no pertenece a este negocio',
                        status: 404,
                        data: null
                    };
                }
            }

            const client = await prisma.client.findFirst({
                where: { id: data.clientId, businessId }
            });

            if (!client) {
                return {
                    message: 'Cliente no encontrado',
                    status: 404,
                    data: null
                };
            }

            if (!data.items || data.items.length === 0) {
                return {
                    message: 'El pedido debe tener al menos un item',
                    status: 400,
                    data: null
                };
            }

            const products = await prisma.product.findMany({
                where: {
                    id: { in: data.items.map(item => item.productId) },
                    businessId,
                    isActive: true
                }
            });

            if (products.length !== data.items.length) {
                return {
                    message: 'Uno o más productos no existen o no son válidos',
                    status: 400,
                    data: null
                };
            }

            const productMap = new Map(products.map(p => [p.id, p]));

            let subTotal = 0;
            const itemsData = data.items.map(item => {
                const product = productMap.get(item.productId);
                if (!product) throw new Error('Producto inválido');

                const itemSubTotal = item.quantity * item.unitPrice;
                subTotal += itemSubTotal;

                return {
                    productId: item.productId,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                    subTotal: itemSubTotal,
                    notes: item.notes || null
                };
            });

            const taxAmount = 0;
            const totalAmount = subTotal + taxAmount;

            const lastOrder = await prisma.order.findFirst({
                where: { businessId },
                orderBy: { id: 'desc' },
                select: { orderNumber: true }
            });

            const orderNumber = (lastOrder?.orderNumber || 0) + 1;

            const order = await prisma.order.create({
                data: {
                    businessId,
                    tableId: data.tableId || null,
                    clientId: data.clientId,
                    orderNumber,
                    notes: data.notes || null,
                    subTotal,
                    taxAmount,
                    totalAmount,
                    items: {
                        create: itemsData
                    }
                },
                include: {
                    table: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            if (data.tableId) {
                await prisma.restaurantTable.update({
                    where: { id: data.tableId },
                    data: { status: 'OCCUPIED' }
                });
            }

            return {
                message: 'Pedido creado exitosamente',
                status: 201,
                data: order
            };

        } catch (error) {
            console.error('Error al crear el pedido:', error);
            return {
                message: 'Error al crear el pedido',
                status: 500,
                data: null
            };
        }
    }

    async findAll(businessId: number, query?: { status?: string; tableId?: number }) {
        try {
            const whereClause: any = { businessId };

            if (query?.status) {
                whereClause.status = query.status;
            }

            if (query?.tableId) {
                whereClause.tableId = query.tableId;
            }

            const orders = await prisma.order.findMany({
                where: whereClause,
                orderBy: { createdAt: 'desc' },
                include: {
                    table: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            return {
                message: 'Pedidos obtenidos exitosamente',
                status: 200,
                data: orders
            };

        } catch (error) {
            console.error('Error al obtener los pedidos:', error);
            return {
                message: 'Error al obtener los pedidos',
                status: 500,
                data: null
            };
        }
    }

    async findOne(businessId: number, id: number) {
        try {
            const order = await prisma.order.findFirst({
                where: {
                    id,
                    businessId
                },
                include: {
                    table: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            if (!order) {
                return {
                    message: 'Pedido no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Pedido obtenido exitosamente',
                status: 200,
                data: order
            };

        } catch (error) {
            console.error('Error al obtener el pedido:', error);
            return {
                message: 'Error al obtener el pedido',
                status: 500,
                data: null
            };
        }
    }

    async updateStatus(businessId: number, id: number, data: UpdateOrderInterface) {
        try {
            const existingOrder = await prisma.order.findFirst({
                where: { id, businessId }
            });

            if (!existingOrder) {
                return {
                    message: 'Pedido no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            const updateData: any = {};

            if (data.status) {
                updateData.status = data.status;

                if (data.status === 'DELIVERED' || data.status === 'CANCELLED') {
                    updateData.completedAt = new Date();

                    if (existingOrder.tableId) {
                        await prisma.restaurantTable.update({
                            where: { id: existingOrder.tableId },
                            data: { status: 'AVAILABLE' }
                        });
                    }
                }
            }

            if (data.notes !== undefined) {
                updateData.notes = data.notes;
            }

            const updatedOrder = await prisma.order.update({
                where: { id },
                data: updateData,
                include: {
                    table: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            return {
                message: 'Pedido actualizado exitosamente',
                status: 200,
                data: updatedOrder
            };

        } catch (error) {
            console.error('Error al actualizar el pedido:', error);
            return {
                message: 'Error al actualizar el pedido',
                status: 500,
                data: null
            };
        }
    }

    async markAsPaid(businessId: number, id: number) {
        try {
            const order = await prisma.order.findFirst({
                where: { id, businessId }
            });

            if (!order) {
                return {
                    message: 'Pedido no encontrado',
                    status: 404,
                    data: null
                };
            }

            if (order.isPaid) {
                return {
                    message: 'Este pedido ya está pagado',
                    status: 400,
                    data: null
                };
            }

            if (order.status === 'DELIVERED' || order.status === 'CANCELLED') {
                return {
                    message: 'No se puede pagar un pedido que ya ha sido entregado o cancelado',
                    status: 400,
                    data: null
                };
            }

            const updatedOrder = await prisma.order.update({
                where: { id },
                data: { isPaid: true },
                include: {
                    table: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            return {
                message: 'Pedido marcado como pagado',
                status: 200,
                data: updatedOrder
            };

        } catch (error) {
            console.error('Error al marcar el pedido como pagado:', error);
            return {
                message: 'Error al marcar el pedido como pagado',
                status: 500,
                data: null
            };
        }
    }

    async cancel(businessId: number, id: number) {
        try {
            const order = await prisma.order.findFirst({
                where: { id, businessId }
            });

            if (!order) {
                return {
                    message: 'Pedido no encontrado',
                    status: 404,
                    data: null
                };
            }

            if (order.isPaid) {
                return {
                    message: 'No se puede cancelar un pedido que ya ha sido pagado',
                    status: 400,
                    data: null
                };
            }

            if (order.status === 'DELIVERED') {
                return {
                    message: 'No se puede cancelar un pedido que ya ha sido entregado',
                    status: 400,
                    data: null
                };
            }

            if (order.status === 'CANCELLED') {
                return {
                    message: 'Este pedido ya está cancelado',
                    status: 400,
                    data: null
                };
            }

            const updatedOrder = await prisma.order.update({
                where: { id },
                data: {
                    status: 'CANCELLED',
                    completedAt: new Date()
                },
                include: {
                    table: { select: { id: true, name: true } },
                    client: { select: { id: true, name: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                }
            });

            if (order.tableId) {
                await prisma.restaurantTable.update({
                    where: { id: order.tableId },
                    data: { status: 'AVAILABLE' }
                });
            }

            return {
                message: 'Pedido cancelado exitosamente',
                status: 200,
                data: updatedOrder
            };

        } catch (error) {
            console.error('Error al cancelar el pedido:', error);
            return {
                message: 'Error al cancelar el pedido',
                status: 500,
                data: null
            };
        }
    }

    async remove(businessId: number, id: number) {
        try {
            const order = await prisma.order.findFirst({
                where: { id, businessId },
                include: { items: true }
            });

            if (!order) {
                return {
                    message: 'Pedido no encontrado',
                    status: 404,
                    data: null
                };
            }

            if (order.status !== 'PENDING') {
                return {
                    message: 'Solo se pueden eliminar pedidos pendientes',
                    status: 400,
                    data: null
                };
            }

            if (order.isPaid) {
                return {
                    message: 'No se pueden eliminar pedidos pagados',
                    status: 400,
                    data: null
                };
            }

            await prisma.orderItem.deleteMany({
                where: { orderId: id }
            });

            await prisma.order.delete({
                where: { id }
            });

            if (order.tableId) {
                await prisma.restaurantTable.update({
                    where: { id: order.tableId },
                    data: { status: 'AVAILABLE' }
                });
            }

            return {
                message: 'Pedido eliminado correctamente',
                status: 200,
                data: null
            };

        } catch (error) {
            console.error('Error al eliminar el pedido:', error);
            return {
                message: 'Error interno al procesar la eliminación',
                status: 500,
                data: null
            };
        }
    }
}