import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class CategoryValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('name')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}
