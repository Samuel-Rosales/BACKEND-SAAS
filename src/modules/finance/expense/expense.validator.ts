import { body, param, query, ValidationChain } from 'express-validator';

export class ExpenseValidator {
  public validateCreate: ValidationChain[] = [
    body('categoryId')
      .notEmpty().withMessage('La categoría es obligatoria')
      .isInt({ min: 1 }).withMessage('ID de categoría inválido')
      .toInt(),

    body('title')
      .notEmpty().withMessage('El concepto o título del gasto es obligatorio')
      .isString().withMessage('El título debe ser texto')
      .isLength({ min: 2, max: 200 }).withMessage('El título debe tener entre 2 y 200 caracteres')
      .trim(),

    body('amount')
      .notEmpty().withMessage('El monto es obligatorio')
      .isFloat({ gt: 0 }).withMessage('El monto debe ser un número mayor a 0')
      .toFloat(),

    body('currency')
      .optional()
      .isIn(['USD', 'VES']).withMessage('La moneda debe ser USD o VES'),

    body('expenseDate')
      .optional({ nullable: true })
      .isISO8601().withMessage('La fecha del gasto debe tener formato ISO válido'),

    body('description')
      .optional({ nullable: true })
      .isString().withMessage('La descripción debe ser texto')
      .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres')
      .trim(),

    body('beneficiary')
      .optional({ nullable: true })
      .isString().withMessage('El beneficiario debe ser texto')
      .isLength({ max: 150 }).withMessage('El beneficiario no puede exceder 150 caracteres')
      .trim(),

    body('reference')
      .optional({ nullable: true })
      .isString().withMessage('La referencia debe ser texto')
      .isLength({ max: 100 }).withMessage('La referencia no puede exceder 100 caracteres')
      .trim(),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),

    body('categoryId')
      .optional()
      .isInt({ min: 1 }).withMessage('ID de categoría inválido')
      .toInt(),

    body('title')
      .optional()
      .isString().withMessage('El título debe ser texto')
      .isLength({ min: 2, max: 200 }).withMessage('El título debe tener entre 2 y 200 caracteres')
      .trim(),

    body('amount')
      .optional()
      .isFloat({ gt: 0 }).withMessage('El monto debe ser un número mayor a 0')
      .toFloat(),

    body('currency')
      .optional()
      .isIn(['USD', 'VES']).withMessage('La moneda debe ser USD o VES'),

    body('expenseDate')
      .optional({ nullable: true })
      .isISO8601().withMessage('La fecha del gasto debe tener formato ISO válido'),

    body('description')
      .optional({ nullable: true })
      .isString().withMessage('La descripción debe ser texto')
      .isLength({ max: 500 }).withMessage('La descripción no puede exceder 500 caracteres')
      .trim(),

    body('beneficiary')
      .optional({ nullable: true })
      .isString().withMessage('El beneficiario debe ser texto')
      .isLength({ max: 150 }).withMessage('El beneficiario no puede exceder 150 caracteres')
      .trim(),

    body('reference')
      .optional({ nullable: true })
      .isString().withMessage('La referencia debe ser texto')
      .isLength({ max: 100 }).withMessage('La referencia no puede exceder 100 caracteres')
      .trim(),
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
  ];
}
