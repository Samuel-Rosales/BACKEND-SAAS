import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class MemberValidator {
  
    public validateAdd: ValidationChain[] = [
        // 1. CÉDULA
        body('ci')
        .trim()
        .notEmpty().withMessage('La cédula es obligatoria')
        .isString().withMessage('La cédula debe ser texto')
        .matches(/^\d{6,10}$/).withMessage('La cédula debe contener solo números (entre 6 y 10 dígitos)'),

        // 2. NOMBRE
        body('name')
        .trim()
        .notEmpty().withMessage('El nombre es obligatorio')
        .isString().withMessage('El nombre debe ser texto'),

        // 3. CONTRASEÑA
        body('password')
        .trim()
        .notEmpty().withMessage('La contraseña es obligatoria')
        .isString().withMessage('La contraseña debe ser texto')
        .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

        // 4. ROL
        body('roleId')
        .notEmpty().withMessage('El Rol es obligatorio')
        .isInt().toInt().withMessage('El Rol debe ser un número entero')
        .custom(async (roleId) => {
            const role = await prisma.role.findUnique({ where: { id: roleId } });
            if (!role) throw new Error('El rol especificado no existe.');
            return true;
        })
    ];

    public validateUpdate: ValidationChain[] = [
        // 1. ID
        param('id').isInt().toInt().withMessage('ID inválido'),
        // 2. ROL
        body('roleId').optional().isInt().toInt().withMessage('El Rol debe ser un número entero'),
        body('isActive').optional().isBoolean().withMessage('El estado debe ser un booleano'),
    ];

    public validateId: ValidationChain[] = [
        // 1. ID
        param('id').isInt().toInt().withMessage('ID inválido'),
    ];
}