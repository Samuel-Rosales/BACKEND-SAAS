import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class ClientValidator {
  
  public validateCreate: ValidationChain[] = [
    body('name')
      .trim()
      .notEmpty().withMessage('El nombre del cliente es obligatorio')
      .isString().withMessage('El nombre debe ser texto')
      .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

    body('ci')
      .trim()
      .notEmpty().withMessage('La cédula/RIF/DNI es obligatoria')
      .isString().withMessage('La cédula debe ser texto')
      .isLength({ min: 3, max: 20 }).withMessage('La cédula debe tener entre 3 y 20 caracteres')
      .custom(async (ci, { req }) => {
        // Validar duplicados DENTRO de la misma empresa
        const businessId = req.user?.businessId;
        if (!businessId) return true; // Si falla auth, esto no importa

        const exist = await prisma.client.findFirst({
            where: { 
                ci: ci,
                businessId: Number(businessId)
            }
        });
        if (exist) throw new Error(`Ya tienes un cliente con la cédula/RIF "${ci}".`);
        return true;
      }),

    body('phone')
        .optional()
        .trim()
        .isString().withMessage('El teléfono debe ser texto')
        .isLength({ min: 1, max: 50 }).withMessage('El teléfono debe tener entre 1 y 50 caracteres'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('El email debe tener un formato válido')
        .isLength({ max: 255 }).withMessage('El email no puede exceder 255 caracteres'),

    body('address')
        .optional()
        .trim()
        .isString().withMessage('La dirección debe ser texto')
        .isLength({ max: 500 }).withMessage('La dirección no puede exceder 500 caracteres'),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
    
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .isLength({ min: 2, max: 200 }).withMessage('El nombre debe tener entre 2 y 200 caracteres'),

    body('ci')
      .optional()
      .trim()
      .notEmpty().withMessage('La cédula no puede estar vacía')
      .isString().withMessage('La cédula debe ser texto')
      .isLength({ min: 3, max: 20 }).withMessage('La cédula debe tener entre 3 y 20 caracteres')
      .custom(async (ci, { req }) => {
        const businessId = req.user?.businessId;
        const id = Number(req.params?.id);
        
        if (!businessId || !ci) return true;
        
        const exist = await prisma.client.findFirst({
            where: { 
                ci: ci,
                businessId: Number(businessId),
                NOT: { id: id }
            }
        });
        if (exist) throw new Error(`Ya existe otro cliente con la cédula/RIF "${ci}".`);
        return true;
      }),

    body('phone')
        .optional()
        .trim()
        .isString().withMessage('El teléfono debe ser texto')
        .isLength({ min: 1, max: 50 }).withMessage('El teléfono debe tener entre 1 y 50 caracteres'),

    body('email')
        .optional()
        .trim()
        .isEmail().withMessage('El email debe tener un formato válido')
        .isLength({ max: 255 }).withMessage('El email no puede exceder 255 caracteres'),

    body('address')
        .optional()
        .trim()
        .isString().withMessage('La dirección debe ser texto')
        .isLength({ max: 500 }).withMessage('La dirección no puede exceder 500 caracteres'),
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];
}
