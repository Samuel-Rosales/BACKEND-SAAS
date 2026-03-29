import {
  BusinessPermissionCode,
  hasBusinessPermission,
  ROLE_PERMISSIONS,
  RoleCode,
} from "@/data/aim/role-permissions.data";

export const getRolePermissions = (roleCode: string): BusinessPermissionCode[] => {
  const normalizedRoleCode = roleCode.trim().toUpperCase() as RoleCode;
  const permissions = ROLE_PERMISSIONS[normalizedRoleCode] || [];
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
