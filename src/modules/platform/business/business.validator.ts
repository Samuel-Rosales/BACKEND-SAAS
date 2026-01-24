import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';
import { ExchangeRateStrategy } from '@prisma/client';

export class BusinessValidator {
  
  public validateCreate: ValidationChain[] = [
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre del negocio es obligatorio')
      .isString().withMessage('El nombre debe ser texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('address')
      .trim()
      .notEmpty().withMessage('La dirección es obligatoria')
      .isString().withMessage('La dirección debe ser texto')
      .isLength({ min: 5, max: 200 }).withMessage('La dirección debe tener entre 5 y 200 caracteres'),
    
    body('logoUrl')
      .optional()
      .trim()
      .isURL().withMessage('El logo debe ser una URL válida'),
    
    body('businessCategoryId')
      .isInt().withMessage('El ID de categoría debe ser un número entero')
      .custom(async (businessCategoryId) => {
        const category = await prisma.businessCategory.findUnique({
          where: { id: businessCategoryId }
        });
        if (!category) {
          throw new Error('La categoría de negocio especificada no existe');
        }
        return true;
      }),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
    
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .isString().withMessage('El nombre debe ser texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),
    
    body('address')
      .optional()
      .trim()
      .notEmpty().withMessage('La dirección no puede estar vacía')
      .isString().withMessage('La dirección debe ser texto')
      .isLength({ min: 5, max: 200 }).withMessage('La dirección debe tener entre 5 y 200 caracteres'),
    
    body('logoUrl')
      .optional()
      .trim()
      .isURL().withMessage('El logo debe ser una URL válida'),
    
    body('businessCategoryId')
      .optional()
      .isInt().withMessage('El ID de categoría debe ser un número entero')
      .custom(async (businessCategoryId) => {
        if (businessCategoryId) {
          const category = await prisma.businessCategory.findUnique({
            where: { id: businessCategoryId }
          });
          if (!category) {
            throw new Error('La categoría de negocio especificada no existe');
          }
        }
        return true;
      }),
  ];

  public validateUpdateExchangeRateConfig: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),

    body('strategy')
      .notEmpty().withMessage('La estrategia es obligatoria')
      .isIn(Object.values(ExchangeRateStrategy)).withMessage('Estrategia inválida'),

    body('manualRate')
      .optional()
      .isFloat({ min: 0.0001 }).withMessage('La tasa manual debe ser un número positivo mayor a 0')
      .toFloat(),

    body('manualRate')
      .custom((manualRate, { req }) => {
        if (req.body?.strategy === ExchangeRateStrategy.MANUAL) {
          if (manualRate === undefined || manualRate === null || Number(manualRate) <= 0) {
            throw new Error('Para la estrategia MANUAL, se requiere una tasa válida mayor a 0.');
          }
        }
        return true;
      })
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];
}