import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt.util';
import { prisma } from '@/configs';
import { HashId } from '@/utils/hash-id';

// Extendemos la interfaz de Express para que req.user exista
declare global {
  namespace Express {
    interface Request {
      user?: any; // Aquí guardaremos los datos del usuario decodificado
    }
  }
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado. Token faltante.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded: any = verifyToken(token);
    if (!decoded) return res.status(401).json({ message: 'Token inválido.' });

    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    if (!user) return res.status(401).json({ message: 'Usuario no encontrado.' });

    req.user = user;

    const businessIdHeader = req.headers['x-business-id'];
    console.log(`Valor del header x-business-id: ${businessIdHeader}`);
    
    if (businessIdHeader && typeof businessIdHeader === 'string') {
      const hashId = new HashId();
      const businessId = Number(hashId.decode(businessIdHeader));
      console.log(`Decoded business ID from header: ${businessId}`);

      // Validamos que sea un número válido
      if (isNaN(businessId)) {
        return res.status(400).json({ message: 'Header x-business-id inválido' });
      }

      // Aseguramos que el negocio exista
      const businessExists = await prisma.business.findUnique({ where: { id: businessId }, select: { id: true } });
      if (!businessExists) {
        return res.status(404).json({ message: 'Negocio no encontrado.' });
      }

      // Intentamos resolver membresía (para obtener roleId/membershipId cuando aplique)
      const membership = await prisma.businessMember.findFirst({
        where: {
          userId: user.id,
          businessId: businessId,
          isActive: true,
        },
      });

      // Si NO hay membresía:
      // - Super admin: permitimos seleccionar el negocio, pero sin membershipId/roleId.
      // - Usuario normal: 403.
      if (!membership && !user.isSuperAdmin) {
        return res.status(403).json({ message: 'No tienes acceso a esta empresa.' });
      }

      // Inyectamos el ID seguro del negocio
      req.user.businessId = businessId;

      // Inyectamos datos de membresía solo si existe
      if (membership) {
        req.user.roleId = membership.roleId;
        req.user.membershipId = membership.id;
      }
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'No autorizado.' });
  }
};