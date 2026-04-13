import { body, param, ValidationChain } from 'express-validator';

export class PaymentMethodValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('name')
        .isString().withMessage('El nombre debe ser una cadena de texto')
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .trim(),

        body('currency')
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isIn(['USD', 'VES'])
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe tener 3 caracteres')
        .trim(),

        body('type')
        .isIn(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'OTHER'])
        .withMessage('El tipo debe ser: CASH, DEBIT_CARD, CREDIT_CARD, TRANSFER, MOBILE_PAYMENT, ZELLE u OTHER'),

        body('isActive')
        .optional()
        .isBoolean().withMessage('isActive debe ser un valor booleano')
        .toBoolean(),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),

        body('currency')
        .optional()
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isIn(['USD', 'VES'])
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe tener 3 caracteres')
        .trim(),
        
        body('type')
        .optional()
        .isIn(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'OTHER'])
        .withMessage('El tipo debe ser: CASH, DEBIT_CARD, CREDIT_CARD, TRANSFER, MOBILE_PAYMENT, ZELLE u OTHER'),

        body('isActive')
        .optional()
        .isBoolean().withMessage('isActive debe ser un valor booleano')
        .toBoolean(),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
