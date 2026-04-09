import { prisma } from '@/configs';

export class AdminService {
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
