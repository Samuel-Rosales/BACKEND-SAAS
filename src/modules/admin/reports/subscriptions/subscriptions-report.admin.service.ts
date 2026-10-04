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

  /**
   * GET /api/v1/admin/reports/subscriptions/financial
   * Reporte financiero mensual: total a recoger, cobrado, pendiente y estado por cliente (pagó / no ha pagado)
   */
  async getFinancialReport(monthStr?: string) {
    try {
      const now = new Date();
      let targetYear = now.getUTCFullYear();
      let targetMonth = now.getUTCMonth(); // 0-indexed (0 = Jan, 9 = Oct)

      if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
        const [y, m] = monthStr.split('-').map(Number);
        if (y >= 2020 && y <= 2040 && m >= 1 && m <= 12) {
          targetYear = y;
          targetMonth = m - 1;
        }
      }

      const startOfMonth = new Date(Date.UTC(targetYear, targetMonth, 1, 0, 0, 0, 0));
      const nextMonthYear = targetMonth === 11 ? targetYear + 1 : targetYear;
      const nextMonth = targetMonth === 11 ? 0 : targetMonth + 1;
      const endOfMonth = new Date(Date.UTC(nextMonthYear, nextMonth, 1, 0, 0, 0, 0));
      // Ventana de 10 días previos para capturar pagos realizados a fin del mes anterior para este ciclo
      const paymentLookback = new Date(startOfMonth.getTime() - 10 * 24 * 60 * 60 * 1000);
      const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());

      const monthNames = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
      ];
      const monthLabel = `${monthNames[targetMonth]} ${targetYear}`;
      const monthCode = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;

      // Consultamos todas las suscripciones
      const subscriptions = await prisma.subscription.findMany({
        include: {
          plan: true,
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
          payments: {
            where: {
              createdAt: {
                gte: paymentLookback,
                lt: endOfMonth,
              },
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 5,
          },
        },
        orderBy: [
          { status: 'asc' },
          { endDate: 'asc' },
        ],
      });

      let totalSubscriptions = subscriptions.length;
      let payingSubscriptions = 0;
      let projectedRevenue = 0;
      let collectedRevenue = 0;
      let pendingRevenue = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;

      const items = subscriptions.map((sub) => {
        // Determinar precio mensual ($)
        const isTrial = sub.planType === 'TRIAL' || Boolean(sub.plan?.name?.toUpperCase()?.includes('TRIAL'));
        let monthlyPrice = 0;

        if (isTrial) {
          monthlyPrice = 0;
        } else if (sub.plan && sub.plan.priceMonthly !== null && sub.plan.priceMonthly !== undefined) {
          monthlyPrice = Number(sub.plan.priceMonthly);
        } else {
          // Precios por defecto según tipo de plan si priceMonthly no está seteado
          if (sub.planType === 'BASIC') monthlyPrice = 15;
          else if (sub.planType === 'PREMIUM' || (sub.planType as string) === 'PRO') monthlyPrice = 20;
          else if (sub.planType === 'ENTERPRISE') monthlyPrice = 50;
          else monthlyPrice = 0;
        }

        // Dueño y datos de contacto
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

        const endDate = new Date(sub.endDate);
        const endUtc = Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate());
        const daysRemaining = Math.round((endUtc - todayUtc) / (24 * 60 * 60 * 1000));
        const formattedEndDate = endDate.toLocaleDateString('es-ES', {
          timeZone: 'UTC',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        });

        // Buscar pagos en el ciclo correspondiente
        const approvedPayment = sub.payments.find((p) => p.status === 'APPROVED');
        const underReviewPayment = sub.payments.find((p) => p.status === 'UNDER_REVIEW');

        let paymentStatus: 'PAID' | 'UNDER_REVIEW' | 'PENDING' | 'OVERDUE' | 'TRIAL_ACTIVE' | 'TRIAL_EXPIRED' | 'EXEMPT' = 'PENDING';
        let paymentStatusLabel = 'No ha pagado';
        let paymentAmount = 0;
        let paymentReference = '';
        let paymentDate: string | null = null;

        if (monthlyPrice === 0) {
          if (isTrial) {
            if (sub.status === 'ACTIVE' && endUtc >= todayUtc) {
              paymentStatus = 'TRIAL_ACTIVE';
              paymentStatusLabel = 'Prueba activa ($0)';
            } else {
              paymentStatus = 'TRIAL_EXPIRED';
              paymentStatusLabel = 'Prueba finalizada ($0)';
            }
          } else {
            paymentStatus = 'EXEMPT';
            paymentStatusLabel = 'Cuenta Exenta ($0)';
          }
        } else {
          payingSubscriptions++;
          projectedRevenue += monthlyPrice;

          if (approvedPayment) {
            paymentStatus = 'PAID';
            paymentStatusLabel = 'Pagó';
            paymentAmount = Number(approvedPayment.amount);
            paymentReference = approvedPayment.reference;
            paymentDate = approvedPayment.createdAt.toISOString();
            collectedRevenue += monthlyPrice;
            paidCount++;
          } else if (underReviewPayment) {
            paymentStatus = 'UNDER_REVIEW';
            paymentStatusLabel = 'Pago en revisión';
            paymentAmount = Number(underReviewPayment.amount);
            paymentReference = underReviewPayment.reference;
            paymentDate = underReviewPayment.createdAt.toISOString();
            pendingRevenue += monthlyPrice;
            pendingCount++;
          } else if (sub.status === 'ACTIVE' && endDate >= endOfMonth) {
            // El negocio tiene suscripción activa que cubre todo este mes (al día / adelantado)
            paymentStatus = 'PAID';
            paymentStatusLabel = 'Pagó (Al día)';
            paymentAmount = monthlyPrice;
            collectedRevenue += monthlyPrice;
            paidCount++;
          } else if (sub.status === 'ACTIVE' && endUtc >= todayUtc) {
            // Su fecha de vencimiento es durante este mes y aún no ha renovado
            paymentStatus = 'PENDING';
            paymentStatusLabel = daysRemaining === 0 ? 'Vence HOY' : daysRemaining === 1 ? 'Vence MAÑANA' : `Por vencer (${daysRemaining} días)`;
            pendingRevenue += monthlyPrice;
            pendingCount++;
          } else {
            // Vencido o suspendido
            paymentStatus = 'OVERDUE';
            paymentStatusLabel = 'No ha pagado (Vencido)';
            pendingRevenue += monthlyPrice;
            overdueCount++;
          }
        }

        // Mensaje de WhatsApp
        let whatsappMessage = '';
        if (monthlyPrice === 0) {
          if (isTrial && sub.status === 'ACTIVE') {
            whatsappMessage =
`*PERÍODO DE PRUEBA - GUARDIÁN TECNOLÓGICO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hola *${ownerName}*, te saludamos desde *Guardián Tecnológico*.

Esperamos que la plataforma te esté siendo de gran provecho para *${sub.business.name}*.

📅 Te recordamos que tu período de prueba finaliza el *${formattedEndDate}*.

💡 Si deseas continuar disfrutando de todas las funciones sin interrupciones, contáctanos para activar tu suscripción. ¡Estamos a tu completa orden!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
          } else {
            whatsappMessage =
`*INFORMACIÓN DE CUENTA - GUARDIÁN TECNOLÓGICO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hola *${ownerName}*, te saludamos desde *Guardián Tecnológico*.

Te escribimos con respecto a tu cuenta para el negocio *${sub.business.name}*. Estamos atentos ante cualquier requerimiento o consulta sobre la plataforma.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
          }
        } else if (paymentStatus === 'PAID') {
          whatsappMessage = 
`*ESTADO DE SUSCRIPCIÓN AL DÍA - GUARDIÁN TECNOLÓGICO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hola *${ownerName}*, te saludamos desde *Guardián Tecnológico*.

Confirmamos que tu suscripción para el negocio *${sub.business.name}* (Plan *${sub.plan?.name || sub.planType}*) se encuentra *AL DÍA* para el período *${monthLabel}*.

📅 Tu próxima fecha de renovación es el *${formattedEndDate}*.

¡Muchas gracias por preferirnos y confiar en nuestros servicios!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        } else {
          whatsappMessage = 
`*RECORDATORIO DE PAGO - GUARDIÁN TECNOLÓGICO*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Hola *${ownerName}*, te saludamos desde *Guardián Tecnológico*.

Te escribimos para recordarte el pago de la suscripción de tu negocio *${sub.business.name}* correspondiente a *${monthLabel}*.

📋 *Plan:* ${sub.plan?.name || sub.planType}
💰 *Monto mensual:* $${monthlyPrice.toFixed(2)}
📅 *Vencimiento:* ${formattedEndDate}
📌 *Estado:* ${paymentStatusLabel}

🔗 Puedes reportar tu pago directamente aquí:
https://guardian.com.ve/subscription

Si ya realizaste tu pago, por favor haznos llegar tu comprobante o haz caso omiso. ¡Estamos a tu orden!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
        }

        const whatsappUrl = cleanPhone
          ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMessage)}`
          : null;

        return {
          businessId: sub.business.id,
          businessName: sub.business.name,
          planType: sub.planType,
          planName: sub.plan?.name || sub.planType,
          monthlyPrice,
          subscriptionStatus: sub.status,
          endDate: sub.endDate,
          formattedEndDate,
          paymentStatus,
          paymentStatusLabel,
          paymentAmount,
          paymentReference,
          paymentDate,
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

      const collectionRate = projectedRevenue > 0
        ? Math.round((collectedRevenue / projectedRevenue) * 100)
        : 0;

      return {
        message: 'Reporte financiero de suscripciones obtenido exitosamente',
        status: 200,
        data: {
          period: {
            monthCode,
            monthLabel,
            year: targetYear,
            month: targetMonth + 1,
          },
          summary: {
            totalSubscriptions,
            payingSubscriptions,
            projectedRevenue,
            collectedRevenue,
            pendingRevenue,
            paidCount,
            pendingCount,
            overdueCount,
            collectionRate,
          },
          items,
        },
      };
    } catch (error) {
      console.error('AdminSubscriptionsReportService.getFinancialReport error:', error);
      return {
        message: 'Error al obtener reporte financiero de suscripciones',
        status: 500,
        data: null,
      };
    }
  }
}
