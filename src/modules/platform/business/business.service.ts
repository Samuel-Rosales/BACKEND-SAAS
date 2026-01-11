import { prisma } from '@/configs';
import { CreateBusinessDto, UpdateBusinessDto } from './interfaces';
import { PlanType, SubStatus } from '@prisma/client'; // Importamos Enums de Prisma

export class BusinessService {

  // 1. CREAR NEGOCIO + SUSCRIPCIÓN + MIEMBRO ADMIN
  async create(userId: number, data: CreateBusinessDto) {
    
    return await prisma.$transaction(async (tx) => {
      // A. Buscar el rol de ADMIN para asignarlo
      // (Si no tienes seeds, esto fallará. Asegúrate de tener roles en DB)
      const adminRole = await tx.role.findUnique({
        where: { code: 'ADMIN' } 
      });

      if (!adminRole) {
        throw new Error('Error interno: El rol ADMIN no está configurado en el sistema.');
      }

      // B. Crear el Negocio
      const newBusiness = await tx.business.create({
        data: {
          name: data.name,
          currencySymbol: data.currencySymbol || '$',
          address: data.address,
          logoUrl: data.logoUrl,
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
              endDate: new Date(new Date().setDate(new Date().getDate() + 14)), // 14 días de prueba
              lastPaymentRef: 'TRIAL_START'
            }
          }
        },
        include: {
          subscription: true // Devolvemos la info de suscripción creada
        }
      });

      return newBusiness;
    });
  }

  // 2. LISTAR NEGOCIOS DEL USUARIO (Mis Empresas)
  async findAllByUser(userId: number) {
    return await prisma.business.findMany({
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
  }

  // 3. OBTENER UN NEGOCIO (Validando pertenencia)
  async findOne(businessId: number, userId: number) {
    const business = await prisma.business.findFirst({
      where: {
        id: businessId,
        members: {
          some: { userId: userId } // Seguridad: Solo si pertenezco a ella
        }
      },
      include: {
        members: {
          include: { user: { select: { name: true, email: true } } }
        }
      }
    });

    if (!business) throw new Error('Empresa no encontrada o no tienes acceso.');
    return business;
  }

  // 4. ACTUALIZAR DATOS
  async update(businessId: number, userId: number, data: UpdateBusinessDto) {
    // Primero verificamos acceso (podrías mover esto a un middleware de permisos más adelante)
    await this.verifyAccess(businessId, userId);

    return await prisma.business.update({
      where: { id: businessId },
      data: data
    });
  }

  // Helper privado para verificar si el usuario pertenece al negocio
  private async verifyAccess(businessId: number, userId: number) {
    const member = await prisma.businessMember.findFirst({
      where: { businessId, userId, isActive: true }
    });
    if (!member) throw new Error('No tienes permisos para modificar esta empresa.');
  }
}