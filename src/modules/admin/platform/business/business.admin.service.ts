import { prisma } from '@/configs';
import { PlanType, SubStatus } from '@prisma/client';

export class BusinessAdminService {

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
  /**
   * GET /api/v1/admin/businesses
   */
  async findAll(page: number = 1, limit: number = 50, status?: string, planType?: string) {
    try {
      const skip = (page - 1) * limit;

      const normalizedStatus = (() => {
        if (!status) return undefined;
        const upper = String(status).toUpperCase();
        const allowed = Object.values(SubStatus);
        return allowed.includes(upper as SubStatus) ? (upper as SubStatus) : undefined;
      })();

      const normalizedPlanType = (() => {
        if (!planType) return undefined;
        const upper = String(planType).toUpperCase();
        const allowed = Object.values(PlanType);
        return allowed.includes(upper as PlanType) ? (upper as PlanType) : undefined;
      })();

      const subscriptionWhere = {
        ...(normalizedStatus ? { status: normalizedStatus } : {}),
        ...(normalizedPlanType ? { planType: normalizedPlanType } : {}),
      };

      const whereClause = Object.keys(subscriptionWhere).length > 0 ? { subscription: { is: subscriptionWhere } } : undefined;

      const [businesses, total] = await Promise.all([
        prisma.business.findMany({
          where: whereClause,
          skip,
          take: limit,
          include: {
            subscription: {
              select: {
                id: true,
                planId: true,
                planType: true,
                status: true,
                startDate: true,
                endDate: true,
                lastPaymentRef: true,
              },
            },
            businessCategory: {
              select: {
                id: true,
                name: true,
              },
            },
            members: {
              where: { isActive: true },
              select: {
                id: true,
                userId: true,
                role: {
                  select: {
                    name: true,
                    code: true,
                  },
                },
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        }),
        prisma.business.count({ where: whereClause }),
      ]);

      return {
        message: 'Negocios obtenidos exitosamente',
        status: 200,
        data: {
          businesses,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('BusinessAdminService.findAll error:', error);
      return {
        message: 'Error al obtener los negocios',
        status: 500,
        data: null,
      };
    }
  }

  /**
   * PATCH /api/v1/admin/businesses/:id/status
   */
  async toggleBusinessStatus(businessId: number, status: SubStatus) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { subscription: true },
      });

      if (!business || !business.subscription) {
        return {
          message: 'Negocio o suscripción no encontrada',
          status: 404,
          data: null,
        };
      }

      await prisma.subscription.update({
        where: { id: business.subscription.id },
        data: { status },
      });

      const updatedBusiness = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          subscription: true,
          businessCategory: true,
        },
      });

      return {
        message: `Negocio ${status === 'ACTIVE' ? 'activado' : 'desactivado'} exitosamente`,
        status: 200,
        data: updatedBusiness,
      };
    } catch (error) {
      console.error('BusinessAdminService.toggleBusinessStatus error:', error);
      return {
        message: 'Error al cambiar el estado del negocio',
        status: 500,
        data: null,
      };
    }
  }

  /**
   * PATCH /api/v1/admin/businesses/:id/subscription
   */
  async updateBusinessSubscription(
    businessId: number,
    data: {
      planType?: string;
      status?: SubStatus;
      endDate?: Date;
    },
  ) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: { subscription: true },
      });

      if (!business || !business.subscription) {
        return {
          message: 'Negocio o suscripción no encontrada',
          status: 404,
          data: null,
        };
      }

      const updatedSubscription = await prisma.subscription.update({
        where: { id: business.subscription.id },
        data: await (async () => {
          if (!data.planType) {
            return {
              status: data.status,
              endDate: data.endDate,
            };
          }

          const upper = String(data.planType).toUpperCase();
          const allowed = Object.values(PlanType);
          if (!allowed.includes(upper as PlanType)) {
            throw new Error('INVALID_PLAN_TYPE');
          }

          const plan = await this.ensurePlanByCode(upper);
          return {
            planType: upper as any,
            planId: plan.id,
            status: data.status,
            endDate: data.endDate,
          };
        })(),
      });

      return {
        message: 'Suscripción actualizada exitosamente',
        status: 200,
        data: updatedSubscription,
      };
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_PLAN_TYPE') {
        return {
          message: 'Plan inválido',
          status: 400,
          data: null,
        };
      }
      console.error('BusinessAdminService.updateBusinessSubscription error:', error);
      return {
        message: 'Error al actualizar la suscripción',
        status: 500,
        data: null,
      };
    }
  }
}
