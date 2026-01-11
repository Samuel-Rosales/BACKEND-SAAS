// src/modules/1-iam/users/user.validator.ts
import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs'; // Importamos tu instancia de Prisma

export class UserValidator {
  
    // VALIDACIONES PARA CREAR USUARIO
    public validateCreate: ValidationChain[] = [
        body('name')
            .notEmpty().withMessage('El nombre es obligatorio')
            .isString().withMessage('El nombre debe ser texto'),

        body('email')
            .notEmpty().withMessage('El email es obligatorio')
            .isEmail().withMessage('Formato de email inválido')
            .custom(async (email) => {
                // Verificar si el email ya existe en la BD
                const exist = await prisma.user.findUnique({ where: { email } });
                if (exist) {
                    throw new Error(`El email ${email} ya está en uso.`);
                }
                return true;
            }),

        body('password')
            .notEmpty().withMessage('La contraseña es obligatoria')
            .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

        // Validación opcional de CI (Cédula)
        body('ci')
            .notEmpty().withMessage('La cédula es obligatoria')
            .isString()
            .custom(async (ci) => {
                const exist = await prisma.user.findUnique({ where: { ci } });
                if (exist) {
                    throw new Error(`La cédula ${ci} ya está registrada.`);
                }
                return true;
            }),
        
        body('phone').optional().isString(),
    ];

    // VALIDACIONES PARA ACTUALIZAR (Manejo de ID excluyente)
    public validateUpdate: ValidationChain[] = [
        param('id').isInt().withMessage('El ID debe ser un número entero'),

        body('name').optional().isString(),
        
        body('email')
            .optional()
            .isEmail()
            .custom(async (email, { req }) => {
                const userId = Number(req.params?.id);
                // Buscamos si existe OTRO usuario con ese email (excluyendo al actual)
                const exist = await prisma.user.findFirst({
                    where: { 
                        email: email,
                        NOT: { id: userId } // ¡La clave para editar!
                    }
                });
                if (exist) {
                    throw new Error(`El email ${email} ya está siendo usado por otro usuario.`);
                }
                return true;
            }),

        body('ci')
            .optional()
            .isString()
            .custom(async (ci, { req }) => {
                const userId = Number(req.params?.id);
                const exist = await prisma.user.findFirst({
                    where: { 
                        ci: ci,
                        NOT: { id: userId }
                    }
                });
                if (exist) {
                    throw new Error(`La cédula ${ci} ya está registrada en otro usuario.`);
                }
                return true;
            }),
    ];

    // VALIDAR SOLO EL ID (Para GET One o DELETE)
    public validateId: ValidationChain[] = [
        param('id')
            .notEmpty().withMessage('El ID es obligatorio')
            .isInt().withMessage('El ID debe ser numérico')
            .custom(async (id) => {
                const exist = await prisma.user.findUnique({ where: { id: Number(id) } });
                if (!exist) {
                    throw new Error(`No existe el usuario con ID ${id}`);
                }
                return true;
            }),
    ];
}