import { body, ValidationChain } from 'express-validator';

export class AuthValidator {

  public validateAuth: ValidationChain[] = [
    body('ci')
      .trim()
      .notEmpty().withMessage('La cédula es requerida')
      .isString().withMessage('La cédula debe ser texto')
      .matches(/^\d{6,10}$/).withMessage('La cédula debe contener solo números (entre 6 y 10 dígitos)'),

    body('password')
      .notEmpty().withMessage('La contraseña es requerida')
      .isString().withMessage('La contraseña debe ser texto')
      .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),
  ];
}