import { prisma } from '@/configs';
import { SubStatus } from '@prisma/client';

export class AdminService {

    /**
     * Listar todos los negocios del sistema (solo para administradores)
     * Incluye información de suscripción, categoría y miembros
     */
    async findAllBusinesses(page: number = 1, limit: number = 50) {
        try {
            const skip = (page - 1) * limit;

            const [businesses, total] = await Promise.all([
                prisma.business.findMany({
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
                prisma.business.count()
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
}
