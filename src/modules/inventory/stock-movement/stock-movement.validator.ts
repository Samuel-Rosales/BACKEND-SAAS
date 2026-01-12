import { body, param, ValidationChain } from 'express-validator';
import { MovementType } from '@prisma/client';

export class StockMovementValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('productId')
        .isInt().withMessage('El ID del producto debe ser un número entero'),

        body('memberId')
        .isInt().withMessage('El ID del miembro debe ser un número entero'),

        body('depotId')
        .isInt().withMessage('El ID del depósito debe ser un número entero'),

        body('type')
        .isIn(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'])
        .withMessage('El tipo de movimiento debe ser: IN, OUT, ADJUSTMENT, TRANSFER o RETURN'),

        body('quantity')
        .isInt().withMessage('La cantidad debe ser un número entero')
        .notEmpty().withMessage('La cantidad es requerida'),

        body('reason')
        .optional()
        .isString().withMessage('La razón debe ser una cadena de texto')
        .isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres'),

        body('date')
        .optional()
        .isISO8601().withMessage('La fecha debe ser una fecha válida (ISO 8601)')
        .toDate(),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('type')
        .optional()
        .isIn(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'])
        .withMessage('El tipo de movimiento debe ser: IN, OUT, ADJUSTMENT, TRANSFER o RETURN'),

        body('quantity')
        .optional()
        .isInt().withMessage('La cantidad debe ser un número entero'),

        body('reason')
        .optional()
        .isString().withMessage('La razón debe ser una cadena de texto')
        .isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres'),

        body('date')
        .optional()
        .isISO8601().withMessage('La fecha debe ser una fecha válida (ISO 8601)')
        .toDate(),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateProductId: ValidationChain[] = [

        param('productId').isInt().toInt().withMessage('ID de producto inválido')
    ];

    public validateDepotId: ValidationChain[] = [

        param('depotId').isInt().toInt().withMessage('ID de depósito inválido')
    ];

    public validateType: ValidationChain[] = [

        param('type')
        .isIn(['IN', 'OUT', 'ADJUSTMENT', 'TRANSFER', 'RETURN'])
        .withMessage('Tipo de movimiento inválido')
    ];
}
