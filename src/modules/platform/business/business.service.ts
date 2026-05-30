import { prisma } from '@/configs';
import { CreateBusinessInterface, UpdateBusinessInterface, UpdateExchangeConfigInterface } from './interfaces';
import { PlanType, SubStatus, ExchangeRateStrategy } from '@prisma/client'; // Importamos Enums de Prisma
import { BusinessError, resolveBusinessExchangeRate, canAccessBusinessPermission, getRolePermissions } from '@/utils';
import { BusinessPermissionCode } from '@/data/aim/role-permissions.data';
import { HashId } from '@/utils/hash-id';

export class BusinessService {

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

  // 1. CREAR NEGOCIO + SUSCRIPCIÓN + MIEMBRO ADMIN
  async create(userId: number, data: CreateBusinessInterface) {

    return await prisma.$transaction(async (tx) => {
      try {
        // A. Buscar el rol OWNER para asignarlo
        // (Si no tienes seeds, esto fallará. Asegúrate de tener roles en DB)
        const adminRole = await tx.role.findUnique({
          where: { code: 'OWNER' }
        });

        if (!adminRole) {
          return {
            message: 'Error interno: El rol OWNER no está configurado en el sistema.',
            status: 500,
            data: null
          };
        }

        // B. Crear el Negocio
        const trialPlan = await this.ensurePlanByCode(tx, PlanType.TRIAL);
        const newBusiness = await tx.business.create({
          data: {
            name: data.name,
            address: data.address,
            logoUrl: data.logoUrl,
            businessCategoryId: data.businessCategoryId,
            // C. Crear la relación BusinessMember automáticamente
            members: {
              create: {
                userId: userId,
                roleId: adminRole.id,
                isActive: true
              }
            },
            // D. Crear la Suscripción Trial automáticamente
            subscription: {
              create: {
                planType: PlanType.TRIAL,
                planId: trialPlan.id,
                status: SubStatus.ACTIVE,
                startDate: new Date(),
                endDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 días de prueba
                lastPaymentRef: 'TRIAL_START'
              }
            }
          },
          include: {
            subscription: true,
            businessCategory: { select: { id: true, name: true } },
            members: {
              where: { userId },
              select: {
                role: { select: { id: true, name: true, code: true } }
              }
            }
          }
        });

        const formattedBusiness = {
          ...newBusiness,
          memberRole: newBusiness.members[0]?.role?.name || 'Miembro'
        };

        // Codificar ID interno a hashId para uso externo
        const hashId = new HashId();
        (formattedBusiness as any).id = hashId.encode(newBusiness.id);

        return {
          message: 'Negocio creado exitosamente',
          status: 201,
          data: formattedBusiness
        };
      } catch (error) {
        console.error('Error al crear el negocio:', error);
        return {
          message: 'Por favor contacte al administrador',
          status: 500,
          data: null
        };
      }
    });
  }

  // 2. LISTAR NEGOCIOS DEL USUARIO (Mis Empresas)
  async findAllByUser(userId: number) {

    try {

      const businesses = await prisma.business.findMany({
        where: {
          members: {
            some: { userId: userId, isActive: true } // Solo donde soy miembro activo
          }
        },
        include: {
          subscription: { select: { status: true, planType: true, endDate: true } },
          members: { where: { userId: userId }, select: { role: { select: { name: true } } } },
          businessCategory: { select: { name: true } }
        }
      });

      if (!businesses) {
        return {
          message: 'No se encontraron negocios.',
          status: 404,
          data: null
        };
      }

      if (businesses.length === 0) {
        return {
          message: 'No hay negocios registrados.',
          status: 404,
          data: null
        };
      }

      const formattedBusinesses = businesses.map(business => {
        const memberRole = business.members[0]?.role?.name || 'Miembro';
        const hashId = new HashId();
        const hashedId = hashId.encode(business.id);
        // console.log(`Negocio ID: ${business.id} => Hashed ID: ${hashedId}`);
        return {
          ...business,
          memberRole: memberRole,
          id: hashedId
        };
      });

      return {
        message: 'Negocios obtenidos exitosamente',
        status: 200,
        data: formattedBusinesses
      };

    } catch (error) {

      console.error('Error al obtener los negocios:', error);

      return {
        message: 'Por favor contacte al administrador',
        status: 500,
        data: null
      };
    }
  }

  async findOne(businessId: number, userId: number) {
      try {
          // 1. Buscamos el negocio y el rol del usuario
          // QUITAMOS el include de exchangeRates porque esa lógica estaba mal
          const business = await prisma.business.findFirst({
              where: {
                  id: businessId,
                  members: {
                      some: { userId: userId, isActive: true }
                  }
              },
              include: {
                  members: { 
                      where: { userId: userId }, 
                    select: { role: { select: { name: true, code: true } } } 
                  },
                  subscription: { select: { status: true, planType: true, endDate: true } },
                  businessCategory: { select: { name: true } },
                  subscriptionPayments: {},
                  // ❌ Eliminamos exchangeRates de aquí.
                  // No podemos confiar en una simple relación de base de datos 
                  // para una lógica de negocio condicional.
              }
          });

          if (!business) {
              return {
                  message: 'Empresa no encontrada o no tienes acceso.',
                  status: 404,
                  data: null
              };
          }

          // 2. Resolvemos la tasa REAL usando tu función inteligente
          // Esto buscará BCV (Global) o Manual según la configuración del negocio
          let activeRate = null;
          try {
              activeRate = await resolveBusinessExchangeRate(business.id);
          } catch (e) {
              console.warn(`Advertencia: Negocio ${businessId} sin tasa activa.`);
              // No lanzamos error 500 para no bloquear el acceso al dashboard,
              // pero enviamos null o una tasa por defecto.
          }

          // 3. Formateamos la respuesta
            const memberRoleCode = business.members[0]?.role?.code || null;
          const formattedBusiness = {
              ...business,
              memberRole: business.members[0]?.role?.name || 'Miembro',
              memberRoleCode,
              memberPermissions: memberRoleCode ? getRolePermissions(memberRoleCode) : [],
              
              // Inyectamos la tasa correcta calculada
              // Lo enviamos como un objeto único o array según lo espere tu frontend
              currentExchangeRate: activeRate ? {
                  id: activeRate.id,
                  rate: Number(activeRate.rate),
                  source: activeRate.source,
                  lastUpdate: activeRate.createdAt
              } : null
          };

          return {
              message: 'Empresa obtenida exitosamente',
              status: 200,
              data: formattedBusiness
          };

      } catch (error) {
          console.error('Error al obtener la empresa:', error);
          return {
              message: 'Por favor contacte al administrador',
              status: 500,
              data: null
          };
      }
  }

  // 4. ACTUALIZAR DATOS
  async updateGeneralInfo(businessId: number, userId: number, data: UpdateBusinessInterface) {
    try {
      const access = await this.verifyAccess(businessId, userId, { permission: 'BUSINESS_SETTINGS_EDIT' });
      if (access.status !== 200) return access;

      // Sanitización: Solo permitimos campos cosméticos aquí
      const allowedData = {
        name: data.name,
        address: data.address,
        logoUrl: data.logoUrl,
        businessCategoryId: data.businessCategoryId
      };

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: allowedData
      });

      return {
        message: 'Información general actualizada',
        status: 200,
        data: updated
      };
    } catch (error) {
       // ... manejo de error estándar
       return { status: 500, message: 'Error interno', data: null };
    }
  }

  async updatePolicies(businessId: number, userId: number, data: { enableGlobalCredit?: boolean, defaultCreditLimit?: number }) {
    try {
      // Seguridad Estricta: Solo OWNER debería cambiar políticas financieras globales
      const access = await this.verifyAccess(businessId, userId, { permission: 'BUSINESS_POLICIES_EDIT' });
      if (access.status !== 200) return access;

      // VALIDACIÓN DE NEGOCIO (Lo que te faltaba)
      if (data.defaultCreditLimit !== undefined && data.defaultCreditLimit < 0) {
        throw new BusinessError('El límite de crédito base no puede ser negativo.', 400);
      }

      const updated = await prisma.business.update({
        where: { id: businessId },
        data: {
          enableGlobalCredit: data.enableGlobalCredit,
          defaultCreditLimit: data.defaultCreditLimit // Prisma maneja el cast a Decimal si el input es number
        }
      });

      return {
        message: 'Políticas de negocio actualizadas',
        status: 200,
        data: {
            enableGlobalCredit: updated.enableGlobalCredit,
            defaultCreditLimit: updated.defaultCreditLimit.toNumber() // Convertir a number para el Frontend
        }
      };
    } catch (error: any) {
        if (error instanceof BusinessError) {
            return { message: error.message, status: error.status, data: null };
        }
        console.error('Error policies:', error);
        return { message: 'Error al actualizar políticas', status: 500, data: null };
    }
  }

  async updateExchangeRateConfig(businessId: number, userId: number, data: UpdateExchangeConfigInterface) {
    try {
      // A. Verificación de seguridad (Solo dueños o admins deberían tocar dinero)
      // Reutilizamos tu método privado verifyAccess
      const accessCheck = await this.verifyAccess(businessId, userId, { permission: 'BUSINESS_EXCHANGE_RATE_EDIT' });
      if (accessCheck.status !== 200) return accessCheck;

      return await prisma.$transaction(async (tx) => {
        let newCurrentRate: number = 0;

        // --- CASO 1: ESTRATEGIA MANUAL ---
        if (data.strategy === ExchangeRateStrategy.MANUAL) {

          if (!data.manualRate || data.manualRate <= 0) {
            throw new BusinessError('Para la estrategia MANUAL, se requiere una tasa válida mayor a 0.', 400);
          }

          newCurrentRate = data.manualRate;

          // 1.1 Crear el registro histórico de auditoría
          await tx.exchangeRate.create({
            data: {
              businessId: businessId, // Es privado de este negocio
              rate: data.manualRate,
              source: ExchangeRateStrategy.MANUAL,
              isActive: true
            }
          });
        }

        // --- CASO 2: ESTRATEGIA API (BCV o PARALELO) ---
        else {
          // 2.1 Buscar la última tasa GLOBAL disponible en el sistema para esa estrategia
          // Esto es vital: Si el usuario cambia a BCV, el sistema debe buscar 
          // cuánto vale el BCV YA MISMO para actualizar la caché del negocio.
          const globalRate = await tx.exchangeRate.findFirst({
            where: {
              businessId: null, // Tasa global
              source: data.strategy, // API_BCV o API_PARALLEL
              isActive: true
            },
            orderBy: { createdAt: 'desc' } // La más reciente
          });

          if (!globalRate) {
            // Fallback de seguridad si el sistema es nuevo y no ha corrido el cron job aún
            console.warn(`No se encontró tasa global para ${data.strategy}. Se mantendrá tasa actual.`);
            // En este caso extremo, no actualizamos el currentExchangeRate o usamos 1.0
            // Para este ejemplo, lanzaré error para obligar a tener el sistema configurado
            throw new BusinessError(`El sistema no tiene tasas cargadas para ${data.strategy} actualmente.`, 400);
          }

          newCurrentRate = Number(globalRate.rate);

        }

        // --- ACTUALIZACIÓN DEL NEGOCIO (CACHE) ---
        const updatedBusiness = await tx.business.update({
          where: { id: businessId },
          data: {
            rateStrategy: data.strategy,
            manualRate: data.strategy === ExchangeRateStrategy.MANUAL ? data.manualRate : null, // Limpiamos si no es manual (opcional)
            currentExchangeRate: newCurrentRate // Actualizamos la caché para el Frontend
          }
        });

        return {
          message: 'Configuración de tasa actualizada exitosamente',
          status: 200,
          data: {
            strategy: updatedBusiness.rateStrategy,
            currentRate: updatedBusiness.currentExchangeRate.toString()
          }
        };
      });

    } catch (error: any) {

      if (error instanceof BusinessError) {
        return {
          message: error.message,
          status: error.status,
          data: null
        };
      }

      console.error('Error al configurar tasa de cambio:', error);
      return {
        message: error.message || 'Error interno al actualizar la tasa',
        status: error.message.includes('tasa válida') ? 400 : 500, // Manejo de error semántico
        data: null
      };
    }
  }

  async findOneForSettings(businessId: number, userId: number) {
    try {
       const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: { some: { userId: userId, isActive: true } }
        },
        include: {
            businessCategory: true // Para mostrar la categoría actual en el select
        }
      });

      if (!business) return { status: 404, message: 'Negocio no encontrado', data: null };

      // TRANSFORMACIÓN DE DATOS (Mapeo DTO)
      // Esto es crucial para que tu formulario React reciba los datos listos para usar
      const settingsDTO = {
          general: {
              name: business.name,
              address: business.address,
              logoUrl: business.logoUrl,
              businessCategoryId: business.businessCategoryId
          },
          rates: {
              strategy: business.rateStrategy,
              manualRate: business.manualRate?.toNumber() || 0,
              currentRate: business.currentExchangeRate.toNumber()
          },
          policies: {
              enableGlobalCredit: business.enableGlobalCredit,
              defaultCreditLimit: business.defaultCreditLimit.toNumber()
          }
      };

      return {
        status: 200,
        message: 'Configuración recuperada',
        data: settingsDTO
      };

    } catch (error) {
        console.error(error);
        return { status: 500, message: 'Error al obtener configuración', data: null };
    }
  }

  // Helper privado para verificar si el usuario pertenece al negocio
  private async verifyAccess(
    businessId: number,
    userId: number,
    options?: { roleCodes?: string[]; permission?: BusinessPermissionCode }
  ) {
    try {
      const member = await prisma.businessMember.findFirst({
        where: { businessId, userId, isActive: true },
        include: {
          role: { select: { code: true, name: true } },
          user: { select: { isSuperAdmin: true } }
        }
      });

      if (!member) {
        return {
          message: 'No tienes permisos para modificar esta empresa.',
          status: 403,
          data: null
        };
      }

      if (options?.permission) {
        const allowedByPermission = canAccessBusinessPermission(
          member.role.code,
          options.permission,
          member.user.isSuperAdmin
        );

        if (!allowedByPermission) {
          return {
            message: 'No tienes permisos para realizar esta acción en esta empresa.',
            status: 403,
            data: null
          };
        }
      }

      if (options?.roleCodes?.length) {
        const allowed = options.roleCodes;
        if (!allowed.includes(member.role.code)) {
          return {
            message: 'No tienes permisos para realizar esta acción en esta empresa.',
            status: 403,
            data: null
          };
        }
      }

      return {
        message: 'Acceso verificado',
        status: 200,
        data: member
      };
    } catch (error) {
      console.error('Error al verificar acceso:', error);
      return {
        message: 'Error al verificar permisos',
        status: 500,
        data: null
      };
    }
  }
}