import type { BusinessPermissionCode } from "@/data/aim/role-permissions.data";
import { permissionService } from "@/modules/aim/permission/permission.service";

export const getRolePermissions = async (
  roleCode: string
): Promise<BusinessPermissionCode[]> => {
  return permissionService.getRolePermissions(roleCode);
};

export const canAccessBusinessPermission = async (
  roleCode: string,
  permission: BusinessPermissionCode,
  isSuperAdmin = false
): Promise<boolean> => {
  return permissionService.canAccess(roleCode, permission, isSuperAdmin);
};
