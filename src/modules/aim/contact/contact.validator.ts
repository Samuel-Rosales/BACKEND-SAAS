import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class ContactValidator {
  
    public validateCreate: ValidationChain[] = [

        body('email')
        .trim()
        .notEmpty().withMessage('El email es obligatorio')
        .isEmail().withMessage('Debe ser un email válido')
        .custom(async (email) => {
            const existingContact = await prisma.userContact.findUnique({
                where: { email }
            });
            if (existingContact) {
                throw new Error('El email ya está registrado para otro usuario');
            }
            return true;
        }),

        body('phone')
        .trim()
        .notEmpty().withMessage('El teléfono es obligatorio')
        .isString()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres'),

        body('address')
        .trim()
        .notEmpty().withMessage('La dirección es obligatoria')
        .isString()
        .isLength({ min: 5, max: 200 }).withMessage('La dirección debe tener entre 5 y 200 caracteres'),

        body('city')
        .trim()
        .notEmpty().withMessage('La ciudad es obligatoria')
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('La ciudad debe tener entre 2 y 100 caracteres'),

        body('state')
        .trim()
        .notEmpty().withMessage('El estado es obligatorio')
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El estado debe tener entre 2 y 100 caracteres'),
    ];

    public validateUpdate: ValidationChain[] = [
        
        body('userId')
        .optional()
        .isInt().withMessage('El ID del usuario debe ser un número entero')
        .custom(async (userId) => {
            if (userId) {
                const user = await prisma.user.findUnique({
                    where: { id: userId }
                });
                if (!user) {
                    throw new Error('El usuario especificado no existe');
                }
            }
            return true;
        }),

        body('email')
        .optional()
        .trim()
        .isEmail().withMessage('Debe ser un email válido'),

        body('phone')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 7, max: 20 }).withMessage('El teléfono debe tener entre 7 y 20 caracteres'),

        body('address')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 5, max: 200 }).withMessage('La dirección debe tener entre 5 y 200 caracteres'),

        body('city')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('La ciudad debe tener entre 2 y 100 caracteres'),

        body('state')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 2, max: 100 }).withMessage('El estado debe tener entre 2 y 100 caracteres'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateUserId: ValidationChain[] = [

        param('userId').isInt().toInt().withMessage('ID de usuario inválido')
    ];
}
