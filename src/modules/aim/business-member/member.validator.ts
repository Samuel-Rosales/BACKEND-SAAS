import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class MemberValidator {
  
    public validateAdd: ValidationChain[] = [
        body('ci    ')
        .trim()
        .notEmpty().withMessage('La cédula es obligatoria')
        .isString().withMessage('La cédula debe ser texto')
        .matches(/^\d{6,10}$/).withMessage('La cédula debe contener solo números (entre 6 y 10 dígitos)'),
        /*.custom(async (ci, { req }) => {
            // 1. Verificar que el usuario exista en la plataforma
            const user = await prisma.user.findUnique({ where: { ci } });
            if (!user) {
                throw new Error('El usuario con la cédula ${ci} no está registrado en el sistema.');
            }

            // 2. Verificar que no sea miembro YA de esta empresa
            // (Asumimos que el businessId viene del token en req.user.businessId)
            // Nota: Esto es difícil de validar aquí si no tenemos el businessId accesible fácilmente en el body.
            // Por seguridad, dejaremos esta validación lógica al Servicio.
            return true;
        }),*/

        body('roleId')
        .notEmpty().withMessage('El Rol es obligatorio')
        .isInt().toInt()
        .custom(async (roleId) => {
            const role = await prisma.role.findUnique({ where: { id: roleId } });
            if (!role) throw new Error('El rol especificado no existe.');
            return true;
        })
    ];

    public validateUpdate: ValidationChain[] = [
        param('id').isInt().toInt(),
        body('roleId').optional().isInt().toInt(),
        body('isActive').optional().isBoolean()
    ];

    public validateId: ValidationChain[] = [
        param('id').isInt().toInt().withMessage('ID inválido')
    ];
}