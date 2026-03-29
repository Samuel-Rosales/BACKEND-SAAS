import {
  BusinessPermissionCode,
  hasBusinessPermission,
  ROLE_PERMISSIONS,
  RoleCode,
} from "@/data/aim/role-permissions.data";

export const getRolePermissions = (roleCode: string): BusinessPermissionCode[] => {
  const permissions = ROLE_PERMISSIONS[roleCode as RoleCode] || [];
  return [...permissions];
};

export const canAccessBusinessPermission = (
  roleCode: string,
  permission: BusinessPermissionCode,
  isSuperAdmin = false
): boolean => {
  if (isSuperAdmin) return true;
  return hasBusinessPermission(roleCode, permission);
};
