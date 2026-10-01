import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class BudgetValidator {

    public validateCreate: ValidationChain[] = [
        body('clientId')
            .isInt({ min: 1 }).withMessage('ID de cliente inválido')
            .toInt()
            .custom(async (value, { req }) => {
                const businessId = req.user?.businessId;
                const count = await prisma.client.count({
                    where: { id: value, businessId: Number(businessId), isActive: true }
                });
                if (count === 0) throw new Error('Cliente no encontrado o inactivo');
                return true;
            }),

        body('exchangeRateId')
            .optional({ nullable: true, checkFalsy: true })
            .isInt({ min: 1 }).withMessage('ID de tasa inválido')
            .toInt()
            .custom(async (value, { req }) => {
                if (!value) return true;
                const businessId = req.user?.businessId;
                const rate = await prisma.exchangeRate.findFirst({
                    where: {
                        id: Number(value),
                        isActive: true,
                        OR: [
                            { businessId: Number(businessId) },
                            { businessId: null }
                        ]
                    }
                });
                if (!rate) throw new Error('Tasa de cambio inválida, inactiva o no autorizada');
                return true;
            }),

        body('validUntil')
            .optional({ nullable: true })
            .isISO8601().withMessage('La fecha de validez debe tener formato ISO8601 válido'),

        body('discount')
            .optional({ nullable: true })
            .isFloat({ min: 0 }).withMessage('El descuento debe ser mayor o igual a 0')
            .toFloat(),

        body('notes')
            .optional({ nullable: true })
            .isString().withMessage('Las notas deben ser texto'),

        body('items')
            .isArray({ min: 1 }).withMessage('El presupuesto debe contener al menos un producto'),

        body('items.*.productId')
            .isInt({ min: 1 }).withMessage('ID de producto inválido en los items')
            .toInt(),

        body('items.*.productPresentationId')
            .optional({ nullable: true })
            .isInt({ min: 1 }).withMessage('ID de presentación inválido')
            .toInt(),

        body('items.*.quantity')
            .isFloat({ gt: 0 }).withMessage('La cantidad debe ser mayor a 0')
            .toFloat(),

        body('items.*.unitPrice')
            .isFloat({ min: 0 }).withMessage('El precio unitario debe ser mayor o igual a 0')
            .toFloat(),

        body('items.*.discountPercentage')
            .optional({ nullable: true })
            .isFloat({ min: 0, max: 100 }).withMessage('El porcentaje de descuento debe estar entre 0 y 100')
            .toFloat(),

        body('items.*.notes')
            .optional({ nullable: true })
            .isString()
    ];

    public validateUpdate: ValidationChain[] = [
        param('id')
            .isInt({ min: 1 }).withMessage('ID de presupuesto inválido')
            .toInt(),

        body('clientId')
            .optional()
            .isInt({ min: 1 }).withMessage('ID de cliente inválido')
            .toInt(),

        body('exchangeRateId')
            .optional({ nullable: true, checkFalsy: true })
            .isInt({ min: 1 }).withMessage('ID de tasa inválido')
            .toInt(),

        body('validUntil')
            .optional({ nullable: true })
            .isISO8601().withMessage('La fecha de validez debe tener formato ISO8601 válido'),

        body('discount')
            .optional({ nullable: true })
            .isFloat({ min: 0 }).withMessage('El descuento debe ser mayor o igual a 0')
            .toFloat(),

        body('items')
            .optional()
            .isArray({ min: 1 }).withMessage('Los items deben ser un array con al menos un producto')
    ];

    public validateId: ValidationChain[] = [
        param('id')
            .isInt({ min: 1 }).withMessage('El ID del presupuesto debe ser un número entero positivo')
            .toInt()
    ];

    public validateList: ValidationChain[] = [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('clientId').optional().isInt({ min: 1 }).toInt(),
        query('status').optional().isString().trim(),
        query('search').optional().isString().trim(),
        query('fromDate').optional().isISO8601(),
        query('toDate').optional().isISO8601(),
    ];

    public validateStatus: ValidationChain[] = [
        param('id')
            .isInt({ min: 1 }).withMessage('ID de presupuesto inválido')
            .toInt(),
        body('status')
            .isIn(['DRAFT', 'PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED'])
            .withMessage('Estado inválido')
    ];

    public validateConvert: ValidationChain[] = [
        param('id')
            .isInt({ min: 1 }).withMessage('ID de presupuesto inválido')
            .toInt(),
        body('clientId')
            .optional()
            .isInt({ min: 1 }).withMessage('ID de cliente inválido')
            .toInt(),
        body('depotId')
            .optional()
            .isInt({ min: 1 }).withMessage('ID de depósito inválido')
            .toInt(),
        body('condition')
            .isIn(['CASH', 'CREDIT']).withMessage('Condición debe ser CASH o CREDIT'),
        body('payments')
            .optional()
            .isArray().withMessage('Payments debe ser un array')
    ];
}
