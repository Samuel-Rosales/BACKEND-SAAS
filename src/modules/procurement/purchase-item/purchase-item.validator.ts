import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class PurchaseItemValidator {
  
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

        body('productId')
            .isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                const product = await prisma.product.findUnique({
                    where: { id: value }
                });
                if (!product) {
                    throw new Error('El producto no existe');
                }
                return true;
            }),

        body('depotId')
            .isInt({ min: 1 }).withMessage('El ID del almacén debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                const depot = await prisma.depot.findUnique({
                    where: { id: value }
                });
                if (!depot) {
                    throw new Error('El almacén no existe');
                }
                if (!depot.isActive) {
                    throw new Error('El almacén está inactivo');
                }
                return true;
            }),

        body('productPresentationId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID de la presentación debe ser un número entero positivo')
            .toInt()
            .custom(async (value) => {
                if (value) {
                    const presentation = await prisma.productPresentation.findUnique({
                        where: { id: value }
                    });
                    if (!presentation) {
                        throw new Error('La presentación de producto no existe');
                    }
                    if (!presentation.isActive) {
                        throw new Error('La presentación de producto está inactiva');
                    }
                }
                return true;
            }),

        body('quantity')
            .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero mayor a cero')
            .toInt(),

        body('unitCost')
            .isFloat({ min: 0.01 }).withMessage('El costo unitario debe ser un número mayor a cero')
            .toFloat(),

        body('expirationDate')
            .optional()
            .isISO8601().withMessage('La fecha de expiración debe tener formato YYYY-MM-DD')
            .toDate()
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido'),
        
        body('purchaseId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID de compra debe ser un número entero positivo')
            .toInt(),

        body('productId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID del producto debe ser un número entero positivo')
            .toInt(),

        body('depotId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID del almacén debe ser un número entero positivo')
            .toInt(),

        body('productPresentationId')
            .optional()
            .isInt({ min: 1 }).withMessage('El ID de la presentación debe ser un número entero positivo')
            .toInt(),

        body('quantity')
            .optional()
            .isInt({ min: 1 }).withMessage('La cantidad debe ser un número entero mayor a cero')
            .toInt(),

        body('unitCost')
            .optional()
            .isFloat({ min: 0.01 }).withMessage('El costo unitario debe ser un número mayor a cero')
            .toFloat(),

        body('expirationDate')
            .optional()
            .isISO8601().withMessage('La fecha de expiración debe tener formato YYYY-MM-DD')
            .toDate()
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
