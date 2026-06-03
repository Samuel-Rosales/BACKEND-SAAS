import { body, param, query, ValidationChain } from 'express-validator';

export class OrderValidator {

    public validateCreate: ValidationChain[] = [
        body('tableId')
            .optional()
            .isInt({ min: 1 }).withMessage('ID de mesa inválido')
            .toInt(),

        body('clientId')
            .isInt({ min: 1 }).withMessage('ID de cliente inválido')
            .toInt(),

        body('notes')
            .optional()
            .trim()
            .isString()
            .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres'),

        body('items')
            .isArray({ min: 1 }).withMessage('El pedido debe tener al menos un item'),

        body('items.*.productId')
            .isInt({ min: 1 }).withMessage('ID de producto inválido')
            .toInt(),

        body('items.*.quantity')
            .isFloat({ min: 0.01 }).withMessage('La cantidad debe ser mayor a 0'),

        body('items.*.unitPrice')
            .isFloat({ min: 0 }).withMessage('El precio unitario debe ser mayor o igual a 0'),

        body('items.*.notes')
            .optional()
            .trim()
            .isString()
            .isLength({ max: 200 }).withMessage('Las notas del item no pueden exceder 200 caracteres')
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt(),

        body('status')
            .optional()
            .isIn(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
            .withMessage('Estado inválido'),

        body('notes')
            .optional()
            .trim()
            .isString()
            .isLength({ max: 500 }).withMessage('Las notas no pueden exceder 500 caracteres')
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateQuery: ValidationChain[] = [
        query('status')
            .optional()
            .isIn(['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'])
            .withMessage('Estado inválido'),

        query('tableId')
            .optional()
            .isInt({ min: 1 }).withMessage('ID de mesa inválido')
            .toInt()
    ];
}
