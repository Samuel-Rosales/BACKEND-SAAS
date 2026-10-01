import { prisma } from '@/configs';
import { BudgetStatus } from '@prisma/client';

/**
 * Tarea periódica para purgar definitivamente los presupuestos que han cumplido
 * su ciclo de vida y superaron su período de gracia de 3 días:
 * 1. Presupuestos cobrados / convertidos a venta (status = CONVERTED).
 * 2. Presupuestos cancelados o rechazados (status = CANCELLED | REJECTED).
 * 3. Presupuestos vencidos (status = EXPIRED).
 */
export const purgeExpiredAndConvertedBudgets = async () => {
    try {
        const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);

        // 1. Presupuestos convertidos a venta hace más de 3 días
        const convertedResult = await prisma.budget.deleteMany({
            where: {
                status: BudgetStatus.CONVERTED,
                convertedAt: {
                    lte: threeDaysAgo
                }
            }
        });

        // 2. Presupuestos cancelados o rechazados hace más de 3 días
        const cancelledResult = await prisma.budget.deleteMany({
            where: {
                status: { in: [BudgetStatus.CANCELLED, BudgetStatus.REJECTED] },
                cancelledAt: {
                    lte: threeDaysAgo
                }
            }
        });

        // 3. Presupuestos vencidos hace más de 3 días
        const expiredResult = await prisma.budget.deleteMany({
            where: {
                status: BudgetStatus.EXPIRED,
                validUntil: {
                    lte: threeDaysAgo
                }
            }
        });

        const totalPurged = convertedResult.count + cancelledResult.count + expiredResult.count;
        if (totalPurged > 0) {
            console.log(`[Cron Budget] Purgados ${totalPurged} presupuestos (Convertidos: ${convertedResult.count}, Cancelados: ${cancelledResult.count}, Vencidos: ${expiredResult.count})`);
        }
    } catch (error) {
        console.error('[Cron Budget] Error al purgar presupuestos obsoletos:', error);
    }
};
