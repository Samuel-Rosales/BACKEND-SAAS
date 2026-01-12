import { body, param, ValidationChain } from 'express-validator';

export class CashCountValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('cashRegisterId')
        .isInt().withMessage('El ID de la caja debe ser un número entero'),

        body('denomination')
        .isFloat({ min: 0 }).withMessage('La denominación debe ser un número positivo')
        .toFloat(),

        body('quantity')
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo o cero'),

        body('currency')
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código ISO de 3 caracteres')
        .matches(/^[A-Z]{3}$/).withMessage('La moneda debe ser un código ISO válido en mayúsculas'),

        body('exchangeRateId')
        .isInt().withMessage('El ID de la tasa de cambio debe ser un número entero'),

        body('type')
        .isIn(['INITIAL', 'FINAL', 'AUDIT'])
        .withMessage('El tipo debe ser: INITIAL, FINAL o AUDIT'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('denomination')
        .optional()
        .isFloat({ min: 0 }).withMessage('La denominación debe ser un número positivo')
        .toFloat(),

        body('quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo o cero'),

        body('currency')
        .optional()
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código ISO de 3 caracteres')
        .matches(/^[A-Z]{3}$/).withMessage('La moneda debe ser un código ISO válido en mayúsculas'),

        body('exchangeRateId')
        .optional()
        .isInt().withMessage('El ID de la tasa de cambio debe ser un número entero'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateCashRegisterId: ValidationChain[] = [

        param('cashRegisterId').isInt().toInt().withMessage('ID de caja inválido')
    ];
}
