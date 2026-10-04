import { prisma } from '@/configs';
import { SubStatus } from '@prisma/client';

/**
 * Revisa todas las suscripciones activas y desactiva (PAST_DUE)
 * aquellas cuya fecha de vencimiento ya expiró.
 */
export const checkSubscriptionsDaily = async (): Promise<number> => {
    try {
        const now = new Date();

        // Buscamos suscripciones que siguen como ACTIVE pero cuya fecha endDate ya pasó
        const expiredSubs = await prisma.subscription.findMany({
            where: {
                status: SubStatus.ACTIVE,
                endDate: {
                    lt: now
                }
            },
            select: {
                id: true,
                businessId: true,
                endDate: true,
                business: {
                    select: {
                        name: true
                    }
                }
            }
        });

        if (expiredSubs.length > 0) {
            const expiredIds = expiredSubs.map((s) => s.id);

            await prisma.subscription.updateMany({
                where: {
                    id: { in: expiredIds }
                },
                data: {
                    status: SubStatus.PAST_DUE
                }
            });

            console.log(`[Cron Subscriptions] Se desactivaron automáticamente ${expiredSubs.length} suscripciones vencidas.`);
            expiredSubs.forEach((s) => {
                console.log(`  - Negocio #${s.businessId} "${s.business.name}" marcado como PAST_DUE (Vencía: ${s.endDate.toISOString()})`);
            });

            return expiredSubs.length;
        }

        console.log('[Cron Subscriptions] Verificación completada: no hay suscripciones activas vencidas.');
        return 0;
    } catch (error) {
        console.error('[Cron Subscriptions] Error al procesar suscripciones vencidas:', error);
        return 0;
    }
};
