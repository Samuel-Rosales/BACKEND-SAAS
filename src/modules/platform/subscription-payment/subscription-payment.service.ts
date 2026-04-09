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

}
