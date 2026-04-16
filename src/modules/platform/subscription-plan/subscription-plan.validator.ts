import { body, param, ValidationChain } from 'express-validator';
import { PlanType } from '@prisma/client';

export class SubscriptionPlanValidator {
  public validateId: ValidationChain[] = [
    param('id').isInt().withMessage('id debe ser un número entero').toInt(),
  ];

  public validateCreate: ValidationChain[] = [
    body('code')
      .notEmpty().withMessage('code es obligatorio')
      .isIn(Object.values(PlanType)).withMessage('code inválido'),

    body('name')
      .notEmpty().withMessage('name es obligatorio')
      .isString().withMessage('name debe ser texto')
      .isLength({ max: 100 }).withMessage('name máximo 100 caracteres'),

    body('description')
      .optional()
      .isString().withMessage('description debe ser texto')
      .isLength({ max: 500 }).withMessage('description máximo 500 caracteres'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser boolean')
      .toBoolean(),

    body('priceMonthly')
      .optional()
      .isFloat({ min: 0 }).withMessage('priceMonthly debe ser un número >= 0')
      .toFloat(),

    body('entitlements')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null) return true;
        if (typeof value !== 'object') {
          throw new Error('entitlements debe ser un objeto JSON');
        }
        return true;
      }),
  ];

  public validateUpdate: ValidationChain[] = [
    ...this.validateId,

    body('name')
      .optional()
      .isString().withMessage('name debe ser texto')
      .isLength({ max: 100 }).withMessage('name máximo 100 caracteres'),

    body('description')
      .optional({ nullable: true })
      .isString().withMessage('description debe ser texto')
      .isLength({ max: 500 }).withMessage('description máximo 500 caracteres'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser boolean')
      .toBoolean(),

    body('priceMonthly')
      .optional()
      .isFloat({ min: 0 }).withMessage('priceMonthly debe ser un número >= 0')
      .toFloat(),

    body('entitlements')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null) return true;
        if (typeof value !== 'object') {
          throw new Error('entitlements debe ser un objeto JSON');
        }
        return true;
      }),
  ];

  public validatePriceUpsert: ValidationChain[] = [
    ...this.validateId,

    body('months')
      .notEmpty().withMessage('months es obligatorio')
      .isInt().withMessage('months debe ser entero')
      .toInt()
      .isIn([1, 3, 6, 12]).withMessage('months debe ser uno de: 1, 3, 6, 12'),

    body('price')
      .notEmpty().withMessage('price es obligatorio')
      .isFloat({ min: 0 }).withMessage('price debe ser un número >= 0')
      .toFloat(),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser boolean')
      .toBoolean(),
  ];
}
