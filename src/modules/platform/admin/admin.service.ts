import { prisma } from '@/configs';
import { PlanType, SubStatus, SubscriptionPaymentStatus } from '@prisma/client';
import { addMonths } from 'date-fns';

export class AdminService {

    /**
     * Listar todos los negocios del sistema (solo para administradores)
     * Incluye información de suscripción, categoría y miembros
     */
    async findAllBusinesses(
        page: number = 1,
        limit: number = 50,
        status?: string,
        planType?: string
    ) {
        try {
            const skip = (page - 1) * limit;

            const normalizedStatus = (() => {
                if (!status) return undefined;
                const upper = String(status).toUpperCase();
                const allowed = Object.values(SubStatus);
                return allowed.includes(upper as SubStatus) ? (upper as SubStatus) : undefined;
            })();

            const normalizedPlanType = (() => {
                if (!planType) return undefined;
                const upper = String(planType).toUpperCase();
                const allowed = Object.values(PlanType);
                return allowed.includes(upper as PlanType) ? (upper as PlanType) : undefined;
            })();

            const subscriptionWhere = {
                ...(normalizedStatus ? { status: normalizedStatus } : {}),
                ...(normalizedPlanType ? { planType: normalizedPlanType } : {}),
            };

            const whereClause = Object.keys(subscriptionWhere).length > 0
                ? { subscription: { is: subscriptionWhere } }
                : undefined;

            const [businesses, total] = await Promise.all([
                prisma.business.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    include: {
                        subscription: {
                            select: {
                                id: true,
                                planType: true,
                                status: true,
                                startDate: true,
                                endDate: true,
                                lastPaymentRef: true
                            }
                        },
                        businessCategory: {
                            select: {
                                id: true,
                                name: true
                            }
                        },
                        members: {
                            where: { isActive: true },
                            select: {
                                id: true,
                                userId: true,
                                role: {
                                    select: {
                                        name: true,
                                        code: true
                                    }
                                }
                            }
                        },
                        _count: {
                            select: {
                                members: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    }
                }),
                prisma.business.count({ where: whereClause })
            ]);

            return {
                message: 'Negocios obtenidos exitosamente',
                status: 200,
                data: {
                    businesses,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            };

        } catch (error) {
            console.error('Error al obtener todos los negocios:', error);
            return {
                message: 'Error al obtener los negocios',
                status: 500,
                data: null
            };
        }
    }

    /**
     * Activar o desactivar un negocio
     * Cambia el estado de la suscripción en lugar de desactivar miembros
     */
    async toggleBusinessStatus(businessId: number, status: SubStatus) {
        try {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                include: { subscription: true }
            });

            if (!business || !business.subscription) {
                return {
                    message: 'Negocio o suscripción no encontrada',
                    status: 404,
                    data: null
                };
            }

            // Actualizar el estado de la suscripción
            const updatedSubscription = await prisma.subscription.update({
                where: { id: business.subscription.id },
                data: { status }
            });

            const updatedBusiness = await prisma.business.findUnique({
                where: { id: businessId },
                include: {
                    subscription: true,
                    businessCategory: true
                }
            });

            return {
                message: `Negocio ${status === 'ACTIVE' ? 'activado' : 'desactivado'} exitosamente`,
                status: 200,
                data: updatedBusiness
            };

        } catch (error) {
            console.error('Error al cambiar estado del negocio:', error);
            return {
                message: 'Error al cambiar el estado del negocio',
                status: 500,
                data: null
            };
        }
    }

    /**
     * Actualizar la suscripción de un negocio
     */
    async updateBusinessSubscription(
        businessId: number,
        data: {
            planType?: string;
            status?: SubStatus;
            endDate?: Date;
        }
    ) {
        try {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                include: { subscription: true }
            });

            if (!business || !business.subscription) {
                return {
                    message: 'Negocio o suscripción no encontrada',
                    status: 404,
                    data: null
                };
            }

            const updatedSubscription = await prisma.subscription.update({
                where: { id: business.subscription.id },
                data: {
                    planType: data.planType as any,
                    status: data.status,
                    endDate: data.endDate
                }
            });

            return {
                message: 'Suscripción actualizada exitosamente',
                status: 200,
                data: updatedSubscription
            };

        } catch (error) {
            console.error('Error al actualizar suscripción:', error);
            return {
                message: 'Error al actualizar la suscripción',
                status: 500,
                data: null
            };
        }
    }

    /**
     * Obtener estadísticas generales del sistema
     */
    async getSystemStats() {
        try {
            const [
                totalBusinesses,
                activeBusinesses,
                totalUsers,
                subscriptionStats
            ] = await Promise.all([
                prisma.business.count(),
                prisma.business.count({
                    where: {
                        members: {
                            some: { isActive: true }
                        }
                    }
                }),
                prisma.user.count(),
                prisma.subscription.groupBy({
                    by: ['status', 'planType'],
                    _count: true
                })
            ]);

            return {
                message: 'Estadísticas obtenidas exitosamente',
                status: 200,
                data: {
                    totalBusinesses,
                    activeBusinesses,
                    totalUsers,
                    subscriptionStats
                }
            };

        } catch (error) {
            console.error('Error al obtener estadísticas:', error);
            return {
                message: 'Error al obtener estadísticas',
                status: 500,
                data: null
            };
        }
    }

    /**
     * Listar pagos de suscripción (ledger)
     */
    async listSubscriptionPayments(page: number = 1, limit: number = 50, status?: string) {
        try {
            const skip = (page - 1) * limit;

            const statusFilter = (() => {
                if (!status) return undefined;
                const upper = String(status).toUpperCase();
                const allowed = Object.values(SubscriptionPaymentStatus);
                return allowed.includes(upper as any) ? (upper as any) : undefined;
            })();

            const whereClause: any = {
                ...(statusFilter ? { status: statusFilter } : {}),
            };

            const [payments, total] = await Promise.all([
                prisma.subscriptionPayment.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        business: { select: { id: true, name: true } },
                        subscription: { select: { id: true, planType: true, status: true, endDate: true } },
                        createdBy: { select: { id: true, name: true, ci: true } },
                        reviewedBy: { select: { id: true, name: true, ci: true } },
                    }
                }),
                prisma.subscriptionPayment.count({ where: whereClause })
            ]);

            return {
                message: 'Pagos de suscripción obtenidos exitosamente',
                status: 200,
                data: {
                    payments,
                    pagination: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            };

        } catch (error) {
            console.error('Error al listar pagos de suscripción:', error);
            return {
                message: 'Error al listar pagos de suscripción',
                status: 500,
                data: null
            };
        }
    }

    /**
     * Revisar pago (aprobar/rechazar)
     * Si se aprueba, extiende subscription.endDate por monthsPurchased desde max(endDate, now)
     */
    async reviewSubscriptionPayment(
        paymentId: number,
        status: 'APPROVED' | 'REJECTED',
        reviewerUserId: number,
        note?: string
    ) {
        try {
            const now = new Date();

            const result = await prisma.$transaction(async (tx) => {
                const payment = await tx.subscriptionPayment.findUnique({
                    where: { id: paymentId },
                    include: {
                        subscription: true,
                        business: { select: { id: true, name: true } }
                    }
                });

                if (!payment) {
                    return {
                        message: 'Pago no encontrado',
                        status: 404,
                        data: null
                    };
                }

                if (payment.status !== SubscriptionPaymentStatus.UNDER_REVIEW) {
                    return {
                        message: 'Este pago ya fue revisado',
                        status: 409,
                        data: null
                    };
                }

                const updatedPayment = await tx.subscriptionPayment.update({
                    where: { id: paymentId },
                    data: {
                        status: status as any,
                        reviewedAt: now,
                        reviewedById: reviewerUserId,
                        reviewNote: note ? String(note).slice(0, 500) : payment.reviewNote,
                    }
                });

                if (status === 'APPROVED') {
                    const baseDate = payment.subscription.endDate > now ? payment.subscription.endDate : now;
                    const newEndDate = addMonths(baseDate, payment.monthsPurchased);

                    const updatedSubscription = await tx.subscription.update({
                        where: { id: payment.subscriptionId },
                        data: {
                            planType: payment.planType,
                            status: SubStatus.ACTIVE,
                            endDate: newEndDate,
                            lastPaymentRef: payment.reference,
                        }
                    });

                    return {
                        message: 'Pago aprobado y suscripción extendida',
                        status: 200,
                        data: {
                            payment: updatedPayment,
                            subscription: updatedSubscription,
                            business: payment.business,
                        }
                    };
                }

                return {
                    message: 'Pago rechazado',
                    status: 200,
                    data: {
                        payment: updatedPayment,
                        subscription: payment.subscription,
                        business: payment.business,
                    }
                };
            });

            return result;

        } catch (error) {
            console.error('Error al revisar pago de suscripción:', error);
            return {
                message: 'Error al revisar pago de suscripción',
                status: 500,
                data: null
            };
        }
    }
}
