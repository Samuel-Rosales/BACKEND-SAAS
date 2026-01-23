import { body, param, ValidationChain } from 'express-validator';

export class ExchangeRateValidator {
  
    public validateCreate: ValidationChain[] = [
        
        /*body('currency')
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código ISO de 3 caracteres (ej: USD, VES)')
        .matches(/^[A-Z]{3}$/).withMessage('La moneda debe ser un código ISO válido en mayúsculas'),*/

        body('rate')
        .isFloat({ min: 0 }).withMessage('La tasa debe ser un número positivo')
        .toFloat(),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('currency')
        .optional()
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isIn(['USD', 'VES']).withMessage('La moneda debe ser USD o VES'),

        body('rate')
        .optional()
        .isFloat({ min: 0 }).withMessage('La tasa debe ser un número positivo')
        .toFloat(),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateCurrency: ValidationChain[] = [

        param('currency')
        .isString().withMessage('La moneda debe ser una cadena de texto')
        .isIn(['USD', 'VES']).withMessage('La moneda debe ser USD o VES')
        .isLength({ min: 3, max: 3 }).withMessage('La moneda debe ser un código ISO de 3 caracteres')
        .matches(/^[A-Z]{3}$/).withMessage('La moneda debe ser un código ISO válido en mayúsculas')
    ];
}
