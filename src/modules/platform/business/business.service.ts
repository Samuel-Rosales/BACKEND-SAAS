import { prisma } from '@/configs';
import { CreateBusinessInterface, UpdateBusinessInterface } from './interfaces';
import { PlanType, SubStatus } from '@prisma/client'; // Importamos Enums de Prisma

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
          subscription: {
            select: { status: true, planType: true, endDate: true }
          }
        }
      });

      return {
        message: 'Negocios obtenidos exitosamente',
        status: 200,
        data: businesses
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
            some: { userId: userId } // Seguridad: Solo si pertenezco a ella
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