import { prisma } from '@/configs';
import { CreateSubscriptionInterface, UpdateSubscriptionInterface } from './interfaces';

export class SubscriptionService {

    // 1. CREAR
    async create(data: CreateSubscriptionInterface) {
        try {
            
            // Verificar que el negocio existe
            const business = await prisma.business.findUnique({
                where: { id: data.businessId }
            });

            if (!business) {
                return {
                    message: 'Negocio no encontrado',
                    status: 404,
                    data: null
                };
            }

            // Verificar que el negocio no tenga ya una suscripción
            const existingSubscription = await prisma.subscription.findUnique({
                where: { businessId: data.businessId }
            });

            if (existingSubscription) {
                return {
                    message: 'El negocio ya tiene una suscripción activa',
                    status: 400,
                    data: null
                };
            }

            const subscription = await prisma.subscription.create({
                data: {
                    businessId: data.businessId,
                    planType: data.planType,
                    status: data.status,
                    startDate: data.startDate,
                    endDate: data.endDate,
                    lastPaymentRef: data.lastPaymentRef
                },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!subscription) {
                return {
                    message: 'No se pudo crear la suscripción',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Suscripción creada exitosamente',
                status: 201,
                data: subscription
            };

        } catch (error) {

            console.error('Error al crear la suscripción:', error);

            return {
                message: 'Error al crear la suscripción',
                status: 500,
                data: null
            };

        }
    }

    // 2. LISTAR TODAS
    async findAll() {
        try {

            const subscriptions = await prisma.subscription.findMany({
                orderBy: { id: 'asc' },
            });

            if (subscriptions.length === 0) {
                return {
                    message: 'No hay suscripciones disponibles',
                    status: 404,
                    data: []
                };
            }

            return {
                message: 'Suscripciones obtenidas exitosamente',
                status: 200,
                data: subscriptions
            };

        } catch (error) {

            console.error('Error al obtener las suscripciones:', error);

            return {
                message: 'Error al obtener las suscripciones',
                status: 500,
                data: null
            };
        }
    }

    // 3. BUSCAR UNA
    async findOne(id: number) {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { id },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true,
                            address: true
                        }
                    }
                }
            });

            if (!subscription) {
                return {
                    message: 'Suscripción no encontrada',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Suscripción obtenida exitosamente',
                status: 200,
                data: subscription
            };

         } catch (error) {

            console.error('Error al obtener la suscripción:', error);

            return {
                message: 'Error al obtener la suscripción',
                status: 500,
                data: null
            };
        }
    }

    // 4. BUSCAR POR BUSINESS ID
    async findByBusinessId(businessId: number) {
        try {
            const subscription = await prisma.subscription.findUnique({
                where: { businessId },
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true,
                            logoUrl: true
                        }
                    }
                }
            });

            if (!subscription) {
                return {
                    message: 'Suscripción no encontrada para este negocio',
                    status: 404,
                    data: null
                };
            }

            return {
                message: 'Suscripción obtenida exitosamente',
                status: 200,
                data: subscription
            };

         } catch (error) {

            console.error('Error al obtener la suscripción:', error);

            return {
                message: 'Error al obtener la suscripción',
                status: 500,
                data: null
            };
        }
    }

    // 5. ACTUALIZAR
    async update(id: number, data: UpdateSubscriptionInterface) {

        try {

            const updatedSubscription = await prisma.subscription.update({
                where: { id },
                data: data,
                include: {
                    business: {
                        select: {
                            id: true,
                            name: true
                        }
                    }
                }
            });

            if (!updatedSubscription) {
                return {
                    message: 'No se pudo actualizar la suscripción',
                    status: 400,
                    data: null
                };
            }

            return {
                message: 'Suscripción actualizada exitosamente',
                status: 200,
                data: updatedSubscription
            };

        } catch (error) {

            console.error('Error al actualizar la suscripción:', error);
            
            return {
                message: 'Error al actualizar la suscripción',
                status: 500,
                data: null
            };
        }
    }

    // 6. ELIMINAR
    async remove(id: number) {
        try {

            const subscription = await prisma.subscription.findUnique({
                where: { id }
            });
            
            if (!subscription) {
                return {
                    message: 'Suscripción no encontrada',
                    status: 404,
                    data: null
                };
            }

            await prisma.subscription.delete({
                where: { id }
            });

            return {
                message: 'Suscripción eliminada exitosamente',
                status: 200,
                data: null
            };

        } catch (error) {

            console.error('Error al eliminar la suscripción:', error);

            return {
                message: 'Error al eliminar la suscripción',
                status: 500,
                data: null
            };
        }
    }
}
