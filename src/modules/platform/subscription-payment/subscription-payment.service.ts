import { prisma } from '@/configs';
import { PlanType, SubStatus, SubscriptionPaymentStatus } from '@prisma/client';
import { addMonths } from 'date-fns';
import { CreateSubscriptionPaymentInterface } from './interfaces';
import { tesoroPagosService } from './tesoro-pagos.service';

export class SubscriptionPaymentService {

  private async ensurePlanByCode(code: string) {
    const existing = await prisma.subscriptionPlan.findUnique({ where: { code } });
    if (existing) return existing;

    const created = await prisma.subscriptionPlan.create({
      data: {
        code,
        name: code,
        priceMonthly: 0 as any,
        isActive: true,
      },
    });

    const monthsOptions = [1, 3, 6, 12];
    await prisma.subscriptionPlanPrice.createMany({
      data: monthsOptions.map((months) => ({
        planId: created.id,
        months,
        price: (Number(created.priceMonthly) * months) as any,
        isActive: true,
      })),
      skipDuplicates: true,
    });

    return created;
  }

  private normalizePlanType(code: string): PlanType | null {
    const upper = String(code).toUpperCase();
    const allowed = Object.values(PlanType);
    return allowed.includes(upper as PlanType) ? (upper as PlanType) : null;
  }

  async create(businessId: number, userId: number, data: CreateSubscriptionPaymentInterface) {
    try {
      const [subscription, business] = await Promise.all([
        prisma.subscription.findUnique({
          where: { businessId },
          select: { id: true, planId: true, planType: true, endDate: true },
        }),
        prisma.business.findUnique({
          where: { id: businessId },
          select: { id: true, name: true, closingNotificationPhone: true },
        }),
      ]);

      if (!subscription) {
        return {
          status: 404,
          message: 'El negocio no tiene una suscripción registrada',
          data: null,
        };
      }

      const resolvedPlan = await (async () => {
        if (data.planId) {
          const plan = await prisma.subscriptionPlan.findUnique({ where: { id: data.planId } });
          if (!plan || !plan.isActive) return null;
          const planType = this.normalizePlanType(plan.code);
          return planType ? { planId: plan.id, planType } : null;
        }

        const planType = data.planType ?? subscription.planType ?? PlanType.TRIAL;
        const plan = await this.ensurePlanByCode(String(planType));
        return { planId: plan.id, planType };
      })();

      if (!resolvedPlan) {
        return {
          status: 400,
          message: 'Plan inválido',
          data: null,
        };
      }

      // ─── Validación automática con Banco del Tesoro si es VES (Pago Móvil) ───
      let autoApproved = false;
      let bankMessage = '';
      const now = new Date();

      if (data.currency === 'VES' && data.reference) {
        try {
          const valResult = await tesoroPagosService.validatePayment({
            amountBs: Number(data.amount),
            originBank: data.originBank,
            originPhone: data.originPhone,
            reference: data.reference,
          });

          bankMessage = valResult.message;
          if (valResult.approved) {
            autoApproved = true;
          } else if (!data.forceUnderReview) {
            // El banco respondió que el pago no fue encontrado y no se forzó revisión
            return {
              status: 400,
              message:
                valResult.message ||
                'Pago no encontrado en Banco del Tesoro. Verifica el monto, banco emisor y referencia.',
              data: {
                autoApproved: false,
                bankMessage: valResult.message,
                canForceReview: true,
              },
            };
          }
        } catch (err: any) {
          console.error('[SubscriptionPaymentService] Error consultando Banco del Tesoro:', err);
          bankMessage = err?.message || 'Error técnico al consultar el banco';
        }
      }

      const initialStatus = autoApproved
        ? SubscriptionPaymentStatus.APPROVED
        : SubscriptionPaymentStatus.UNDER_REVIEW;

      const reviewNote = autoApproved
        ? `Aprobado automáticamente por verificación en línea. Banco: ${data.originBank || '0102'}`
        : data.reviewNote;

      const payment = await prisma.subscriptionPayment.create({
        data: {
          businessId,
          subscriptionId: subscription.id,
          createdById: userId,
          planType: resolvedPlan.planType,
          planId: resolvedPlan.planId,
          monthsPurchased: data.monthsPurchased,
          amount: data.amount as any,
          currency: data.currency,
          reference: data.reference,
          proofUrl: data.proofUrl,
          reviewNote: reviewNote,
          status: initialStatus,
          reviewedAt: autoApproved ? now : undefined,
          reviewedById: autoApproved ? userId : undefined,
        },
        include: {
          subscription: {
            select: {
              id: true,
              planId: true,
              planType: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
          plan: true,
        },
      });

      let updatedSubscription = payment.subscription;
      let newEndDate = subscription.endDate;

      if (autoApproved) {
        const baseDate =
          subscription.endDate && new Date(subscription.endDate) > now
            ? new Date(subscription.endDate)
            : now;
        newEndDate = addMonths(baseDate, data.monthsPurchased);

        updatedSubscription = await prisma.subscription.update({
          where: { id: subscription.id },
          data: {
            status: SubStatus.ACTIVE,
            planId: resolvedPlan.planId,
            planType: resolvedPlan.planType,
            endDate: newEndDate,
          },
          select: {
            id: true,
            planId: true,
            planType: true,
            status: true,
            startDate: true,
            endDate: true,
          },
        });
      }

      const deliveryNote = {
        number: `NE-SUB-${String(payment.id).padStart(6, '0')}`,
        paymentId: payment.id,
        businessId,
        businessName: business?.name || 'Mi Negocio',
        businessPhone: business?.closingNotificationPhone || data.originPhone || '—',
        planName: resolvedPlan.planType,
        monthsPurchased: data.monthsPurchased,
        amount: Number(data.amount),
        currency: data.currency,
        reference: data.reference,
        originBank: data.originBank || '—',
        originPhone: data.originPhone || '—',
        validUntil: newEndDate,
        paidAt: now,
        status: autoApproved ? 'PAGADO / ACTIVO' : 'EN REVISIÓN',
        autoApproved,
        verifiedBy: autoApproved ? 'Acreditación y Verificación Automática en Línea' : 'Pendiente por Administrador',
      };

      return {
        status: 201,
        message: autoApproved
          ? '¡Pago verificado y acreditado automáticamente! Tu suscripción fue activada con los meses correspondientes.'
          : 'Pago registrado y enviado a revisión',
        data: {
          ...payment,
          subscription: updatedSubscription,
          autoApproved,
          bankMessage,
          deliveryNote,
        },
      };
    } catch (error: any) {
      // Unique constraint on (businessId, reference)
      if (error?.code === 'P2002') {
        return {
          status: 409,
          message: 'Ya existe un pago con esa referencia para este negocio',
          data: null,
        };
      }

      console.error('SubscriptionPaymentService.create error:', error);
      return {
        status: 500,
        message: 'Error interno al registrar el pago',
        data: null,
      };
    }
  }

  async getDeliveryNote(businessId: number, paymentId: number) {
    try {
      const payment = await prisma.subscriptionPayment.findFirst({
        where: { id: paymentId, businessId },
        include: {
          business: { select: { id: true, name: true, closingNotificationPhone: true } },
          subscription: true,
          plan: true,
        },
      });

      if (!payment) {
        return { status: 404, message: 'Pago no encontrado', data: null };
      }

      const isApproved = payment.status === SubscriptionPaymentStatus.APPROVED;
      const deliveryNote = {
        number: `NE-SUB-${String(payment.id).padStart(6, '0')}`,
        paymentId: payment.id,
        businessId: payment.businessId,
        businessName: payment.business?.name || 'Mi Negocio',
        businessPhone: payment.business?.closingNotificationPhone || '—',
        planName: payment.plan?.name || String(payment.planType),
        monthsPurchased: payment.monthsPurchased,
        amount: Number(payment.amount),
        currency: payment.currency,
        reference: payment.reference,
        status: isApproved ? 'PAGADO / ACTIVO' : 'EN REVISIÓN',
        createdAt: payment.createdAt,
        reviewedAt: payment.reviewedAt,
        validUntil: payment.subscription?.endDate,
        isApproved,
        verifiedBy: isApproved ? 'Acreditación y Verificación Automática en Línea' : 'Pendiente por Administrador',
      };

      return { status: 200, message: 'Nota de entrega obtenida', data: deliveryNote };
    } catch (error) {
      console.error('getDeliveryNote error:', error);
      return { status: 500, message: 'Error al generar la nota de entrega', data: null };
    }
  }

  async findAllMy(businessId: number) {
    try {
      const payments = await prisma.subscriptionPayment.findMany({
        where: { businessId },
        orderBy: { createdAt: 'desc' },
        include: {
          subscription: {
            select: {
              id: true,
              planId: true,
              planType: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
          plan: true,
          reviewedBy: { select: { id: true, name: true, ci: true } },
        },
      });

      return {
        status: 200,
        message: 'Pagos obtenidos exitosamente',
        data: payments,
      };
    } catch (error) {
      console.error('SubscriptionPaymentService.findAllMy error:', error);
      return {
        status: 500,
        message: 'Error interno al obtener pagos',
        data: null,
      };
    }
  }

  async findAllMyPaginated(businessId: number, page: number = 1, limit: number = 20) {
    try {
      const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
      const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(Math.floor(limit), 100) : 20;
      const skip = (safePage - 1) * safeLimit;

      const [payments, total] = await Promise.all([
        prisma.subscriptionPayment.findMany({
          where: { businessId },
          orderBy: { createdAt: 'desc' },
          skip,
          take: safeLimit,
          include: {
            business: { select: { id: true, name: true } },
            subscription: {
              select: {
                id: true,
                planId: true,
                planType: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
            plan: { select: { id: true, code: true, name: true } },
            reviewedBy: { select: { id: true, name: true, ci: true } },
          },
        }),
        prisma.subscriptionPayment.count({ where: { businessId } }),
      ]);

      return {
        status: 200,
        message: 'Pagos obtenidos exitosamente',
        data: {
          payments,
          pagination: {
            total,
            page: safePage,
            limit: safeLimit,
            totalPages: Math.max(1, Math.ceil(total / safeLimit)),
          },
        },
      };
    } catch (error) {
      console.error('SubscriptionPaymentService.findAllMyPaginated error:', error);
      return {
        status: 500,
        message: 'Error interno al obtener pagos',
        data: null,
      };
    }
  }

  async findOneMy(businessId: number, id: number) {
    try {
      const payment = await prisma.subscriptionPayment.findFirst({
        where: { id, businessId },
        include: {
          subscription: {
            select: {
              id: true,
              planId: true,
              planType: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
          plan: true,
          createdBy: { select: { id: true, name: true, ci: true } },
          reviewedBy: { select: { id: true, name: true, ci: true } },
        },
      });

      if (!payment) {
        return {
          status: 404,
          message: 'Pago no encontrado',
          data: null,
        };
      }

      return {
        status: 200,
        message: 'Pago obtenido exitosamente',
        data: payment,
      };
    } catch (error) {
      console.error('SubscriptionPaymentService.findOneMy error:', error);
      return {
        status: 500,
        message: 'Error interno al obtener pago',
        data: null,
      };
    }
  }

}
