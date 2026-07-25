import { prisma } from '@/configs';
import bcrypt from 'bcryptjs';

export type AdminUserListParams = {
  page?: number;
  limit?: number;
  q?: string;
  isSuperAdmin?: boolean;
};

export class UserAdminService {
  /**
   * GET /api/v1/admin/users
   */
  async list(params: AdminUserListParams) {
    try {
      const page = Math.max(1, Number(params.page ?? 1) || 1);
      const limit = Math.min(200, Math.max(1, Number(params.limit ?? 50) || 50));
      const skip = (page - 1) * limit;

      const q = params.q?.trim();

      const where = {
        ...(typeof params.isSuperAdmin === 'boolean' ? { isSuperAdmin: params.isSuperAdmin } : {}),
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' as const } },
                { ci: { contains: q, mode: 'insensitive' as const } },
                {
                  contacts: {
                    is: { email: { contains: q, mode: 'insensitive' as const } },
                  },
                },
              ],
            }
          : {}),
      } as const;

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { id: 'desc' },
          select: {
            id: true,
            ci: true,
            name: true,
            isSuperAdmin: true,
            contacts: {
              select: {
                email: true,
                phone: true,
              },
            },
            memberships: {
              where: { isActive: true },
              select: {
                id: true,
                business: { select: { id: true, name: true } },
                role: { select: { id: true, name: true, code: true } },
              },
            },
          },
        }),
        prisma.user.count({ where }),
      ]);

      const normalized = users.map((user) => {
        const membershipCount = user.memberships?.length ?? 0;
        const roleCodes = Array.from(
          new Set(user.memberships.map((m) => m.role?.code).filter(Boolean) as string[]),
        );

        return {
          ...user,
          activeMembershipsCount: membershipCount,
          roleCodes,
        };
      });

      return {
        message: 'Usuarios obtenidos exitosamente',
        status: 200,
        data: {
          users: normalized,
          pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
          },
        },
      };
    } catch (error) {
      console.error('UserAdminService.list error:', error);
      return {
        message: 'Error al obtener usuarios',
        status: 500,
        data: null,
      };
    }
  }

  /**
   * POST /api/v1/admin/users/:id/reset-password
   */
  async resetPassword(id: number) {
    try {
      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, name: true, ci: true },
      });

      if (!user) {
        return {
          message: 'Usuario no encontrado',
          status: 404,
          data: null,
        };
      }

      if (!user.ci) {
        return {
          message: 'El usuario no posee cédula de identidad registrada para resetear la contraseña',
          status: 400,
          data: null,
        };
      }

      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(user.ci, salt);

      await prisma.user.update({
        where: { id },
        data: { password: hashedPassword },
      });

      return {
        message: `La contraseña del usuario ${user.name} ha sido reseteada a su cédula (${user.ci})`,
        status: 200,
        data: { id: user.id, ci: user.ci },
      };
    } catch (error) {
      console.error('UserAdminService.resetPassword error:', error);
      return {
        message: 'Error al resetear la contraseña del usuario',
        status: 500,
        data: null,
      };
    }
  }
}

