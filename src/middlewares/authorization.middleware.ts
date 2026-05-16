import { prisma } from "@/configs";
import { BusinessPermissionCode } from "@/data/aim/role-permissions.data";
import { canAccessBusinessPermission } from "@/utils";
import { HashId } from "@/utils/hash-id";
import { NextFunction, Request, Response } from "express";

const resolveBusinessId = (req: Request): number | null => {
  if (req.user?.businessId) {
    return Number(req.user.businessId);
  }

  const headerValue = req.headers["x-business-id"];
  console.log(`Valor del header x-business-id en resolveBusinessId: ${headerValue}`);
  if (!headerValue) return null;

  const hashId = new HashId();
  const decoded = hashId.decode(String(headerValue));
  const businessId = Number(decoded);
  return Number.isNaN(businessId) ? null : businessId;
};

export const requireBusinessPermission = (permission: BusinessPermissionCode) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "No autorizado." });
      }

      const businessId = resolveBusinessId(req);

      if (!businessId) {
        return res.status(400).json({ message: "Debes seleccionar una empresa (x-business-id)." });
      }

      const membership = await prisma.businessMember.findFirst({
        where: {
          userId: req.user.id,
          businessId,
          isActive: true,
        },
        include: {
          role: { select: { code: true } },
        },
      });

      const isSuperAdmin = Boolean(req.user?.isSuperAdmin);
      const roleCode = membership?.role?.code || "";
      const allowed = canAccessBusinessPermission(roleCode, permission, isSuperAdmin);

      if (!allowed) {
        return res.status(403).json({ message: "No tienes permisos para esta acción." });
      }

      if (membership?.role?.code) {
        req.user.roleCode = membership.role.code;
      }

      return next();
    } catch (error) {
      console.error("Error in requireBusinessPermission:", error);
      return res.status(500).json({ message: "Error al verificar permisos." });
    }
  };
};

export const requireSuperAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user?.id) {
    return res.status(401).json({ message: "No autorizado." });
  }

  if (!req.user?.isSuperAdmin) {
    return res.status(403).json({ message: "Acceso restringido a super administradores." });
  }

  return next();
};
