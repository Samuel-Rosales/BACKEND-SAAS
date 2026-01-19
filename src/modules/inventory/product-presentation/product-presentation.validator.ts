import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class ProductPresentationValidator {
  public validateCreate: ValidationChain[] = [
    body('productId')
      .notEmpty().withMessage('El producto es obligatorio')
      .isInt().toInt(),
      
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre es obligatorio')
      .isString()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('factor')
      .notEmpty().withMessage('El factor es obligatorio')
      .isFloat({ min: 0.0001 }).withMessage('El factor debe ser mayor a 0')
      .toFloat(),

    body('barCode')
      .optional()
      .trim()
      .isString(),

    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('El precio no puede ser negativo')
      .toFloat()
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt(),
    body('productId')
      .optional()
      .isInt().toInt(),
    body('name')
      .optional()
      .trim()
      .isString()
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    body('factor')
      .optional()
      .isFloat({ min: 0.0001 }).withMessage('El factor debe ser mayor a 0')
      .toFloat(),
    body('barCode')
      .optional()
      .trim()
      .isLength({ min: 3, max: 50 }).withMessage('El código debe tener entre 3 y 50 caracteres'),
    body('price')
      .optional()
      .isFloat({ min: 0 }).withMessage('El precio no puede ser negativo')
      .toFloat()
  ];

  public validateList: ValidationChain[] = [
    query('productId')
      .optional()
      .isInt().toInt()
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];
}
