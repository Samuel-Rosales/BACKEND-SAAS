import { body, param, query } from 'express-validator';

export class QuotationValidator {
    public validateCreate = [
        body('clientId')
            .isInt({ min: 1 })
            .withMessage('El ID de cliente es obligatorio y debe ser un número entero válido'),

        body('items')
            .isArray({ min: 1 })
            .withMessage('La cotización debe tener al menos un producto'),

        body('items.*.productId')
            .isInt({ min: 1 })
            .withMessage('El ID del producto es obligatorio'),

        body('items.*.quantity')
            .isFloat({ min: 0.0001 })
            .withMessage('La cantidad debe ser mayor a 0'),

        body('items.*.productPresentationId')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('ID de presentación inválido'),

        body('items.*.price')
            .optional({ nullable: true })
            .isFloat({ min: 0 })
            .withMessage('El precio debe ser un número positivo'),

        body('discount')
            .optional({ nullable: true })
            .isFloat({ min: 0 })
            .withMessage('El descuento debe ser un número positivo'),

        body('notes')
            .optional({ nullable: true })
            .isString()
            .withMessage('Las notas deben ser texto'),

        body('validUntil')
            .optional({ nullable: true })
            .isISO8601()
            .withMessage('La fecha de vencimiento debe tener formato ISO8601 válido')
    ];

    public validateStatus = [
        param('id')
            .isInt({ min: 1 })
            .withMessage('El ID de la cotización debe ser un número entero'),

        body('status')
            .isIn(['PENDING', 'APPROVED', 'REJECTED', 'CONVERTED', 'EXPIRED'])
            .withMessage('Estado inválido. Debe ser PENDING, APPROVED, REJECTED, CONVERTED o EXPIRED')
    ];

    public validateId = [
        param('id')
            .isInt({ min: 1 })
            .withMessage('El ID de la cotización debe ser un número entero')
    ];

    public validateQuery = [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('status').optional().isString(),
        query('clientId').optional().isInt({ min: 1 }).toInt()
    ];
}
