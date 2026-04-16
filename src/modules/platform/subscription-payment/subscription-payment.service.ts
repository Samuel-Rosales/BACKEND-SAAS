import { prisma } from '@/configs';
import { PlanType, SubStatus, SubscriptionPaymentStatus } from '@prisma/client';
import { addMonths } from 'date-fns';
import { CreateSubscriptionPaymentInterface } from './interfaces';

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
      const subscription = await prisma.subscription.findUnique({
        where: { businessId },
        select: { id: true, planId: true, planType: true, endDate: true },
      });

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
          reviewNote: data.reviewNote,
          status: SubscriptionPaymentStatus.UNDER_REVIEW,
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

      return {
        status: 201,
        message: 'Pago registrado y enviado a revisión',
        data: payment,
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
