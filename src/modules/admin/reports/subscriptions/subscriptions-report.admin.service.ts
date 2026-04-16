import { prisma } from '@/configs';
import { SubStatus } from '@prisma/client';

export class AdminSubscriptionsReportService {
  async getOverview(windowDays: number = 7) {
    try {
      const safeWindowDays = Number.isFinite(windowDays) ? Math.max(1, Math.min(365, Math.trunc(windowDays))) : 7;

      const now = new Date();
      const startUtc = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
      const endExclusiveUtc = new Date(startUtc.getTime() + (safeWindowDays + 1) * 24 * 60 * 60 * 1000);

      const [activeCount, cancelledCount, expiringSoonCount] = await Promise.all([
        prisma.subscription.count({ where: { status: SubStatus.ACTIVE } }),
        prisma.subscription.count({ where: { status: SubStatus.CANCELLED } }),
        prisma.subscription.count({
          where: {
            status: SubStatus.ACTIVE,
            endDate: {
              gte: startUtc,
              lt: endExclusiveUtc,
            },
          },
        }),
      ]);

      return {
        message: 'Reporte de suscripciones obtenido exitosamente',
        status: 200,
        data: {
          activeCount,
          expiringSoonCount,
          cancelledCount,
          windowDays: safeWindowDays,
        },
      };
    } catch (error) {
      console.error('AdminSubscriptionsReportService.getOverview error:', error);
      return {
        message: 'Error al obtener reporte de suscripciones',
        status: 500,
        data: null,
      };
    }
  }
}
