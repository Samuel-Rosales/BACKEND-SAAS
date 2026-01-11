import { body, param, ValidationChain } from 'express-validator';

export class BusinessValidator {
  
  public validateCreate: ValidationChain[] = [
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre del negocio es obligatorio')
      .isString().withMessage('El nombre debe ser texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres'),

    body('currencySymbol')
      .optional()
      .trim()
      .isLength({ max: 5 }).withMessage('El símbolo de moneda no puede exceder 5 caracteres'),
    
    body('address').optional().trim().isString(),
    body('logoUrl').optional().trim().isURL().withMessage('El logo debe ser una URL válida'),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt(),
    
    body('name').optional().trim().isLength({ min: 2 }),
    
    body('exchangeRate')
      .optional()
      .isFloat({ min: 0 }).withMessage('La tasa de cambio debe ser un número positivo'),
      
    body('currencySymbol').optional().trim().isLength({ max: 5 }),
  ];
}