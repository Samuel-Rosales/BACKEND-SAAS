import { prisma } from '@/configs';

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
}
