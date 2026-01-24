import { prisma } from '@/configs';
import { CreateBusinessInterface, UpdateBusinessInterface, UpdateExchangeConfigInterface } from './interfaces';
import { PlanType, SubStatus, ExchangeRateStrategy } from '@prisma/client'; // Importamos Enums de Prisma
import { BusinessError } from '@/utils';

export class BusinessService {

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
                status: SubStatus.ACTIVE,
                startDate: new Date(),
                endDate: new Date(new Date().setDate(new Date().getDate() + 7)), // 7 días de prueba
                lastPaymentRef: 'TRIAL_START'
              }
            }
          },
          include: {
            subscription: true // Devolvemos la info de suscripción creada
          }
        });

        return {
          message: 'Negocio creado exitosamente',
          status: 201,
          data: newBusiness
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
        return {  
          ...business,
          memberRole: memberRole
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

  // 3. OBTENER UN NEGOCIO (Validando pertenencia)
  async findOne(businessId: number, userId: number) {

    try {

      const business = await prisma.business.findFirst({
        where: {
          id: businessId,
          members: {
            some: { userId: userId, isActive: true } // Seguridad: Solo si pertenezco a ella
          }
        },
        include: {
          members: {
            include: { user: { select: { name: true, ci: true } } }
          }
        }
      });

      if (!business) {
        return {
          message: 'Empresa no encontrada o no tienes acceso.',
          status: 404,
          data: null
        };
      }

      return {
        message: 'Empresa obtenida exitosamente',
        status: 200,
        data: business
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
  async update(businessId: number, userId: number, data: UpdateBusinessInterface) {
    
    try {
      // Primero verificamos acceso (podrías mover esto a un middleware de permisos más adelante)
      const member = await this.verifyAccess(businessId, userId);

      if (member && member.status !== 200) {
        return member;
      }

      const updatedBusiness = await prisma.business.update({
        where: { id: businessId },
        data: data
      });

      if (!updatedBusiness) {
        return {
          message: 'No se pudo actualizar la empresa.',
          status: 400,
          data: null
        };
      }

      return {
        message: 'Empresa actualizada exitosamente',
        status: 200,
        data: updatedBusiness
      };

    } catch (error) {
      console.error('Error al actualizar la empresa:', error);

      return {
        message: 'Por favor contacte al administrador',
        status: 500,
        data: null
      };
    }
  }

  async updateExchangeRateConfig( businessId: number, userId: number, data: UpdateExchangeConfigInterface ) {
    try {
      // A. Verificación de seguridad (Solo dueños o admins deberían tocar dinero)
      // Reutilizamos tu método privado verifyAccess
      const accessCheck = await this.verifyAccess(businessId, userId);
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
          
          // NOTA: Aquí NO creamos un registro en ExchangeRate. 
          // El negocio simplemente se "suscribe" a la tasa global existente.
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
            currentRate: updatedBusiness.currentExchangeRate
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

  // Helper privado para verificar si el usuario pertenece al negocio
  private async verifyAccess(businessId: number, userId: number) {
    try {
      const member = await prisma.businessMember.findFirst({
        where: { businessId, userId, isActive: true }
      });

      if (!member) {
        return {
          message: 'No tienes permisos para modificar esta empresa.',
          status: 403,
          data: null
        };
      }

      return {
        message: 'Acceso verificado',
        status: 200,
        data: null
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