import { prisma } from '@/configs';
import { CreatePaymentMethodInterface, UpdatePaymentMethodInterface } from './interfaces';

export class PaymentMethodService {

    // Sembrar métodos de pago predeterminados para una tienda si no tiene ninguno registrado
    private async seedDefaultMethodsForBusiness(businessId: number) {
        try {
            const count = await prisma.paymentMethod.count({
                where: { businessId }
            });

            if (count > 0) return;

            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { enableCopCurrency: true }
            });

            const defaults: Array<{
                name: string;
                type: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'TRANSFER' | 'MOBILE_PAYMENT' | 'ZELLE' | 'OTHER';
                currency: string;
                isActive: boolean;
            }> = [
                { name: 'Efectivo Dólares ($)', type: 'CASH', currency: 'USD', isActive: true },
                { name: 'Efectivo Bolívares (Bs)', type: 'CASH', currency: 'VES', isActive: true },
                { name: 'Pago Móvil', type: 'MOBILE_PAYMENT', currency: 'VES', isActive: true },
                { name: 'Punto de Venta', type: 'DEBIT_CARD', currency: 'VES', isActive: true },
                { name: 'Zelle', type: 'ZELLE', currency: 'USD', isActive: false },
                { name: 'Transferencia Bancaria', type: 'TRANSFER', currency: 'VES', isActive: false },
                { name: 'Cashea', type: 'OTHER', currency: 'USD', isActive: false },
            ];

            if (business?.enableCopCurrency) {
                defaults.push({
                    name: 'Efectivo Pesos (COP)',
                    type: 'CASH',
                    currency: 'COP',
                    isActive: true
                });
            }

            for (const item of defaults) {
                await prisma.paymentMethod.create({
                    data: {
                        businessId,
                        name: item.name,
                        type: item.type,
                        currency: item.currency,
                        isActive: item.isActive
                    }
                }).catch(() => {
                    // Ignorar si se creó concurrentemente
                });
            }
        } catch (e) {
            console.error(`[seedDefaultMethodsForBusiness error for business ${businessId}]:`, e);
        }
    }

    // 1. CREAR
    async create(data: CreatePaymentMethodInterface, businessId?: number) {
        try {
            const targetBusinessId = businessId ?? data.businessId ?? null;
            const trimmedName = data.name.trim();

            // Verificar si ya existe un método con ese nombre en este negocio
            const existing = await prisma.paymentMethod.findFirst({
                where: {
                    businessId: targetBusinessId,
                    name: { equals: trimmedName, mode: 'insensitive' }
                }
            });

            if (existing) {
                return {
                    message: targetBusinessId
                        ? 'Ya existe un método de pago con ese nombre en esta tienda'
                        : 'Ya existe un método de pago global con ese nombre',
                    status: 400,
                    data: null
                };
            }

            const paymentMethod = await prisma.paymentMethod.create({
                data: {
                    businessId: targetBusinessId,
                    name: trimmedName,
                    currency: data.currency.trim().toUpperCase(),
                    type: data.type,
                    isActive: data.isActive !== undefined ? data.isActive : true
                }
            });

            return {
                message: 'Método de pago creado exitosamente',
                status: 201,
                data: paymentMethod
            };

        } catch (error: any) {
            console.error('Error al crear el método de pago:', error);
            return {
                message: error.message || 'Error al crear el método de pago',
                status: 500,
                data: null
            };
        }
    }

    // 2. LISTAR TODOS
    async findAll(businessId?: number) {
        try {
            if (businessId) {
                await this.seedDefaultMethodsForBusiness(businessId);

                const business = await prisma.business.findUnique({
                    where: { id: businessId },
                    select: { enableCopCurrency: true }
                });
                const enableCop = Boolean(business?.enableCopCurrency);

                const paymentMethods = await prisma.paymentMethod.findMany({
                    where: {
                        businessId: businessId,
                        ...(!enableCop ? { currency: { not: 'COP' } } : {})
                    },
                    orderBy: {
                        id: 'asc'
                    }
                });

                return {
                    message: 'Métodos de pago obtenidos exitosamente',
                    status: 200,
                    data: paymentMethods
                };
            }

            // Vista administrativa global (SuperAdmin)
            const paymentMethods = await prisma.paymentMethod.findMany({
                orderBy: {
                    name: 'asc'
                }
            });

            return {
                message: 'Métodos de pago obtenidos exitosamente',
                status: 200,
                data: paymentMethods
            };

        } catch (error: any) {
            console.error('Error al obtener los métodos de pago:', error);
            return {
                message: error.message || 'Error al obtener los métodos de pago',
                status: 500,
                data: null
            };
        }
    }

    // 3. LISTAR SOLO ACTIVOS (Usado en Punto de Venta, Cobranzas, Compras)
    async findActive(businessId?: number) {
        try {
            if (businessId) {
                await this.seedDefaultMethodsForBusiness(businessId);

                const business = await prisma.business.findUnique({
                    where: { id: businessId },
                    select: { enableCopCurrency: true }
                });
                const enableCop = Boolean(business?.enableCopCurrency);

                const paymentMethods = await prisma.paymentMethod.findMany({
                    where: {
                        businessId: businessId,
                        isActive: true,
                        ...(!enableCop ? { currency: { not: 'COP' } } : {})
                    },
                    orderBy: {
                        id: 'asc'
                    }
                });

                return {
                    message: 'Métodos de pago activos obtenidos exitosamente',
                    status: 200,
                    data: paymentMethods
                };
            }

            // Fallback global
            const paymentMethods = await prisma.paymentMethod.findMany({
                where: {
                    isActive: true
                },
                orderBy: {
                    name: 'asc'
                }
            });

            return {
                message: 'Métodos de pago activos obtenidos exitosamente',
                status: 200,
                data: paymentMethods
            };

        } catch (error: any) {
            console.error('Error al obtener los métodos de pago activos:', error);
            return {
                message: error.message || 'Error al obtener los métodos de pago activos',
                status: 500,
                data: null
            };
        }
    }

    // 4. BUSCAR UNO
    async findOne(id: number, businessId?: number) {
        try {
            const paymentMethod = await prisma.paymentMethod.findFirst({
                where: {
                    id,
                    ...(businessId ? { OR: [{ businessId }, { businessId: null }] } : {})
                }
            });

            if (!paymentMethod) {
                return {
                    message: 'Método de pago no encontrado',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Método de pago obtenido exitosamente',
                status: 200,
                data: paymentMethod
            };

        } catch (error: any) {
            console.error('Error al obtener el método de pago:', error);
            return {
                message: error.message || 'Error al obtener el método de pago',
                status: 500,
                data: null
            };
        }
    }

    // 5. ACTUALIZAR
    async update(id: number, data: UpdatePaymentMethodInterface, businessId?: number) {
        try {
            const existing = await prisma.paymentMethod.findUnique({
                where: { id }
            });

            if (!existing) {
                return {
                    message: 'Método de pago no encontrado',
                    status: 404,
                    data: null
                };
            }

            // Si se pasa businessId y el método tiene un businessId distinto, denegar
            if (businessId && existing.businessId && existing.businessId !== businessId) {
                return {
                    message: 'No tienes permiso para modificar un método de pago de otra tienda',
                    status: 403,
                    data: null
                };
            }

            // Si actualiza el nombre, verificar que no colisione dentro del mismo negocio
            if (data.name && data.name.trim() !== existing.name) {
                const trimmed = data.name.trim();
                const duplicate = await prisma.paymentMethod.findFirst({
                    where: {
                        id: { not: id },
                        businessId: existing.businessId,
                        name: { equals: trimmed, mode: 'insensitive' }
                    }
                });

                if (duplicate) {
                    return {
                        message: 'Ya existe otro método de pago con ese nombre en esta tienda',
                        status: 400,
                        data: null
                    };
                }
            }

            const updatedPaymentMethod = await prisma.paymentMethod.update({
                where: { id },
                data: {
                    ...(data.name ? { name: data.name.trim() } : {}),
                    ...(data.currency ? { currency: data.currency.trim().toUpperCase() } : {}),
                    ...(data.type ? { type: data.type } : {}),
                    ...(data.isActive !== undefined ? { isActive: data.isActive } : {})
                }
            });

            return {
                message: 'Método de pago actualizado exitosamente',
                status: 200,
                data: updatedPaymentMethod
            };

        } catch (error: any) {
            console.error('Error al actualizar el método de pago:', error);
            return {
                message: error.message || 'Error al actualizar el método de pago',
                status: 500,
                data: null
            };
        }
    }

    // 6. ELIMINAR
    async remove(id: number, businessId?: number) {
        try {
            const paymentMethod = await prisma.paymentMethod.findUnique({
                where: { id },
                include: {
                    _count: {
                        select: {
                            salePayments: true,
                            purchasePayments: true,
                            creditNotePayments: true
                        }
                    }
                }
            });

            if (!paymentMethod) {
                return {
                    message: 'Método de pago no encontrado',
                    status: 404,
                    data: null
                };
            }

            if (businessId && paymentMethod.businessId && paymentMethod.businessId !== businessId) {
                return {
                    message: 'No tienes permiso para eliminar un método de pago de otra tienda',
                    status: 403,
                    data: null
                };
            }

            const totalPayments =
                paymentMethod._count.salePayments +
                paymentMethod._count.purchasePayments +
                paymentMethod._count.creditNotePayments;

            if (totalPayments > 0) {
                return {
                    message: `No se puede eliminar el método de pago porque tiene ${totalPayments} pago(s) registrado(s). Desactívalo con el interruptor para que ya no aparezca en nuevas ventas.`,
                    status: 400,
                    data: null
                };
            }

            await prisma.paymentMethod.delete({
                where: { id }
            });

            return {
                message: 'Método de pago eliminado exitosamente',
                status: 200,
                data: null
            };

        } catch (error: any) {
            console.error('Error al eliminar el método de pago:', error);
            return {
                message: error.message || 'Error al eliminar el método de pago',
                status: 500,
                data: null
            };
        }
    }
}
