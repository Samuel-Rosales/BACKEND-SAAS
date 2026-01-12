import { body, param, ValidationChain } from 'express-validator';

export class StockLotValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('productId')
        .isInt().withMessage('El ID del producto debe ser un número entero'),

        body('depotId')
        .isInt().withMessage('El ID del depósito debe ser un número entero'),

        body('quantity')
        .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero positivo mayor a cero'),

        body('expirationDate')
        .isISO8601().withMessage('La fecha de vencimiento debe ser una fecha válida (ISO 8601)')
        .toDate(),

        body('lotCost')
        .isFloat({ min: 0 }).withMessage('El costo del lote debe ser un número positivo'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo o cero'),

        body('expirationDate')
        .optional()
        .isISO8601().withMessage('La fecha de vencimiento debe ser una fecha válida (ISO 8601)')
        .toDate(),

        body('lotCost')
        .optional()
        .isFloat({ min: 0 }).withMessage('El costo del lote debe ser un número positivo'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateProductId: ValidationChain[] = [

        param('productId').isInt().toInt().withMessage('ID de producto inválido')
    ];
}
