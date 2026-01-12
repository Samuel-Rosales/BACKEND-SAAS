import { body, param, ValidationChain } from 'express-validator';

export class CashRegisterValidator {
  
    public validateOpen: ValidationChain[] = [
        
        body('memberId')
        .isInt().withMessage('El ID del miembro debe ser un número entero'),

        body('initialAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('El monto inicial debe ser un número positivo o cero')
        .toFloat(),
    ];

    public validateClose: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('finalAmount')
        .optional()
        .isFloat({ min: 0 }).withMessage('El monto final debe ser un número positivo o cero')
        .toFloat(),

        body('closeTime')
        .optional()
        .isISO8601().withMessage('La fecha de cierre debe ser una fecha válida (ISO 8601)')
        .toDate(),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
