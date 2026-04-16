import { body, param, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';
import { PlanType, SubStatus } from '@prisma/client';

export class SubscriptionValidator {
  
    public validateCreate: ValidationChain[] = [
        
        body('businessId')
        .isInt().withMessage('El ID del negocio debe ser un número entero')
        .custom(async (businessId) => {
            const business = await prisma.business.findUnique({
                where: { id: businessId }
            });
            if (!business) {
                throw new Error('El negocio especificado no existe');
            }
            return true;
        }),

        body('planType')
        .optional()
        .isIn(Object.values(PlanType)).withMessage(`El tipo de plan debe ser uno de: ${Object.values(PlanType).join(', ')}`),

        body('planId')
        .optional()
        .isInt().withMessage('planId debe ser un número entero')
        .toInt()
        .custom(async (planId) => {
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
            if (!plan || !plan.isActive) {
                throw new Error('planId inválido');
            }
            return true;
        }),

        body().custom((_, { req }) => {
            if (!req.body.planId && !req.body.planType) {
                throw new Error('Debe enviar planId o planType');
            }
            return true;
        }),

        body('status')
        .isIn(Object.values(SubStatus)).withMessage(`El estado debe ser uno de: ${Object.values(SubStatus).join(', ')}`),

        body('startDate')
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)')
        .toDate(),

        body('endDate')
        .isISO8601().withMessage('La fecha de fin debe ser una fecha válida (ISO 8601)')
        .toDate()
        .custom((endDate, { req }) => {
            const startDate = req.body.startDate;
            if (startDate && new Date(endDate) <= new Date(startDate)) {
                throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
            }
            return true;
        }),

        body('lastPaymentRef')
        .trim()
        .notEmpty().withMessage('La referencia del último pago es obligatoria')
        .isString()
        .isLength({ min: 1, max: 100 }).withMessage('La referencia debe tener entre 1 y 100 caracteres'),
    ];

    public validateUpdate: ValidationChain[] = [

        param('id').isInt().toInt(),
        
        body('businessId')
        .optional()
        .isInt().withMessage('El ID del negocio debe ser un número entero')
        .custom(async (businessId) => {
            if (businessId) {
                const business = await prisma.business.findUnique({
                    where: { id: businessId }
                });
                if (!business) {
                    throw new Error('El negocio especificado no existe');
                }
            }
            return true;
        }),

        body('planType')
        .optional()
        .isIn(Object.values(PlanType)).withMessage(`El tipo de plan debe ser uno de: ${Object.values(PlanType).join(', ')}`),

        body('planId')
        .optional()
        .isInt().withMessage('planId debe ser un número entero')
        .toInt()
        .custom(async (planId) => {
            const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });
            if (!plan || !plan.isActive) {
                throw new Error('planId inválido');
            }
            return true;
        }),

        body('status')
        .optional()
        .isIn(Object.values(SubStatus)).withMessage(`El estado debe ser uno de: ${Object.values(SubStatus).join(', ')}`),

        body('startDate')
        .optional()
        .isISO8601().withMessage('La fecha de inicio debe ser una fecha válida (ISO 8601)')
        .toDate(),

        body('endDate')
        .optional()
        .isISO8601().withMessage('La fecha de fin debe ser una fecha válida (ISO 8601)')
        .toDate(),

        body('lastPaymentRef')
        .optional()
        .trim()
        .isString()
        .isLength({ min: 1, max: 100 }).withMessage('La referencia debe tener entre 1 y 100 caracteres'),
    ];

    public validateId: ValidationChain[] = [

        param('id').isInt().toInt().withMessage('ID inválido')
    ];

    public validateBusinessId: ValidationChain[] = [

        param('businessId').isInt().toInt().withMessage('ID de negocio inválido')
    ];
}
