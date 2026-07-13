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
   * GET /api/v1/admin/businesses/:id
   */
  async findOne(businessId: number) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          subscription: true,
          businessCategory: true,
          members: {
            where: { 
              role: { code: 'OWNER' } 
            },
            include: {
              user: {
                include: {
                  contacts: true
                }
              },
              role: true
            }
          }
        }
      });

      if (!business) {
        return {
          message: 'Negocio no encontrado',
          status: 404,
          data: null,
        };
      }

      return {
        message: 'Detalles del negocio obtenidos exitosamente',
        status: 200,
        data: business,
      };
    } catch (error) {
      console.error('BusinessAdminService.findOne error:', error);
      return {
        message: 'Error al obtener el detalle del negocio',
        status: 500,
        data: null,
      };
    }
  }

  /**
   * GET /api/v1/admin/businesses
   */
  async findAll(page: number = 1, limit: number = 50, status?: string, planType?: string, search?: string) {
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

      const searchFilter = search?.trim()
        ? { name: { contains: search.trim(), mode: 'insensitive' as const } }
        : undefined;

      const whereClause: any = {
        ...(Object.keys(subscriptionWhere).length > 0 ? { subscription: { is: subscriptionWhere } } : {}),
        ...(searchFilter || {}),
      };

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

  /**
   * DELETE /api/v1/admin/business/:id
   * Elimina permanentemente un negocio y TODOS sus registros asociados.
   * Usa $transaction para garantizar atomicidad.
   */
  async permanentlyDeleteBusiness(businessId: number, confirmName: string) {
    try {
      // 1. Verificar que el negocio existe
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        select: { id: true, name: true },
      });

      if (!business) {
        return {
          message: 'Negocio no encontrado',
          status: 404,
          data: null,
        };
      }

      // 2. Validar confirmación de nombre
      if (business.name.trim().toLowerCase() !== confirmName.trim().toLowerCase()) {
        return {
          message: 'El nombre de confirmación no coincide con el nombre del negocio',
          status: 400,
          data: null,
        };
      }

      // 3. Obtener IDs necesarios para sub-selects
      const saleIds = (await prisma.sale.findMany({
        where: { businessId },
        select: { id: true },
      })).map(s => s.id);

      const creditNoteIds = (await prisma.creditNote.findMany({
        where: { businessId },
        select: { id: true },
      })).map(cn => cn.id);

      const purchaseIds = (await prisma.purchase.findMany({
        where: { businessId },
        select: { id: true },
      })).map(p => p.id);

      const productIds = (await prisma.product.findMany({
        where: { businessId },
        select: { id: true },
      })).map(p => p.id);

      const cashRegisterIds = (await prisma.cashRegister.findMany({
        where: { businessId },
        select: { id: true },
      })).map(cr => cr.id);

      const depotIds = (await prisma.depot.findMany({
        where: { businessId },
        select: { id: true },
      })).map(d => d.id);

      // 4. Ejecutar eliminación en transacción (hojas → raíz)
      await prisma.$transaction(async (tx) => {

        // === RESTAURANT ===
        // OrderItem → depende de Order
        await tx.orderItem.deleteMany({
          where: { order: { businessId } },
        });
        // Order → depende de Business
        await tx.order.deleteMany({
          where: { businessId },
        });
        // RestaurantTable → depende de Business
        await tx.restaurantTable.deleteMany({
          where: { businessId },
        });

        // === CREDIT NOTES (hojas primero) ===
        // CreditNotePayment → depende de CreditNote
        if (creditNoteIds.length > 0) {
          await tx.creditNotePayment.deleteMany({
            where: { creditNoteId: { in: creditNoteIds } },
          });
        }
        // CreditNoteItem → depende de CreditNote
        if (creditNoteIds.length > 0) {
          await tx.creditNoteItem.deleteMany({
            where: { creditNoteId: { in: creditNoteIds } },
          });
        }
        // CreditNote → depende de Sale (que tiene businessId)
        await tx.creditNote.deleteMany({
          where: { businessId },
        });

        // === SALES (hojas primero) ===
        // SaleInstallment → depende de Sale
        if (saleIds.length > 0) {
          await tx.saleInstallment.deleteMany({
            where: { saleId: { in: saleIds } },
          });
        }
        // SaleItemLot → depende de SaleItem → Sale
        if (saleIds.length > 0) {
          await tx.saleItemLot.deleteMany({
            where: { saleItem: { saleId: { in: saleIds } } },
          });
        }
        // SaleItem → depende de Sale
        if (saleIds.length > 0) {
          await tx.saleItem.deleteMany({
            where: { saleId: { in: saleIds } },
          });
        }
        // SalePayment → depende de Sale
        if (saleIds.length > 0) {
          await tx.salePayment.deleteMany({
            where: { saleId: { in: saleIds } },
          });
        }
        // Sale
        await tx.sale.deleteMany({
          where: { businessId },
        });

        // === PURCHASES (hojas primero) ===
        // PurchaseInstallment → depende de Purchase
        if (purchaseIds.length > 0) {
          await tx.purchaseInstallment.deleteMany({
            where: { purchaseId: { in: purchaseIds } },
          });
        }
        // PurchasePayment → depende de Purchase
        if (purchaseIds.length > 0) {
          await tx.purchasePayment.deleteMany({
            where: { purchaseId: { in: purchaseIds } },
          });
        }
        // PurchaseItem → depende de Purchase
        if (purchaseIds.length > 0) {
          await tx.purchaseItem.deleteMany({
            where: { purchaseId: { in: purchaseIds } },
          });
        }
        // Purchase
        await tx.purchase.deleteMany({
          where: { businessId },
        });

        // === CASH REGISTER ===
        // CashCount → depende de CashRegister
        if (cashRegisterIds.length > 0) {
          await tx.cashCount.deleteMany({
            where: { cashRegisterId: { in: cashRegisterIds } },
          });
        }
        // CashRegister
        await tx.cashRegister.deleteMany({
          where: { businessId },
        });

        // === INVENTORY ===
        // StockMovement → depende de Business
        await tx.stockMovement.deleteMany({
          where: { businessId },
        });
        // StockLot → depende de Product y Depot
        if (productIds.length > 0) {
          await tx.stockLot.deleteMany({
            where: { productId: { in: productIds } },
          });
        }
        // ProductComponent (self-ref en Product)
        if (productIds.length > 0) {
          await tx.productComponent.deleteMany({
            where: {
              OR: [
                { parentProductId: { in: productIds } },
                { childProductId: { in: productIds } },
              ],
            },
          });
        }
        // ProductPresentation → depende de Product
        if (productIds.length > 0) {
          await tx.productPresentation.deleteMany({
            where: { productId: { in: productIds } },
          });
        }
        // Product
        await tx.product.deleteMany({
          where: { businessId },
        });

        // === CATÁLOGOS DEL NEGOCIO ===
        // Category
        await tx.category.deleteMany({
          where: { businessId },
        });
        // Depot
        await tx.depot.deleteMany({
          where: { businessId },
        });
        // Client
        await tx.client.deleteMany({
          where: { businessId },
        });
        // Supplier
        await tx.supplier.deleteMany({
          where: { businessId },
        });

        // === TASA DE CAMBIO (solo las del negocio) ===
        await tx.exchangeRate.deleteMany({
          where: { businessId },
        });

        // === SUSCRIPCIÓN ===
        // SubscriptionPayment → depende de Subscription y Business
        await tx.subscriptionPayment.deleteMany({
          where: { businessId },
        });
        // Subscription (1:1 con Business)
        await tx.subscription.deleteMany({
          where: { businessId },
        });

        // === MIEMBROS ===
        await tx.businessMember.deleteMany({
          where: { businessId },
        });

        // === RAÍZ: BUSINESS ===
        await tx.business.delete({
          where: { id: businessId },
        });
      }, {
        timeout: 60000, // 60s para negocios con muchos datos
      });

      console.log(`[ADMIN] Negocio "${business.name}" (ID: ${businessId}) eliminado permanentemente.`);

      return {
        message: `Negocio "${business.name}" eliminado permanentemente junto con todos sus registros`,
        status: 200,
        data: { deletedBusinessId: businessId, deletedBusinessName: business.name },
      };

    } catch (error: any) {
      console.error('BusinessAdminService.permanentlyDeleteBusiness error:', error);

      // Extraer detalles del error de Prisma para diagnóstico
      const prismaCode = error?.code || 'UNKNOWN';
      const prismaMeta = error?.meta ? JSON.stringify(error.meta) : 'N/A';
      const errorMessage = error?.message || 'Error desconocido';

      return {
        message: `Error al eliminar el negocio: [${prismaCode}] ${errorMessage}`,
        status: 500,
        data: { prismaCode, prismaMeta },
      };
    }
  }
}
