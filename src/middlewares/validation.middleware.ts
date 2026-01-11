import { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Error de validación',
      errors: errors.array(), // Devuelve la lista detallada de qué falló
    });
  }

  next();
};