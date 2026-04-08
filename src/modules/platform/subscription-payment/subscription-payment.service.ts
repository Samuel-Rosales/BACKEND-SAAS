import { prisma } from '@/configs';
import { SubStatus, SubscriptionPaymentStatus } from '@prisma/client';
import { addMonths } from 'date-fns';
import { CreateSubscriptionPaymentInterface } from './interfaces';

export class SubscriptionPaymentService {
  async create(businessId: number, userId: number, data: CreateSubscriptionPaymentInterface) {
    try {
      const subscription = await prisma.subscription.findUnique({
        where: { businessId },
        select: { id: true },
      });

      if (!subscription) {
        return {
          status: 404,
          message: 'El negocio no tiene una suscripción registrada',
          data: null,
        };
      }

      const payment = await prisma.subscriptionPayment.create({
        data: {
          businessId,
          subscriptionId: subscription.id,
          createdById: userId,
          planType: data.planType,
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
              planType: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
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
              planType: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
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
              planType: true,
              status: true,
              startDate: true,
              endDate: true,
            },
          },
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

  /**
   * (Admin) Listar pagos de suscripción con paginación
   */
  async listForAdmin(page: number = 1, limit: number = 50, status?: string) {
    try {
      const skip = (page - 1) * limit;

      const statusFilter = (() => {
        if (!status) return undefined;
        const upper = String(status).toUpperCase();
        const allowed = Object.values(SubscriptionPaymentStatus);
        return allowed.includes(upper as any) ? (upper as any) : undefined;
      })();

      const whereClause: any = {
        ...(statusFilter ? { status: statusFilter } : {}),
      };

      const [payments, total] = await Promise.all([
        prisma.subscriptionPayment.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            business: { select: { id: true, name: true } },
            subscription: { select: { id: true, planType: true, status: true, endDate: true } },
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

        const updatedPayment = await tx.subscriptionPayment.update({
          where: { id: paymentId },
          data: {
            status: status as any,
            reviewedAt: now,
            reviewedById: reviewerUserId,
            reviewNote: note ? String(note).slice(0, 500) : payment.reviewNote,
          },
        });

        if (status === 'APPROVED') {
          const baseDate = payment.subscription.endDate > now ? payment.subscription.endDate : now;
          const newEndDate = addMonths(baseDate, payment.monthsPurchased);

          const updatedSubscription = await tx.subscription.update({
            where: { id: payment.subscriptionId },
            data: {
              planType: payment.planType,
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
