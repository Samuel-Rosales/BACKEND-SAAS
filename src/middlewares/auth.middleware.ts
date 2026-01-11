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
  // 1. Obtener el header "Authorization: Bearer <token>"
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'No autorizado. Token faltante.' });
  }

  const token = authHeader.split(' ')[1];

  try {
    // 2. Verificar el token
    const decoded: any = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({ message: 'Token inválido o expirado.' });
    }

    // 3. (Opcional pero recomendado) Verificar que el usuario siga existiendo en DB
    const user = await prisma.user.findUnique({ where: { id: decoded.id } });
    
    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado.' });
    }

    // 4. Inyectar usuario en la request
    req.user = user;
    
    // 5. IMPORTANTE: Manejo del businessId (Header "x-business-id")
    // En un SaaS, el frontend debe enviar en qué empresa está trabajando el usuario
    const businessIdHeader = req.headers['x-business-id'];
    
    if (businessIdHeader) {
        // Inyectamos el businessId para que los controladores lo usen
        req.user.businessId = Number(businessIdHeader);
    }

    next();
  } catch (error) {
    res.status(401).json({ message: 'No autorizado.' });
  }
};