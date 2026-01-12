import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class StockGeneralValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('productId')
        .isInt().withMessage('El ID del producto debe ser un número entero'),

        body('depotId')
        .isInt().withMessage('El ID del depósito debe ser un número entero'),

        body('quantity')
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo o cero'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('productId').isInt().toInt().withMessage('ID de producto inválido'),
        param('depotId').isInt().toInt().withMessage('ID de depósito inválido'),
        
        body('quantity')
        .optional()
        .isInt({ min: 0 }).withMessage('La cantidad debe ser un número entero positivo o cero'),
    ];

    public validateProductAndDepot: ValidationChain[] = [

        param('productId').isInt().toInt().withMessage('ID de producto inválido'),
        param('depotId').isInt().toInt().withMessage('ID de depósito inválido')
    ];
}
