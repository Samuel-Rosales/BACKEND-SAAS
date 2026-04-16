import { body, param, ValidationChain } from 'express-validator';
import { Currency, PlanType } from '@prisma/client';
import { prisma } from '@/configs';

export class SubscriptionPaymentValidator {
  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
  ];

  public validateCreate: ValidationChain[] = [
    body('planType')
      .optional()
      .isIn(Object.values(PlanType)).withMessage('planType inválido'),

    body('planId')
      .optional()
      .isInt().withMessage('planId debe ser un número entero')
      .toInt()
      .custom(async (planId) => {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
        if (!plan || !plan.isActive) {
          throw new Error('planId inválido');
        }
        return true;
      }),

    body().custom((_, { req }) => {
      if (!req.body.planId && !req.body.planType) {
        throw new Error('Debe enviar planId o planType');
      }
      return true;
    }),
    body('monthsPurchased')
      .notEmpty().withMessage('monthsPurchased es obligatorio')
      .isInt().withMessage('monthsPurchased debe ser un entero')
      .isIn([1, 3, 6, 12]).withMessage('monthsPurchased debe ser uno de: 1, 3, 6, 12')
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
