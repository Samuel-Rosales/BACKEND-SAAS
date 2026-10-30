import { body, param, query } from 'express-validator';

export class PurchaseOrderValidator {
    public validateCreate = [
        body('supplierId')
            .isInt({ min: 1 })
            .withMessage('El proveedor es obligatorio'),

        body('depotId')
            .isInt({ min: 1 })
            .withMessage('El almacén de destino es obligatorio'),

        body('items')
            .isArray({ min: 1 })
            .withMessage('El pedido debe tener al menos un producto'),

        body('items.*.productId')
            .isInt({ min: 1 })
            .withMessage('El ID del producto es obligatorio'),

        body('items.*.quantity')
            .isFloat({ min: 0.000001 })
            .withMessage('La cantidad debe ser mayor a 0'),

        body('items.*.unitCost')
            .isFloat({ min: 0 })
            .withMessage('El costo unitario debe ser mayor o igual a 0'),

        body('items.*.productPresentationId')
            .optional({ nullable: true })
            .isInt({ min: 1 })
            .withMessage('ID de presentación inválido'),

        body('expectedDeliveryDate')
            .optional({ nullable: true })
            .isISO8601()
            .withMessage('Fecha estimada inválida'),

        body('notes')
            .optional({ nullable: true })
            .isString()
            .withMessage('Las notas deben ser texto')
    ];

    public validateReceive = [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de orden inválido'),

        body('taxId')
            .isInt({ min: 1 })
            .withMessage('El tipo de impuesto es obligatorio'),

        body('condition')
            .isIn(['CASH', 'CREDIT'])
            .withMessage('La condición de pago debe ser CASH o CREDIT'),

        body('items')
            .isArray({ min: 1 })
            .withMessage('Debe incluir los productos recibidos'),

        body('items.*.productId')
            .isInt({ min: 1 })
            .withMessage('ID de producto obligatorio'),

        body('items.*.depotId')
            .isInt({ min: 1 })
            .withMessage('Almacén de ingreso obligatorio'),

        body('items.*.quantity')
            .isFloat({ min: 0.000001 })
            .withMessage('La cantidad recibida debe ser mayor a 0'),

        body('items.*.unitCost')
            .isFloat({ min: 0 })
            .withMessage('El costo unitario debe ser mayor o igual a 0')
    ];

    public validateQuery = [
        query('page')
            .optional()
            .isInt({ min: 1 })
            .withMessage('La página debe ser un número entero mayor a 0'),

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 })
            .withMessage('El límite debe ser entre 1 y 100'),

        query('status')
            .optional()
            .isIn(['ALL', 'PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'])
            .withMessage('Estado inválido')
    ];

    public validateId = [
        param('id')
            .isInt({ min: 1 })
            .withMessage('El ID de la orden debe ser un número entero')
    ];

    public validateStatus = [
        param('id')
            .isInt({ min: 1 })
            .withMessage('ID de orden inválido'),

        body('status')
            .isIn(['PENDING', 'APPROVED', 'RECEIVED', 'CANCELLED'])
            .withMessage('Estado inválido')
    ];
}
