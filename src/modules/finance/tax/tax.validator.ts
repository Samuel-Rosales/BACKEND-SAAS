import { body, param, ValidationChain } from 'express-validator';

export class TaxValidator {
  public validateCreate: ValidationChain[] = [
    body('name')
      .isString().withMessage('El nombre debe ser una cadena de texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),

    // Nota: en el sistema el rate se usa como porcentaje (16 = 16%)
    body('rate')
      .notEmpty().withMessage('La tasa es obligatoria')
      .isFloat({ min: 0, max: 100 }).withMessage('La tasa debe ser un número entre 0 y 100')
      .toFloat(),

    body('code')
      .optional({ nullable: true })
      .isString().withMessage('El código debe ser una cadena de texto')
      .isLength({ max: 50 }).withMessage('El código no puede exceder 50 caracteres')
      .trim(),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser un valor booleano')
      .toBoolean(),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),

    body('name')
      .optional()
      .isString().withMessage('El nombre debe ser una cadena de texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),

    body('rate')
      .optional()
      .isFloat({ min: 0, max: 100 }).withMessage('La tasa debe ser un número entre 0 y 100')
      .toFloat(),

    body('code')
      .optional({ nullable: true })
      .isString().withMessage('El código debe ser una cadena de texto')
      .isLength({ max: 50 }).withMessage('El código no puede exceder 50 caracteres')
      .trim(),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser un valor booleano')
      .toBoolean(),
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
  ];
}
