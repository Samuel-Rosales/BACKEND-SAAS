import { prisma } from '@/configs';
import { PlanType, Prisma } from '@prisma/client';

export class SubscriptionPlanService {
  async create(data: {
    code: PlanType;
    name: string;
    description?: string;
    isActive?: boolean;
    entitlements?: Record<string, any> | null;
    priceMonthly?: number;
  }) {
    try {
      const existing = await prisma.subscriptionPlan.findUnique({ where: { code: String(data.code) } });

      if (existing) {
        return {
          message: 'Ya existe un plan con ese código',
          status: 409,
          data: null,
        };
      }

      const created = await prisma.subscriptionPlan.create({
        data: {
          code: String(data.code),
          name: data.name,
          description: data.description,
          isActive: data.isActive ?? true,
          entitlements: data.entitlements === null ? Prisma.DbNull : data.entitlements,
          priceMonthly: (data.priceMonthly ?? 0) as any,
        },
        include: {
          prices: { orderBy: { months: 'asc' } },
        },
      });

      // Seed default prices for allowed durations if not provided elsewhere
      await prisma.subscriptionPlanPrice.createMany({
        data: [1, 3, 6, 12].map((months) => ({
          planId: created.id,
          months,
          price: (Number(created.priceMonthly) * months) as any,
          isActive: true,
        })),
        skipDuplicates: true,
      });

      const withPrices = await prisma.subscriptionPlan.findUnique({
        where: { id: created.id },
        include: { prices: { orderBy: { months: 'asc' } } },
      });

      return {
        message: 'Plan creado exitosamente',
        status: 201,
        data: withPrices,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.create error:', error);
      return {
        message: 'Error al crear el plan',
        status: 500,
        data: null,
      };
    }
  }

  async findAllAdmin() {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        orderBy: [{ isActive: 'desc' }, { code: 'asc' }],
        include: {
          prices: { orderBy: { months: 'asc' } },
        },
      });

      return {
        message: 'Planes obtenidos exitosamente',
        status: 200,
        data: plans,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.findAllAdmin error:', error);
      return {
        message: 'Error al obtener planes',
        status: 500,
        data: null,
      };
    }
  }

  async findAllPublic() {
    try {
      const plans = await prisma.subscriptionPlan.findMany({
        where: { isActive: true },
        orderBy: [{ priceMonthly: 'asc' }, { code: 'asc' }],
        select: {
          id: true,
          code: true,
          name: true,
          description: true,
          entitlements: true,
          priceMonthly: true,
          prices: {
            where: { isActive: true },
            orderBy: { months: 'asc' },
            select: {
              months: true,
              price: true,
            },
          },
        },
      });

      return {
        message: 'Planes obtenidos exitosamente',
        status: 200,
        data: plans,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.findAllPublic error:', error);
      return {
        message: 'Error al obtener planes',
        status: 500,
        data: null,
      };
    }
  }

  async findOneAdmin(id: number) {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({
        where: { id },
        include: { prices: { orderBy: { months: 'asc' } } },
      });

      if (!plan) {
        return {
          message: 'Plan no encontrado',
          status: 404,
          data: null,
        };
      }

      return {
        message: 'Plan obtenido exitosamente',
        status: 200,
        data: plan,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.findOneAdmin error:', error);
      return {
        message: 'Error al obtener el plan',
        status: 500,
        data: null,
      };
    }
  }

  async update(id: number, data: {
    name?: string;
    description?: string;
    isActive?: boolean;
    entitlements?: Record<string, any> | null;
    priceMonthly?: number;
  }) {
    try {
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });

      if (!existing) {
        return {
          message: 'Plan no encontrado',
          status: 404,
          data: null,
        };
      }

      const updated = await prisma.subscriptionPlan.update({
        where: { id },
        data: {
          name: data.name,
          description: data.description,
          isActive: data.isActive,
          entitlements:
            data.entitlements === undefined
              ? undefined
              : data.entitlements === null
                ? Prisma.DbNull
                : data.entitlements,
          priceMonthly: data.priceMonthly === undefined ? undefined : (data.priceMonthly as any),
        },
        include: { prices: { orderBy: { months: 'asc' } } },
      });

      return {
        message: 'Plan actualizado exitosamente',
        status: 200,
        data: updated,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.update error:', error);
      return {
        message: 'Error al actualizar el plan',
        status: 500,
        data: null,
      };
    }
  }

  async remove(id: number) {
    try {
      const existing = await prisma.subscriptionPlan.findUnique({ where: { id } });

      if (!existing) {
        return {
          message: 'Plan no encontrado',
          status: 404,
          data: null,
        };
      }

      const [subsCount, paymentsCount] = await Promise.all([
        prisma.subscription.count({ where: { planId: id } }),
        prisma.subscriptionPayment.count({ where: { planId: id } }),
      ]);

      if (subsCount > 0 || paymentsCount > 0) {
        return {
          message: 'No se puede eliminar el plan porque ya tiene registros asociados',
          status: 409,
          data: { subsCount, paymentsCount },
        };
      }

      await prisma.$transaction([
        prisma.subscriptionPlanPrice.deleteMany({ where: { planId: id } }),
        prisma.subscriptionPlan.delete({ where: { id } }),
      ]);

      return {
        message: 'Plan eliminado exitosamente',
        status: 200,
        data: null,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.remove error:', error);
      return {
        message: 'Error al eliminar el plan',
        status: 500,
        data: null,
      };
    }
  }

  async listPrices(planId: number) {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });

      if (!plan) {
        return {
          message: 'Plan no encontrado',
          status: 404,
          data: null,
        };
      }

      const prices = await prisma.subscriptionPlanPrice.findMany({
        where: { planId },
        orderBy: { months: 'asc' },
      });

      return {
        message: 'Precios obtenidos exitosamente',
        status: 200,
        data: prices,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.listPrices error:', error);
      return {
        message: 'Error al obtener precios',
        status: 500,
        data: null,
      };
    }
  }

  async upsertPrice(planId: number, data: { months: 1 | 3 | 6 | 12; price: number; isActive?: boolean }) {
    try {
      const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });

      if (!plan) {
        return {
          message: 'Plan no encontrado',
          status: 404,
          data: null,
        };
      }

      const months = Number(data.months) as 1 | 3 | 6 | 12;

      const price = await prisma.subscriptionPlanPrice.upsert({
        where: {
          planId_months: {
            planId,
            months,
          },
        },
        create: {
          planId,
          months,
          price: data.price as any,
          isActive: data.isActive ?? true,
        },
        update: {
          price: data.price as any,
          ...(data.isActive === undefined ? {} : { isActive: data.isActive }),
        },
      });

      return {
        message: 'Precio actualizado exitosamente',
        status: 200,
        data: price,
      };
    } catch (error) {
      console.error('SubscriptionPlanService.upsertPrice error:', error);
      return {
        message: 'Error al actualizar precio',
        status: 500,
        data: null,
      };
    }
  }
}
