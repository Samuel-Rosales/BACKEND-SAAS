import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class PurchasePaymentValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('purchaseId')
            .isInt({ min: 1 }).withMessage('El ID de compra debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                const purchase = await prisma.purchase.findUnique({
                    where: { id: value }
                });
                if (!purchase) {
                    throw new Error('La compra no existe');
                }
                return true;
            }),

        body('paymentMethodId')
            .isInt({ min: 1 }).withMessage('El ID del método de pago debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                const paymentMethod = await prisma.paymentMethod.findUnique({
                    where: { id: value }
                });
                if (!paymentMethod) {
                    throw new Error('El método de pago no existe');
                }
                if (!paymentMethod.isActive) {
                    throw new Error('El método de pago está inactivo');
                }
                return true;
            }),

        body('amount')
            .isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a cero')
            .toFloat(),

        body('currency')
            .trim()
            .notEmpty().withMessage('La moneda es obligatoria')
            .isIn(['USD', 'VES']).withMessage('La moneda debe ser USD o VES'),

        body('exchangeRateId')
            .isInt({ min: 1 }).withMessage('El ID de la tasa de cambio debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                const exchangeRate = await prisma.exchangeRate.findUnique({
                    where: { id: value }
                });
                if (!exchangeRate) {
                    throw new Error('La tasa de cambio no existe');
                }
                return true;
            }),

        body('reference')
            .optional()
            .trim()
            .isLength({ min: 1, max: 200 }).withMessage('La referencia debe tener entre 1 y 200 caracteres')
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido'),
        
        body('purchaseId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID de compra debe ser un número entero positivo')
            .toInt(),

        body('paymentMethodId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID del método de pago debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                if (value) {
                    const paymentMethod = await prisma.paymentMethod.findUnique({
                        where: { id: value }
                    });
                    if (!paymentMethod) {
                        throw new Error('El método de pago no existe');
                    }
                    if (!paymentMethod.isActive) {
                        throw new Error('El método de pago está inactivo');
                    }
                }
                return true;
            }),

        body('amount')
            .optional()
            .isFloat({ min: 0.01 }).withMessage('El monto debe ser un número mayor a cero')
            .toFloat(),

        body('currency')
            .optional()
            .trim()
            .isIn(['USD', 'VES']).withMessage('La moneda debe ser USD o VES'),

        body('exchangeRateId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID de la tasa de cambio debe ser un número entero positivo')
            .toInt(),

        body('reference')
            .optional()
            .trim()
            .isLength({ min: 1, max: 200 }).withMessage('La referencia debe tener entre 1 y 200 caracteres')
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validatePurchaseId: ValidationChain[] = [

        query('purchaseId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID de compra debe ser un número entero positivo')
            .toInt()
    ];
}
