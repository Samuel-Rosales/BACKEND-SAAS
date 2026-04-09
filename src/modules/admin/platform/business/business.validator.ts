import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';
import { ExchangeRateStrategy } from '@prisma/client';

export class BusinessValidator {
  
  // --- VALIDACIÓN DE ID (Reutilizable) ---
  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];

  // --- CREAR NEGOCIO ---
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
      .custom(async (id) => {
        const category = await prisma.businessCategory.findUnique({ where: { id } });
        if (!category) throw new Error('La categoría especificada no existe');
        return true;
      }),
  ];

  // --- A. ACTUALIZAR GENERAL (Solo campos cosméticos) ---
  public validateUpdateGeneral: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
    
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .isLength({ min: 2, max: 100 }),
    
    body('address')
      .optional()
      .trim()
      .notEmpty().withMessage('La dirección no puede estar vacía')
      .isLength({ min: 5, max: 200 }),
    
    body('logoUrl')
      .optional({ checkFalsy: true }) // Permite enviar string vacío para borrar logo
      .trim()
      .isURL().withMessage('El logo debe ser una URL válida'),
    
    body('businessCategoryId')
      .optional()
      .isInt()
      .custom(async (id) => {
        if (!id) return true;
        const category = await prisma.businessCategory.findUnique({ where: { id } });
        if (!category) throw new Error('La categoría especificada no existe');
        return true;
      }),
  ];

  // --- B. ACTUALIZAR POLÍTICAS (Reglas de Negocio) ---
  public validateUpdatePolicies: ValidationChain[] = [
    param('id').isInt().toInt(),

    body('enableGlobalCredit')
      .optional()
      .isBoolean().withMessage('El campo habilitar crédito debe ser verdadero o falso'),

    body('defaultCreditLimit')
      .optional()
      .isFloat({ min: 0 }).withMessage('El límite de crédito no puede ser negativo')
      .toFloat(), // Convierte string "100" a number 100 automáticamente
  ];

  // --- C. ACTUALIZAR TASAS ---
  public validateUpdateExchangeRateConfig: ValidationChain[] = [
    param('id').isInt().toInt(),

    body('strategy')
      .notEmpty().withMessage('La estrategia es obligatoria')
      .isIn(Object.values(ExchangeRateStrategy)).withMessage('Estrategia inválida'),

    body('manualRate')
      .optional()
      .isFloat({ min: 0.0001 }).withMessage('La tasa debe ser mayor a 0')
      .toFloat(),

    // Validación cruzada: Si estrategia es MANUAL, manualRate es obligatorio
    body().custom((body) => {
      if (body.strategy === ExchangeRateStrategy.MANUAL) {
        if (!body.manualRate || body.manualRate <= 0) {
           throw new Error('Se requiere una tasa manual válida para la estrategia MANUAL');
        }
      }
      return true;
    })
  ];
}