import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '@/utils/jwt.util';
import { prisma } from '@/configs';

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

    if (businessIdHeader) {
        const businessId = Number(businessIdHeader);

        // Validamos que sea un número válido
        if (isNaN(businessId)) {
             return res.status(400).json({ message: 'Header x-business-id inválido' });
        }

        // VERIFICAMOS PERTENENCIA: ¿Este usuario trabaja en esta empresa?
        const membership = await prisma.businessMember.findFirst({
            where: {
                userId: user.id,
                businessId: businessId,
                isActive: true // Solo si sigue activo
            }
        });

        if (!membership) {
            return res.status(403).json({ message: 'No tienes acceso a esta empresa.' });
        }

        // Si pasa, inyectamos el ID seguro y el ROL (muy útil para permisos después)
        req.user.businessId = businessId;
        req.user.roleId = membership.roleId; 
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'No autorizado.' });
  }
};