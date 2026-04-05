import { body, param, ValidationChain } from 'express-validator';
import { Currency, PlanType } from '@prisma/client';

export class SubscriptionPaymentValidator {
  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
  ];

  public validateCreate: ValidationChain[] = [
    body('planType')
      .notEmpty().withMessage('El planType es obligatorio')
      .isIn(Object.values(PlanType)).withMessage('planType inválido'),

    body('monthsPurchased')
      .notEmpty().withMessage('monthsPurchased es obligatorio')
      .isInt({ min: 1, max: 12 }).withMessage('monthsPurchased debe estar entre 1 y 12')
      .toInt(),

    body('amount')
      .notEmpty().withMessage('El monto es obligatorio')
      .isFloat({ min: 0.01 }).withMessage('El monto debe ser mayor a 0')
      .toFloat(),

    body('currency')
      .notEmpty().withMessage('La moneda es obligatoria')
      .isIn(Object.values(Currency)).withMessage('currency inválido'),

    body('reference')
      .trim()
      .notEmpty().withMessage('La referencia es obligatoria')
      .isString().withMessage('La referencia debe ser texto')
      .isLength({ min: 3, max: 80 }).withMessage('La referencia debe tener entre 3 y 80 caracteres'),

    body('proofUrl')
      .optional({ checkFalsy: true })
      .trim()
      .isURL().withMessage('proofUrl debe ser una URL válida'),

    body('reviewNote')
      .optional({ checkFalsy: true })
      .trim()
      .isString().withMessage('reviewNote debe ser texto')
      .isLength({ max: 500 }).withMessage('reviewNote máximo 500 caracteres'),
  ];
}
