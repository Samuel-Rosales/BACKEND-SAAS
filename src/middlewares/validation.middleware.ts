import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // 1. Obtenemos el array completo de errores
    const errorsArray = errors.array();

    // 2. Extraemos el mensaje del PRIMER error encontrado
    const firstErrorMessage = errorsArray[0].msg;

    return res.status(400).json({
      message: firstErrorMessage, // <--- AQUÍ ESTÁ EL CAMBIO: Ahora dice "Ya tienes un proveedor..."
      errors: errorsArray,        // Mantienes la lista completa por si la necesitas para debugging
    });
  }

  next();
};