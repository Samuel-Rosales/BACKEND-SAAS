import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';
import { ProductType } from '@prisma/client'; // Importamos el Enum

export class ProductValidator {

    public validateCreate: ValidationChain[] = [
        
        // 1. CLASIFICACIÓN (NUEVO)
        body('type')
            .notEmpty().withMessage('El tipo de producto es obligatorio')
            .isIn([ProductType.SIMPLE, ProductType.COMPOSITE, ProductType.SERVICE])
            .withMessage('El tipo debe ser SIMPLE, COMPOSITE o SERVICE'),

        // 2. RELACIONES PRINCIPALES
        body('categoryId')
            .isInt().withMessage('El ID de categoría debe ser un número entero')
            .toInt()
            .custom(async (categoryId, { req }) => {
                const businessId = req.user?.businessId;
                if (businessId) {
                    const category = await prisma.category.findFirst({
                        where: { id: categoryId, businessId }
                    });
                    if (!category) throw new Error('La categoría no existe o no pertenece a este negocio');
                }
                return true;
            }),

        body('unitId')
            .notEmpty().withMessage('La unidad de medida es obligatoria')
            .isInt().withMessage('El ID de la unidad debe ser un entero')
            .toInt()
            .custom(async (unitId) => {
                const unit = await prisma.measurementUnit.findUnique({ where: { id: unitId } });
                if (!unit) throw new Error('La unidad de medida seleccionada no existe');
                return true;
            }),

        body('taxId')
            .notEmpty().withMessage('El impuesto es obligatorio')
            .isInt().withMessage('El ID del impuesto debe ser un entero')
            .toInt()
            .custom(async (taxId) => {
                const tax = await prisma.tax.findUnique({ where: { id: taxId } });
                if (!tax) throw new Error('El impuesto seleccionado no existe');
                return true;
            }),

        // 3. DATOS BÁSICOS
        body('name')
            .trim()
            .notEmpty().withMessage('El nombre es obligatorio')
            .isString()
            .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

        body('sku')
            .optional({ nullable: true, checkFalsy: true })
            .trim()
            .isString()
            .isLength({ min: 1, max: 100 }).withMessage('El SKU debe tener entre 1 y 100 caracteres'),

        body('description')
            .optional({ nullable: true })
            .trim()
            .isString()
            .isLength({ max: 1000 }).withMessage('La descripción no puede exceder 1000 caracteres'),

        body('imageUrl')
            .optional({ nullable: true })
            .trim()
            .isURL().withMessage('La URL de la imagen debe ser válida'),

        body('imagePublicId')
            .optional({ nullable: true })
            .isString().withMessage('imagePublicId debe ser un string'),

        // 4. DATOS FINANCIEROS
        body('costPrice')
            .isFloat({ min: 0 }).withMessage('El precio de costo debe ser positivo')
            .toFloat(),
            
        body('profitMargin')
            .isFloat({ min: 0 }).withMessage('El margen de ganancia debe ser positivo')
            .toFloat(),
    
        body('salePrice')
            .isFloat({ min: 0 }).withMessage('El precio de venta debe ser positivo')
            .toFloat(),

        // 5. CONFIGURACIÓN
        body('minStock')
            .optional()
            .isInt({ min: 0 }).withMessage('El stock mínimo debe ser entero positivo')
            .toInt(),
            
        body('stockInitial')
            .optional()
            .isInt({ min: 0 }).withMessage('El stock inicial debe ser entero positivo')
            .toInt()
            .custom((stockInitial, { req }) => {
                if (Number(stockInitial) > 0 && (!req.body.initialDepotId || Number(req.body.initialDepotId) <= 0)) {
                    throw new Error('Si ingresas stock inicial, debes seleccionar un depósito inicial');
                }
                return true;
            }),

        body('initialDepotId')
            .optional({ nullable: true })
            .isInt({ min: 1 }).withMessage('El depósito inicial debe ser un ID válido')
            .toInt()
            .custom(async (initialDepotId, { req }) => {
                if (!initialDepotId) return true;

                const businessId = req.user?.businessId;
                if (!businessId) return true;

                const depot = await prisma.depot.findFirst({
                    where: { id: initialDepotId, businessId, isActive: true }
                });

                if (!depot) throw new Error('El depósito inicial no existe o no pertenece a este negocio');
                return true;
            }),

        body('isPerishable')
            .optional()
            .isBoolean().withMessage('isPerishable debe ser booleano')
            .toBoolean(),

        // 6. COMPONENTES (RECETA) - Lógica Condicional
        body('components')
            .if(body('type').equals(ProductType.COMPOSITE))
            .isArray({ min: 1 }).withMessage('Un producto compuesto debe tener al menos un ingrediente'),

        body('components.*.childProductId')
            .if(body('components').exists())
            .isInt().withMessage('El ID del ingrediente debe ser un entero válido'),

        body('components.*.quantity')
            .if(body('components').exists())
            .isFloat({ min: 0.0001 }).withMessage('La cantidad del ingrediente debe ser mayor a 0')
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt(),
        
        // Todo opcional para update
        body('type')
            .optional()
            .isIn([ProductType.SIMPLE, ProductType.COMPOSITE, ProductType.SERVICE]),

        body('categoryId')
            .optional()
            .isInt().toInt()
            .custom(async (categoryId, { req }) => {
                const businessId = req.user?.businessId;
                if (categoryId && businessId) {
                    const category = await prisma.category.findFirst({
                        where: { id: categoryId, businessId }
                    });
                    if (!category) throw new Error('Categoría inválida');
                }
                return true;
            }),

        body('unitId')
            .optional()
            .isInt().toInt()
            .custom(async (unitId) => {
                const unit = await prisma.measurementUnit.findUnique({ where: { id: unitId } });
                if (!unit) throw new Error('Unidad de medida inválida');
                return true;
            }),

        body('taxId')
            .optional()
            .isInt().toInt()
            .custom(async (taxId) => {
                const tax = await prisma.tax.findUnique({ where: { id: taxId } });
                if (!tax) throw new Error('Impuesto inválido');
                return true;
            }),

        body('name').optional().trim().isString().isLength({ min: 2, max: 200 }),
        body('sku').optional({ nullable: true }).trim().isString().isLength({ max: 100 }),
        body('description').optional().trim().isString().isLength({ max: 1000 }),
        body('imageUrl').optional({ nullable: true }).trim().isURL(),
        body('imagePublicId').optional({ nullable: true }).isString(),
        
        body('costPrice').optional().isFloat({ min: 0 }).toFloat(),
        body('salePrice').optional().isFloat({ min: 0 }).toFloat(),
        body('profitMargin').optional().isFloat({ min: 0 }).toFloat(),
        
        body('minStock').optional().isInt({ min: 0 }).toInt(),
        body('isPerishable').optional().isBoolean().toBoolean(),

        // Validación de componentes en Update (Si los envían, deben estar bien formados)
        body('components')
            .optional()
            .isArray().withMessage('Los componentes deben ser un arreglo'),

        body('components.*.childProductId')
            .if(body('components').exists())
            .isInt(),

        body('components.*.quantity')
            .if(body('components').exists())
            .isFloat({ min: 0.0001 })
    ];

    public validateList: ValidationChain[] = [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        query('search').optional().trim().isString(),
        query('categoryId').optional().isInt().toInt()
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}