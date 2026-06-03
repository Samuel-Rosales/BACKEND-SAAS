import { body, param, ValidationChain } from 'express-validator';

export class TableValidator {

    public validateCreate: ValidationChain[] = [
        body('name')
            .trim()
            .notEmpty().withMessage('El nombre es obligatorio')
            .isString()
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

        body('capacity')
            .optional()
            .isInt({ min: 1 }).withMessage('La capacidad debe ser un número entero positivo')
            .toInt(),

        body('status')
            .optional()
            .isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'])
            .withMessage('Estado inválido')
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt(),

        body('name')
            .optional()
            .trim()
            .isString()
            .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

        body('capacity')
            .optional()
            .isInt({ min: 1 }).withMessage('La capacidad debe ser un número entero positivo')
            .toInt(),

        body('status')
            .optional()
            .isIn(['AVAILABLE', 'OCCUPIED', 'RESERVED', 'MAINTENANCE'])
            .withMessage('Estado inválido')
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
