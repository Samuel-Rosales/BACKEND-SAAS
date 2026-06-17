import { body, param, ValidationChain } from 'express-validator';

const PAYMENT_TYPES = ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'OTHER'];

export class SubscriptionPaymentMethodValidator {

  public validateCreate: ValidationChain[] = [
    body('name')
      .isString().withMessage('El nombre debe ser una cadena de texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),

    body('type')
      .notEmpty().withMessage('El tipo es obligatorio')
      .isIn(PAYMENT_TYPES)
      .withMessage(`El tipo debe ser uno de: ${PAYMENT_TYPES.join(', ')}`),

    body('currency')
      .notEmpty().withMessage('La moneda es obligatoria')
      .isIn(['USD', 'VES'])
      .withMessage('La moneda debe ser USD o VES'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser un valor booleano')
      .toBoolean(),

    body('details')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null) return true;
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('details debe ser un objeto JSON');
        }
        return true;
      }),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),

    body('name')
      .optional()
      .isString().withMessage('El nombre debe ser una cadena de texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .trim(),

    body('type')
      .optional()
      .isIn(PAYMENT_TYPES)
      .withMessage(`El tipo debe ser uno de: ${PAYMENT_TYPES.join(', ')}`),

    body('currency')
      .optional()
      .isIn(['USD', 'VES'])
      .withMessage('La moneda debe ser USD o VES'),

    body('isActive')
      .optional()
      .isBoolean().withMessage('isActive debe ser un valor booleano')
      .toBoolean(),

    body('details')
      .optional({ nullable: true })
      .custom((value) => {
        if (value === null) return true;
        if (typeof value !== 'object' || Array.isArray(value)) {
          throw new Error('details debe ser un objeto JSON');
        }
        return true;
      }),
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
  ];
}
