import { prisma } from '@/configs';
import { PlanType, SubStatus, SubscriptionPaymentStatus } from '@prisma/client';
import { addMonths } from 'date-fns';

export class SubscriptionPaymentAdminService {

  private async ensurePlanByCode(tx: any, code: string) {
    const existing = await tx.subscriptionPlan.findUnique({ where: { code } });
    if (existing) return existing;

    const created = await tx.subscriptionPlan.create({
      data: {
        code,
        name: code,
        priceMonthly: 0 as any,
        isActive: true,
      },
    });

    const monthsOptions = [1, 3, 6, 12];
    await tx.subscriptionPlanPrice.createMany({
      data: monthsOptions.map((months: number) => ({
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

    /**
   * (Admin) Listar pagos de suscripción con paginación
   */
  async listForAdmin(page: number = 1, limit: number = 50, status?: string, search?: string) {
    try {
      const skip = (page - 1) * limit;

      const statusFilter = (() => {
        if (!status) return undefined;
        const upper = String(status).toUpperCase();
        const allowed = Object.values(SubscriptionPaymentStatus);
        return allowed.includes(upper as any) ? (upper as any) : undefined;
      })();

      const searchFilter = search?.trim()
        ? {
            OR: [
              { reference: { contains: search.trim(), mode: 'insensitive' as const } },
              { business: { name: { contains: search.trim(), mode: 'insensitive' as const } } },
            ],
          }
        : undefined;

      const whereClause: any = {
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(searchFilter || {}),
      };

      const [payments, total] = await Promise.all([
        prisma.subscriptionPayment.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            business: { select: { id: true, name: true } },
            subscription: { select: { id: true, planId: true, planType: true, status: true, endDate: true } },
            plan: true,
            createdBy: { select: { id: true, name: true, ci: true } },
            reviewedBy: { select: { id: true, name: true, ci: true } },
          },
        }),
        prisma.subscriptionPayment.count({ where: whereClause }),
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
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('SubscriptionPaymentService.listForAdmin error:', error);
      return {
        message: 'Error al listar pagos de suscripción',
        status: 500,
        data: null,
      };
    }
  }

  /**
   * (Admin) Revisar pago (APPROVED | REJECTED).
   * Si se aprueba, extiende subscription.endDate por monthsPurchased desde max(endDate, now)
   * para preservar el tiempo restante cuando el pago es anticipado.
   */
  async reviewByAdmin(
    paymentId: number,
    status: 'APPROVED' | 'REJECTED',
    reviewerUserId: number,
    note?: string,
  ) {
    try {
      const now = new Date();

      const result = await prisma.$transaction(async (tx) => {
        const payment = await tx.subscriptionPayment.findUnique({
          where: { id: paymentId },
          include: {
            subscription: true,
            business: { select: { id: true, name: true } },
          },
        });

        if (!payment) {
          return {
            message: 'Pago no encontrado',
            status: 404,
            data: null,
          };
        }

        if (payment.status !== SubscriptionPaymentStatus.UNDER_REVIEW) {
          return {
            message: 'Este pago ya fue revisado',
            status: 409,
            data: null,
          };
        }

        const resolvedPlanId = await (async () => {
          if (payment.planId) return payment.planId;
          const plan = await this.ensurePlanByCode(tx, String(payment.planType));
          return plan.id;
        })();

        const normalizedPlanType = this.normalizePlanType(String(payment.planType));
        if (!normalizedPlanType) {
          return {
            message: 'Plan inválido',
            status: 400,
            data: null,
          };
        }

        const updatedPayment = await tx.subscriptionPayment.update({
          where: { id: paymentId },
          data: {
            status: status as any,
            reviewedAt: now,
            reviewedById: reviewerUserId,
            reviewNote: note ? String(note).slice(0, 500) : payment.reviewNote,
            planId: resolvedPlanId,
            planType: normalizedPlanType,
          },
        });

        if (status === 'APPROVED') {
          const baseDate = payment.subscription.endDate > now ? payment.subscription.endDate : now;
          const newEndDate = addMonths(baseDate, payment.monthsPurchased);

          const updatedSubscription = await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
              planType: normalizedPlanType,
              planId: resolvedPlanId,
              status: SubStatus.ACTIVE,
              endDate: newEndDate,
              lastPaymentRef: payment.reference,
            },
          });

          return {
            message: 'Pago aprobado y suscripción extendida',
            status: 200,
            data: {
              payment: updatedPayment,
              subscription: updatedSubscription,
              business: payment.business,
            },
          };
        }

        return {
          message: 'Pago rechazado',
          status: 200,
          data: {
            payment: updatedPayment,
            subscription: payment.subscription,
            business: payment.business,
          },
        };
      });

      return result;
    } catch (error) {
      console.error('SubscriptionPaymentService.reviewByAdmin error:', error);
      return {
        message: 'Error al revisar pago de suscripción',
        status: 500,
        data: null,
      };
    }
  }
}
