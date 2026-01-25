import { body, query, ValidationChain } from 'express-validator';

export class CreditNoteValidator {

    public validateCreate: ValidationChain[] = [
        // --- CABECERA ---
        body('saleId')
            .isInt({ min: 1 }).withMessage('El ID de la venta debe ser un entero positivo')
            .toInt(),

        body('reason')
            .trim()
            .notEmpty().withMessage('El motivo es obligatorio')
            .isLength({ min: 3, max: 255 }).withMessage('El motivo debe tener entre 3 y 255 caracteres'),

        // --- ITEMS (ARRAY) ---
        body('items')
            .isArray({ min: 1 }).withMessage('Debes seleccionar al menos un producto para devolver'),

        // Validación de cada objeto dentro del array
        body('items.*.productId')
            .isInt({ min: 1 }).withMessage('Producto inválido')
            .toInt(),

        body('items.*.quantity')
            .isFloat({ min: 0.0001 }).withMessage('La cantidad a devolver debe ser mayor a 0')
            .toFloat(),

        // EL CAMPO CLAVE
        body('items.*.returnToStock')
            .notEmpty().withMessage('Debes especificar returnToStock')
            .isBoolean().withMessage('returnToStock debe ser true o false')
            .toBoolean() // Convierte el string "true" a boolean true
    ];

    public validateList: ValidationChain[] = [
        query('page').optional().isInt({ min: 1 }).toInt(),
        query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
        
        query('fromDate').optional().isISO8601().withMessage('Fecha inválida'),
        query('toDate').optional().isISO8601().withMessage('Fecha inválida'),
        
        query('clientId').optional().isInt().toInt(),
        query('saleId').optional().isInt().toInt(),
        query('search').optional().isString().trim().escape()
    ];
}