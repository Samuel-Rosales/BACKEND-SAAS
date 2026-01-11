import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class RoleValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isString(),

        body('code')
        .trim()
        .notEmpty().withMessage('El código es obligatorio')
        .isUppercase().withMessage('El código debe estar en MAYÚSCULAS')
        .matches(/^[A-Z_]+$/).withMessage('El código solo puede contener letras y guiones bajos (Ej: SUPER_ADMIN)')
        .custom(async (code) => {

            const exist = await prisma.role.findUnique({ where: { code } });

            if (exist) throw new Error(`El código ${code} ya existe.`);

            return true;
        }),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('name').optional().trim().isLength({ min: 3 }),
        
        body('code')
        .optional()
        .trim()
        .isUppercase()
        .matches(/^[A-Z_]+$/)
        .custom(async (code, { req }) => {

            const id = Number(req.params?.id);

            const exist = await prisma.role.findFirst({
                where: { code: code, NOT: { id: id } }
            });
            
            if (exist) throw new Error(`El código ${code} ya está en uso.`);

            return true;
        }),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}