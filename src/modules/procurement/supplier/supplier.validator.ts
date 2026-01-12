import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class SupplierValidator {
  
  public validateCreate: ValidationChain[] = [
    body('nameCompany')
      .trim()
      .notEmpty().withMessage('El nombre del proveedor es obligatorio')
      .isString().withMessage('El nombre debe ser texto')
      .isLength({ min: 2, max: 100 }).withMessage('El nombre debe tener entre 2 y 100 caracteres')
      .custom(async (nameCompany, { req }) => {
        // Validar duplicados DENTRO de la misma empresa
        const businessId = req.user?.businessId;
        if (!businessId) return true; // Si falla auth, esto no importa

        const exist = await prisma.supplier.findFirst({
            where: { 
                nameCompany: nameCompany,
                businessId: Number(businessId)
            }
        });
        if (exist) throw new Error(`Ya tienes un proveedor llamado "${nameCompany}".`);
        return true;
      }),

    body('contactName')
        .trim()
        .notEmpty().withMessage('El nombre de contacto es obligatorio')
        .isString().withMessage('El nombre de contacto debe ser texto'),
    body('phone')
        .trim()
        .notEmpty().withMessage('El teléfono es obligatorio')
        .isString().withMessage('El teléfono debe ser texto'),
    body('address')
        .trim()
        .notEmpty().withMessage('La dirección es obligatoria')
        .isString().withMessage('La dirección del proveedor debe ser texto'),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
    
    body('nameCompany')
      .optional()
      .trim()
      .notEmpty().withMessage('El nombre no puede estar vacío')
      .custom(async (nameCompany, { req }) => {
        const businessId = req.user?.businessId;
        const id = Number(req.params?.id);
        
        const exist = await prisma.supplier.findFirst({
            where: { 
                nameCompany: nameCompany,
                businessId: Number(businessId),
                NOT: { id: id }
            }
        });
        if (exist) throw new Error(`Ya existe otro proveedor llamado "${nameCompany}".`);
        return true;
      }),
    body('contactName')
        .optional()
        .trim()
        .notEmpty().withMessage('El nombre de contacto no puede estar vacío')
        .isString().withMessage('El nombre de contacto debe ser texto'),

    body('phone')
        .optional()
        .trim()
        .notEmpty().withMessage('El teléfono no puede estar vacío')
        .isString().withMessage('El teléfono debe ser texto'),

    body('address')
        .optional()
        .trim()
        .notEmpty().withMessage('La dirección no puede estar vacía')
        .isString().withMessage('La dirección del proveedor debe ser texto'),
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];
}