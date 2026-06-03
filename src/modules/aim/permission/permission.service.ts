import { prisma } from '@/configs';
import { permissionCache } from '@/utils/permission-cache';
import type { BusinessPermissionCode } from '@/data/aim/role-permissions.data';

export class PermissionService {
  async getRolePermissions(roleCode: string): Promise<BusinessPermissionCode[]> {
    const normalizedRoleCode = roleCode.trim().toUpperCase();
    if (!normalizedRoleCode) return [];

    const cached = permissionCache.get(normalizedRoleCode);
    if (cached) return cached as BusinessPermissionCode[];

    const role = await prisma.role.findUnique({
      where: { code: normalizedRoleCode },
      select: {
        permissions: {
          select: {
            permission: {
              select: { code: true },
            },
          },
        },
      },
    });

    const permissions = role?.permissions.map((item) => item.permission.code) ?? [];
    permissionCache.set(normalizedRoleCode, permissions);
    return permissions as BusinessPermissionCode[];
  }

  async canAccess(
    roleCode: string,
    permission: BusinessPermissionCode,
    isSuperAdmin = false,
  ): Promise<boolean> {
    if (isSuperAdmin) return true;

    const permissions = await this.getRolePermissions(roleCode);
    return permissions.includes(permission);
  }

  async syncRolePermissions(roleId: number, permissionCodes: string[]): Promise<void> {
    const role = await prisma.role.findUnique({
      where: { id: roleId },
      select: { code: true },
    });

    const permissions = await prisma.permission.findMany({
      where: { code: { in: permissionCodes } },
      select: { id: true },
    });

    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      prisma.rolePermission.createMany({
        data: permissions.map((perm) => ({
          roleId,
          permissionId: perm.id,
        })),
        skipDuplicates: true,
      }),
    ]);

    if (role?.code) {
      permissionCache.invalidate(role.code);
    }
  }
}

export const permissionService = new PermissionService();
