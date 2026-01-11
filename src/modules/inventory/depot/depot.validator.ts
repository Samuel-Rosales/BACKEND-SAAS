import { body, param, ValidationChain } from 'express-validator';

export class DepotValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

        body('location')
        .trim()
        .notEmpty().withMessage('La ubicación es obligatoria')
        .isString()
        .isLength({ min: 5, max: 200 }).withMessage('La ubicación debe tener entre 5 y 200 caracteres'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('name')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

        body('location')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 5, max: 200 }).withMessage('La ubicación debe tener entre 5 y 200 caracteres'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
