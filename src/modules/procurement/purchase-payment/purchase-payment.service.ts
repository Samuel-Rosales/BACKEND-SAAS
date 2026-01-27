import { prisma } from '@/configs';
import { CreatePurchasePaymentInterface, UpdatePurchasePaymentInterface } from './interfaces';

export class PurchasePaymentService {

    // 1. CREAR
    async create(businessId: number, data: CreatePurchasePaymentInterface) {
        try {
            
            // Validaciones paralelas
            const [purchase, paymentMethod, exchangeRate] = await Promise.all([
                prisma.purchase.findUnique({
                    where: { id: data.purchaseId },
                    select: { id: true, businessId: true }
                }),
                prisma.paymentMethod.findUnique({
                    where: { id: data.paymentMethodId },
                    select: { id: true, isActive: true }
                }),
                prisma.exchangeRate.findUnique({
                    where: { id: data.exchangeRateId, isActive: true },
                    select: { id: true }
                })
            ]);

            // Validar que la compra existe
            if (!purchase) {
                return {
                    message: 'La compra no existe',
                    status: 404,
                    data: null
                };
            }

            // Validar que la compra pertenece al negocio
            if (purchase.businessId !== businessId) {
                return {
                    message: 'La compra no pertenece a este negocio',
                    status: 403,
                    data: null
                };
            }

            // Validar método de pago
            if (!paymentMethod) {
                return {
                    message: 'El método de pago no existe',
                    status: 404,
                    data: null
                };
            }

            if (!paymentMethod.isActive) {
                return {
                    message: 'El método de pago está inactivo',
                    status: 400,
                    data: null
                };
            }

            // Validar tasa de cambio
            if (!exchangeRate) {
                return {
                    message: 'La tasa de cambio no existe',
                    status: 404,
                    data: null
                };
            }

            // Validar moneda
            if (data.currency !== 'USD' && data.currency !== 'VES') {
                return {
                    message: 'La moneda debe ser USD o VES',
                    status: 400,
                    data: null
                };
            }

            // Validar monto
            if (data.amount <= 0) {
                return {
                    message: 'El monto debe ser mayor a cero',
                    status: 400,
                    data: null
                };
            }

            // Crear el pago
            const purchasePayment = await prisma.purchasePayment.create({
                data: {
                    purchaseId: data.purchaseId,
                    paymentMethodId: data.paymentMethodId,
                    amount: data.amount,
                    exchangeRateId: data.exchangeRateId,
                    reference: data.reference || "N/A"
                },
                include: {
                    paymentMethod: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            rate: true,
                            //currency: true,
                            createdAt: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true
                        }
                    }
                }
            });

            return {
                message: 'Pago de compra creado exitosamente',
                status: 201,
                data: purchasePayment
            };

        } catch (error) {
            console.error('Error al crear el pago de compra:', error);
            
            return {
                message: 'Error al crear el pago de compra',
                status: 500,
                data: null
            };
        }
    }

    // 2. LISTAR TODOS (Por negocio y opcionalmente por compra)
    async findAll(businessId: number, purchaseId?: number) {
        try {
            
            const whereClause: any = {
                purchase: {
                    businessId: businessId
                }
            };

            // Si se proporciona purchaseId, filtrar por compra
            if (purchaseId) {
                whereClause.purchaseId = purchaseId;
            }

            const purchasePayments = await prisma.purchasePayment.findMany({
                where: whereClause,
                include: {
                    paymentMethod: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            rate: true,
                            //currency: true,
                            createdAt: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: {
                    paymentDate: 'desc'
                }
            });

            if (purchasePayments.length === 0) {
                return {
                    message: 'No hay pagos de compra registrados',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Pagos de compra obtenidos exitosamente',
                status: 200,
                data: purchasePayments
            };

        } catch (error) {
            console.error('Error al obtener los pagos de compra:', error);
            
            return {
                message: 'Error al obtener los pagos de compra',
                status: 500,
                data: null
            };
        }
    }

    // 3. OBTENER UNO
    async findOne(businessId: number, id: number) {
        try {
            
            const purchasePayment = await prisma.purchasePayment.findFirst({
                where: {
                    id: id,
                    purchase: {
                        businessId: businessId
                    }
                },
                include: {
                    paymentMethod: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            rate: true,
                            //currency: true,
                            createdAt: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true,
                            createdAt: true,
                            supplier: {
                                select: {
                                    id: true,
                                    nameCompany: true
                                }
                            }
                        }
                    }
                }
            });

            if (!purchasePayment) {
                return {
                    message: 'Pago de compra no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Pago de compra obtenido exitosamente',
                status: 200,
                data: purchasePayment
            };

        } catch (error) {
            console.error('Error al obtener el pago de compra:', error);
            
            return {
                message: 'Error al obtener el pago de compra',
                status: 500,
                data: null
            };
        }
    }

    // 4. ACTUALIZAR
    async update(businessId: number, id: number, data: UpdatePurchasePaymentInterface) {
        try {
            
            // Verificar que el pago existe y pertenece al negocio
            const existing = await prisma.purchasePayment.findFirst({
                where: {
                    id: id,
                    purchase: {
                        businessId: businessId
                    }
                },
                select: {
                    id: true,
                    purchaseId: true
                }
            });

            if (!existing) {
                return {
                    message: 'Pago de compra no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Validaciones opcionales si se proporcionan
            if (data.paymentMethodId) {
                const paymentMethod = await prisma.paymentMethod.findUnique({
                    where: { id: data.paymentMethodId },
                    select: { id: true, isActive: true }
                });

                if (!paymentMethod) {
                    return {
                        message: 'El método de pago no existe',
                        status: 404,
                        data: null
                    };
                }

                if (!paymentMethod.isActive) {
                    return {
                        message: 'El método de pago está inactivo',
                        status: 400,
                        data: null
                    };
                }
            }

            if (data.exchangeRateId) {
                const exchangeRate = await prisma.exchangeRate.findUnique({
                    where: { id: data.exchangeRateId },
                    select: { id: true }
                });

                if (!exchangeRate) {
                    return {
                        message: 'La tasa de cambio no existe',
                        status: 404,
                        data: null
                    };
                }
            }

            if (data.currency && data.currency !== 'USD' && data.currency !== 'VES') {
                return {
                    message: 'La moneda debe ser USD o VES',
                    status: 400,
                    data: null
                };
            }

            if (data.amount !== undefined && data.amount <= 0) {
                return {
                    message: 'El monto debe ser mayor a cero',
                    status: 400,
                    data: null
                };
            }

            // Actualizar
            const updatedPayment = await prisma.purchasePayment.update({
                where: { id: id },
                data: data,
                include: {
                    paymentMethod: {
                        select: {
                            id: true,
                            name: true,
                            type: true
                        }
                    },
                    exchangeRate: {
                        select: {
                            id: true,
                            rate: true,
                            //currency: true,
                            createdAt: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            totalCost: true,
                            reference: true
                        }
                    }
                }
            });

            return {
                message: 'Pago de compra actualizado exitosamente',
                status: 200,
                data: updatedPayment
            };

        } catch (error) {
            console.error('Error al actualizar el pago de compra:', error);
            
            return {
                message: 'Error al actualizar el pago de compra',
                status: 500,
                data: null
            };
        }
    }

    // 5. ELIMINAR
    async remove(businessId: number, id: number) {
        try {
            
            // Verificar que el pago existe y pertenece al negocio
            const purchasePayment = await prisma.purchasePayment.findFirst({
                where: {
                    id: id,
                    purchase: {
                        businessId: businessId
                    }
                },
                select: {
                    id: true
                }
            });

            if (!purchasePayment) {
                return {
                    message: 'Pago de compra no encontrado o no pertenece a este negocio',
                    status: 404,
                    data: null
                };
            }

            // Eliminar
            await prisma.purchasePayment.delete({
                where: { id: id }
            });

            return {
                message: 'Pago de compra eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {
            console.error('Error al eliminar el pago de compra:', error);
            
            return {
                message: 'Error al eliminar el pago de compra',
                status: 500,
                data: null
            };
        }
    }
}
