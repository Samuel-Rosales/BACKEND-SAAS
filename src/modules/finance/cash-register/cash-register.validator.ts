import { body, param, ValidationChain } from 'express-validator';

export class CashRegisterValidator {
  
    public validateOpen: ValidationChain[] = [
        // body('memberId').isInt().withMessage('ID de miembro requerido'),
        
        body('initialAmount')
            .isFloat({ min: 0 }).withMessage('Monto inicial debe ser >= 0')
            .toFloat(),

        // Validación Opcional de Array de Billetes (Apertura)
        body('denominations').optional().isArray().withMessage('Debe ser un arreglo de denominaciones'),
        body('denominations.*.denomination').isFloat().withMessage('Denominación inválida'),
        body('denominations.*.quantity').isInt({ min: 1 }).withMessage('Cantidad inválida'),
        body('denominations.*.currency').isIn(['USD', 'VES']).withMessage('Moneda inválida'),
        body('denominations.*.exchangeRateId').isInt().withMessage('ID de tasa requerido')
    ];

    public validateClose: ValidationChain[] = [
        param('id').isInt().toInt(),

        body('finalAmount')
            .isFloat({ min: 0 }).withMessage('Monto final requerido')
            .toFloat(),
        
        // Validación OBLIGATORIA de Array de Billetes (Cierre)
        // Un cierre serio requiere conteo físico explícito
        body('counts').isArray({ min: 1 }).withMessage('Debes registrar el conteo de billetes para cerrar'),
        
        body('counts.*.denomination').isFloat().withMessage('Denominación inválida'),
        body('counts.*.quantity').isInt({ min: 1 }).withMessage('Cantidad debe ser entero positivo'),
        body('counts.*.currency').isIn(['USD', 'VES']).withMessage('Moneda inválida'),
        body('counts.*.exchangeRateId').isInt().withMessage('Tasa de cambio requerida para el conteo')
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt()
    ];
}