import { body, param, ValidationChain } from 'express-validator';

export class ExpenseCategoryValidator {
  public validateCreate: ValidationChain[] = [
    body('name')
      .isString().withMessage('El nombre debe ser una cadena de texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),

    body('description')
      .optional({ nullable: true })
      .isString().withMessage('La descripción debe ser texto')
      .isLength({ max: 255 }).withMessage('La descripción no puede exceder 255 caracteres')
      .trim(),

    body('color')
      .optional({ nullable: true })
      .isString().withMessage('El color debe ser texto')
      .isLength({ max: 30 }).withMessage('El color no puede exceder 30 caracteres')
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

    body('description')
      .optional({ nullable: true })
      .isString().withMessage('La descripción debe ser texto')
      .isLength({ max: 255 }).withMessage('La descripción no puede exceder 255 caracteres')
      .trim(),

    body('color')
      .optional({ nullable: true })
      .isString().withMessage('El color debe ser texto')
      .isLength({ max: 30 }).withMessage('El color no puede exceder 30 caracteres')
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
