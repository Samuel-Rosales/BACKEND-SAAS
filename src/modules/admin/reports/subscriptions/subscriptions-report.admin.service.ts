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

  async getReminders(windowDays: number = 7) {
    try {
      const safeWindowDays = Number.isFinite(windowDays) ? Math.max(1, Math.min(365, Math.trunc(windowDays))) : 7;
      const now = new Date();
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
      const endExclusiveUtc = new Date(todayUtc + (safeWindowDays + 1) * 24 * 60 * 60 * 1000);

      // Buscamos suscripciones activas por vencer o ya vencidas/past_due
      const subscriptions = await prisma.subscription.findMany({
        where: {
          OR: [
            {
              status: SubStatus.ACTIVE,
              endDate: {
                lt: endExclusiveUtc,
              },
            },
            {
              status: SubStatus.PAST_DUE,
            },
            {
              endDate: {
                lt: now,
              },
            },
          ],
        },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              closingNotificationPhone: true,
              members: {
                where: { isActive: true },
                select: {
                  role: { select: { code: true, name: true } },
                  user: {
                    select: {
                      id: true,
                      name: true,
                      ci: true,
                      contacts: {
                        select: {
                          phone: true,
                          email: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          endDate: 'asc',
        },
      });

      const reminders = subscriptions.map((sub) => {
        const endDate = new Date(sub.endDate);
        const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
        const msPerDay = 24 * 60 * 60 * 1000;
        const daysRemaining = Math.round((endUtc - todayUtc) / msPerDay);

        const ownerMember =
          sub.business.members.find((m) => m.role?.code === 'OWNER') ||
          sub.business.members[0];

        const ownerName = ownerMember?.user?.name || 'Cliente';
        const ownerCi = ownerMember?.user?.ci || '';
        const rawPhone =
          ownerMember?.user?.contacts?.phone ||
          sub.business.closingNotificationPhone ||
          '';

        let cleanPhone = rawPhone.replace(/\D/g, '');
        if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
          cleanPhone = '58' + cleanPhone.substring(1);
        }

        const formattedDate = endDate.toLocaleDateString('es-ES', {
          timeZone: 'UTC',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        let statusText = '';
        let urgency: 'EXPIRED' | 'TODAY' | 'TOMORROW' | 'URGENT' | 'WARNING' = 'WARNING';

        if (daysRemaining < 0) {
          statusText = `venció hace ${Math.abs(daysRemaining)} día(s)`;
          urgency = 'EXPIRED';
        } else if (daysRemaining === 0) {
          statusText = `vence *HOY*`;
          urgency = 'TODAY';
        } else if (daysRemaining === 1) {
          statusText = `vence *MAÑANA*`;
          urgency = 'TOMORROW';
        } else if (daysRemaining <= 3) {
          statusText = `vence en *${daysRemaining} días* (el ${formattedDate})`;
          urgency = 'URGENT';
        } else {
          statusText = `vence en *${daysRemaining} días* (el ${formattedDate})`;
          urgency = 'WARNING';
        }

        const whatsappMessage = 
`*RECORDATORIO DE SUSCRIPCIÓN - GUARDIÁN TECNOLÓGICO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hola *${ownerName}*, te saludamos desde *Guardián Tecnológico*.

Te recordamos que la suscripción de tu negocio *${sub.business.name}* (Plan *${sub.planType}*) ${statusText}.

${daysRemaining <= 0
  ? '⚠️ El acceso a las operaciones del negocio está suspendido por vencimiento. Para reactivarlo de inmediato, por favor reporta tu pago:'
  : '⏳ Para evitar la suspensión de tus servicios y continuar facturando sin interrupciones, por favor reporta tu pago aquí:'}

🔗 https://guardian.com.ve/subscription

Si ya realizaste tu pago, por favor haz caso omiso a este mensaje. ¡Muchas gracias por tu confianza!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

        const whatsappUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`
          : null;

        return {
          businessId: sub.business.id,
          businessName: sub.business.name,
          planType: sub.planType,
          status: sub.status,
          endDate: sub.endDate,
          daysRemaining,
          urgency,
          owner: {
            name: ownerName,
            ci: ownerCi,
            phone: rawPhone,
            cleanPhone,
          },
          whatsappMessage,
          whatsappUrl,
        };
      });

      return {
        message: 'Recordatorios de suscripción obtenidos exitosamente',
        status: 200,
        data: reminders,
      };
    } catch (error) {
      console.error('AdminSubscriptionsReportService.getReminders error:', error);
      return {
        message: 'Error al obtener recordatorios de suscripciones',
        status: 500,
        data: [],
      };
    }
  }
}
