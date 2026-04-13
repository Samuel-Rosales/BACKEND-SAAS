import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class MeasurementUnitValidator {
    public validateCreate: ValidationChain[] = [
        body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .custom(async (name) => {
            const exists = await prisma.measurementUnit.findFirst({ where: { name } });
            if (exists) throw new Error('Ya existe una unidad con ese nombre');
            return true;
        }),
        body('symbol')
        .trim()
        .notEmpty().withMessage('El símbolo es obligatorio')
        .isString()
        .isLength({ min: 1, max: 10 }).withMessage('El símbolo debe tener entre 1 y 10 caracteres')
        .custom(async (symbol) => {
            const exists = await prisma.measurementUnit.findFirst({ where: { symbol } });
            if (exists) throw new Error('Ya existe una unidad con ese símbolo');
            return true;
        }),

        body('type')
        .notEmpty().withMessage('El tipo es obligatorio')
        .isIn(['MASS', 'VOLUME', 'UNIT']).withMessage('El tipo debe ser: MASS, VOLUME o UNIT'),

        body('isActive')
        .optional()
        .isBoolean().withMessage('isActive debe ser un valor booleano')
        .toBoolean(),
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt(),
        body('name')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
        .custom(async (name, { req }) => {
            if (!name) return true;
            const id = Number(req.params!.id);
            const exists = await prisma.measurementUnit.findFirst({ where: { name } });
            if (exists && exists.id !== id) throw new Error('Nombre ya en uso por otra unidad');
            return true;
        }),
        body('symbol')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 1, max: 10 }).withMessage('El símbolo debe tener entre 1 y 10 caracteres')
        .custom(async (symbol, { req }) => {
            if (!symbol) return true;
            const id = Number(req.params!.id);
            const exists = await prisma.measurementUnit.findFirst({ where: { symbol } });
            if (exists && exists.id !== id) throw new Error('Símbolo ya en uso por otra unidad');
            return true;
        }),

        body('type')
        .optional()
        .isIn(['MASS', 'VOLUME', 'UNIT']).withMessage('El tipo debe ser: MASS, VOLUME o UNIT'),

        body('isActive')
        .optional()
        .isBoolean().withMessage('isActive debe ser un valor booleano')
        .toBoolean(),
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
