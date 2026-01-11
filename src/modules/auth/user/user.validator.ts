// src/modules/1-iam/users/user.validator.ts
import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs'; // Importamos tu instancia de Prisma

export class UserValidator {
  
    // VALIDACIONES PARA CREAR USUARIO
    public validateCreate: ValidationChain[] = [
        // 1. NOMBRE
        body('name')
            .trim() // Sanitización: quita espacios al inicio/final
            .notEmpty().withMessage('El nombre es obligatorio')
            .isString().withMessage('El nombre debe ser texto')
            .isLength({ min: 3, max: 100 }).withMessage('El nombre debe tener entre 3 y 100 caracteres'),

        // 2. EMAIL
        body('email')
            .trim()
            .notEmpty().withMessage('El email es obligatorio')
            .isEmail().withMessage('Formato de email inválido')
            .normalizeEmail() // Sanitización: convierte a minúsculas, quita puntos en gmail, etc.
            .custom(async (email) => {
                const exist = await prisma.user.findUnique({ where: { email } });
                if (exist) throw new Error(`El email ${email} ya está en uso.`);
                return true;
            }),

        // 3. CONTRASEÑA
        body('password')
            .notEmpty().withMessage('La contraseña es obligatoria')
            .isLength({ min: 6 }).withMessage('La contraseña debe tener al menos 6 caracteres'),

        // 4. CÉDULA (CI) - Integrando tu lógica Regex antigua aquí
        body('ci')
            .trim()
            .notEmpty().withMessage('La cédula es obligatoria')
            .matches(/^\d{6,10}$/).withMessage('La cédula debe contener solo números (entre 6 y 10 dígitos)')
            .custom(async (ci) => {
                const exist = await prisma.user.findUnique({ where: { ci } });
                if (exist) throw new Error(`La cédula ${ci} ya está registrada.`);
                return true;
            }),

        // 5. TELÉFONO (Opcional pero validado)
        body('phone')
            .optional()
            .trim()
            .isMobilePhone('any').withMessage('El formato del teléfono no es válido'),

        // 6. ROL (FK Check) - Reemplazando tu 'validateRoleIdExists' antiguo
        // Asumiendo que al crear usuario le pasas un roleId para asignarlo
        body('roleId')
            .notEmpty().withMessage('El ID del rol es obligatorio')
            .isInt().withMessage('El ID del rol debe ser un número entero')
            .toInt() // Sanitización: convierte "1" (string) a 1 (int) para la DB
            .custom(async (roleId) => {
                const role = await prisma.role.findUnique({ where: { id: roleId } });
                if (!role) throw new Error(`El rol con ID ${roleId} no existe en el sistema`);
                return true;
            })
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('El ID debe ser un número entero'),

        body('name').optional().trim().isString().isLength({ min: 3 }),
        
        body('email')
            .optional()
            .trim()
            .isEmail()
            .normalizeEmail()
            .custom(async (email, { req }) => {
                const userId = Number(req.params?.id);
                const exist = await prisma.user.findFirst({
                    where: { email: email, NOT: { id: userId } }
                });
                if (exist) throw new Error(`El email ya está en uso por otro usuario.`);
                return true;
            }),

        body('ci')
            .optional()
            .trim()
            .matches(/^\d{6,10}$/).withMessage('Formato de cédula inválido')
            .custom(async (ci, { req }) => {
                const userId = Number(req.params?.id);
                const exist = await prisma.user.findFirst({
                    where: { ci: ci, NOT: { id: userId } }
                });
                if (exist) throw new Error(`La cédula ya está registrada en otro usuario.`);
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