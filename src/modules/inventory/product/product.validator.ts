import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class ProductValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('categoryId')
        .isInt().withMessage('El ID de categoría debe ser un número entero')
        .custom(async (categoryId, { req }) => {
            const businessId = req.user?.businessId || req.body.businessId;
            if (businessId) {
                const category = await prisma.category.findFirst({
                    where: { 
                        id: categoryId,
                        businessId: businessId
                    }
                });
                if (!category) {
                    throw new Error('La categoría no existe o no pertenece a este negocio');
                }
            }
            return true;
        }),

        body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isString()
        .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

        body('sku')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 1, max: 100 }).withMessage('El SKU debe tener entre 1 y 100 caracteres'),

        body('description')
        .trim()
        .isString()
        .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),

        body('imageUrl')
        .optional()
        .trim()
        .isURL().withMessage('La URL de la imagen debe ser válida'),

        body('costPrice')
        .isFloat({ min: 0 }).withMessage('El precio de costo debe ser un número positivo'),

        body('salePrice')
        .isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número positivo'),

        body('minStock')
        .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero positivo'),

        body('isService')
        .isBoolean().withMessage('isService debe ser un valor booleano'),

        body('isPerishable')
        .isBoolean().withMessage('isPerishable debe ser un valor booleano'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('categoryId')
        .optional()
        .isInt().withMessage('El ID de categoría debe ser un número entero')
        .custom(async (categoryId, { req }) => {
            const businessId = req.user?.businessId || req.body.businessId;
            if (categoryId && businessId) {
                const category = await prisma.category.findFirst({
                    where: { 
                        id: categoryId,
                        businessId: businessId
                    }
                });
                if (!category) {
                    throw new Error('La categoría no existe o no pertenece a este negocio');
                }
            }
            return true;
        }),

        body('name')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

        body('sku')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 1, max: 100 }).withMessage('El SKU debe tener entre 1 y 100 caracteres'),

        body('description')
        .optional()
        .trim()
        .isString()
        .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),

        body('imageUrl')
        .optional()
        .trim()
        .isURL().withMessage('La URL de la imagen debe ser válida'),

        body('costPrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de costo debe ser un número positivo'),

        body('salePrice')
        .optional()
        .isFloat({ min: 0 }).withMessage('El precio de venta debe ser un número positivo'),

        body('minStock')
        .optional()
        .isInt({ min: 0 }).withMessage('El stock mínimo debe ser un número entero positivo'),

        body('isService')
        .optional()
        .isBoolean().withMessage('isService debe ser un valor booleano'),

        body('isPerishable')
        .optional()
        .isBoolean().withMessage('isPerishable debe ser un valor booleano'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
