import { body, param, ValidationChain } from 'express-validator';

export class ExchangeRateValidator {
  
    public validateCreate: ValidationChain[] = [
        body('rate')
        .isFloat({ min: 0 }).withMessage('La tasa debe ser un número positivo')
        .toFloat(),

        body('source')
        .optional()
        .isIn(['MANUAL', 'API_BCV', 'API_PARALLEL']).withMessage('La fuente debe ser MANUAL, API_BCV o API_PARALLEL'),

        body('isActive')
        .optional()
        .isBoolean().withMessage('isActive debe ser boolean')
        .toBoolean(),

        body('createdAt')
        .optional()
        .isISO8601().withMessage('createdAt debe ser una fecha ISO válida')
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),

        body('rate')
        .optional()
        .isFloat({ min: 0 }).withMessage('La tasa debe ser un número positivo')
        .toFloat(),

        body('source')
        .optional()
        .isIn(['MANUAL', 'API_BCV', 'API_PARALLEL']).withMessage('La fuente debe ser MANUAL, API_BCV o API_PARALLEL'),

        body('isActive')
        .optional()
        .isBoolean().withMessage('isActive debe ser boolean')
        .toBoolean(),

        body('createdAt')
        .optional()
        .isISO8601().withMessage('createdAt debe ser una fecha ISO válida')
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
