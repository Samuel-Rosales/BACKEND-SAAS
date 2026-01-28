import { body, param, query, ValidationChain } from 'express-validator'; // <--- Agregamos 'query'
import { MovementType } from '@prisma/client';

export class StockMovementValidator {
 
    public validateCreate: ValidationChain[] = [
        
        body('productId')
            .isInt().withMessage('El ID del producto debe ser un número entero')
            .notEmpty().withMessage('El producto es requerido'),

        body('depotId')
            .isInt().withMessage('El ID del depósito debe ser un número entero')
            .notEmpty().withMessage('El depósito es requerido'),

        // --- VALIDACIÓN CONDICIONAL PARA TRANSFERENCIAS ---
        body('targetDepotId')
            .optional()
            .isInt().withMessage('El ID del depósito destino debe ser entero')
            .custom((value, { req }) => {
                if (req.body.type === MovementType.TRANSFER && !value) {
                    throw new Error('El depósito destino es obligatorio para transferencias.');
                }
                if (value && parseInt(value) === parseInt(req.body.depotId)) {
                    throw new Error('El depósito destino no puede ser igual al origen.');
                }
                return true;
            }),

        body('type')
            .isIn(Object.values(MovementType))
            .withMessage(`El tipo debe ser uno de: ${Object.values(MovementType).join(', ')}`),

        body('quantity')
            .isFloat({ gt: 0 })
            .withMessage('La cantidad debe ser un número mayor a 0 (acepta decimales)')
            .notEmpty().withMessage('La cantidad es requerida'),

        // --- CAMPOS DE LOTES ---
        body('lotId')
            .optional()
            .isInt().withMessage('El ID del lote debe ser un número entero'),

        body('unitCost')
            .optional()
            .isFloat({ min: 0 }).withMessage('El costo unitario debe ser positivo')
            .custom((value, { req }) => {
                // Warning opcional para entradas sin costo
                return true;
            }),

        body('expirationDate')
            .optional()
            .isISO8601().withMessage('La fecha de vencimiento debe ser válida (ISO 8601)')
            .toDate(),

        // --- METADATA ---
        body('reason')
            .optional()
            .isString()
            .isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres'),

        body('date')
            .optional()
            .isISO8601()
            .toDate(),
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt(),

        body('reason')
            .optional()
            .isString()
            .isLength({ max: 500 }).withMessage('La razón no puede exceder 500 caracteres'),

        body('date')
            .optional()
            .isISO8601()
            .toDate(),
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    // =====================================================================
    // NUEVO: VALIDACIÓN DE FILTROS (QUERY PARAMS)
    // =====================================================================
    // Valida: GET /inventory?page=1&limit=10&search=abc&type=IN...
    public validateListQuery: ValidationChain[] = [
        
        query('page')
            .optional()
            .isInt({ min: 1 }).withMessage('La página debe ser un entero mayor a 0')
            .toInt(), // Convierte "1" (string) a 1 (number)

        query('limit')
            .optional()
            .isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100')
            .toInt(),

        query('search')
            .optional()
            .isString()
            .trim(), // Elimina espacios accidentales al inicio/final

        query('type')
            .optional()
            .isIn(Object.values(MovementType))
            .withMessage('Tipo de movimiento inválido para filtro'),

        query('depotId')
            .optional()
            .isInt().withMessage('Filtro depotId debe ser entero')
            .toInt(),

        query('productId')
            .optional()
            .isInt().withMessage('Filtro productId debe ser entero')
            .toInt(),

        query('startDate')
            .optional()
            .isISO8601().withMessage('Fecha de inicio inválida')
            .toDate(),

        query('endDate')
            .optional()
            .isISO8601().withMessage('Fecha fin inválida')
            .toDate()
            .custom((endDate, { req }) => {
                // Validación extra: End no puede ser menor a Start
                if (req.query?.startDate && new Date(endDate) < new Date(req.query.startDate as string)) {
                    throw new Error('La fecha fin no puede ser anterior a la fecha inicio');
                }
                return true;
            }),
    ];
}