import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class SaleValidator {

  public validateCreate: ValidationChain[] = [
    // -----------------------------------------------------
    // 1. CABECERA Y SEGURIDAD
    // -----------------------------------------------------
    body('clientId')
      .isInt({ min: 1 }).withMessage('ID de cliente inválido')
      .toInt()
      .custom(async (value, { req }) => {
        const businessId = req.user?.businessId; // Asumiendo que el middleware auth ya inyectó esto
        // Optimizamos usando count en lugar de findFirst para ser más ligero
        const count = await prisma.client.count({
          where: { id: value, businessId: Number(businessId), isActive: true }
        });
        if (count === 0) throw new Error('Cliente no encontrado o inactivo');
        return true;
      }),

    // 🔒 SEGURIDAD CRÍTICA: Validar que la tasa sea del negocio
    body('exchangeRateId')
      .isInt({ min: 1 }).withMessage('ID de tasa inválido')
      .toInt()
      .custom(async (value, { req }) => {
        const businessId = req.user?.businessId;
        
        const rate = await prisma.exchangeRate.findFirst({
          where: { 
            id: value, 
            isActive: true,
            // AQUÍ ESTÁ EL CAMBIO "SENIOR":
            OR: [
                { businessId: Number(businessId) }, // Caso A: Es mi tasa manual personalizada
                { businessId: null }                // Caso B: Es la tasa del BCV (Global / Sistema)
            ]
          }
        });

        if (!rate) throw new Error('Tasa de cambio inválida, inactiva o no autorizada');
        return true;
      }),

    // --- NUEVOS CAMPOS ---
    body('depotId')
      .optional()
      .isInt({ min: 1 }).withMessage('ID de depósito inválido')
      .toInt(),

    body('condition')
      .isIn(['CASH', 'CREDIT']).withMessage('Condición debe ser CASH o CREDIT'),

    // Validamos estructura de cuotas si es crédito
    body('installments')
      .if(body('condition').equals('CREDIT'))
      .isArray({ min: 1 }).withMessage('Venta a crédito requiere cuotas')
      .custom((value) => {
         // Validación básica de estructura interna
         const isValid = value.every((i: any) => i.amount > 0 && i.dueDate);
         if (!isValid) throw new Error('Estructura de cuotas inválida');
         return true;
      }),

    // -----------------------------------------------------
    // 2. ITEMS
    // -----------------------------------------------------
    body('items')
      .isArray({ min: 1 }).withMessage('El carrito no puede estar vacío'),

    body('items.*.productId')
      .isInt({ min: 1 }).withMessage('Producto inválido')
      .toInt(),

    body('items.*.quantity')
      // Permitimos decimales si vendes por Kilo, o int si es unitario. 
      // isFloat es más seguro para ambos casos.
      .isFloat({ min: 0.001 }).withMessage('Cantidad inválida')
      .toFloat(),

    // NOTA: unitPrice y subTotal son opcionales en el DTO de entrada 
    // porque el Backend DEBE recalcularlos para evitar fraudes.
    // Si los pides, es solo referencial.

    // -----------------------------------------------------
    // 3. PAGOS
    // -----------------------------------------------------
    body('payments')
      .optional()
      .isArray(),
    
    body('payments.*.paymentMethodId')
      .if(body('payments').exists())
      .isInt({ min: 1 }).toInt(),

    body('payments.*.amount')
      .if(body('payments').exists())
      .isFloat({ min: 0.01 }).withMessage('Monto de pago inválido')
      .toFloat(),
  ];

  public validateUpdate: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
    
    body('status')
      .optional()
      .isIn(['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('El estado debe ser válido'),

    body('remainingBalance')
      .optional()
      .isFloat({ min: 0 }).withMessage('El saldo pendiente debe ser un número positivo')
      .toFloat(),

    body('paymentDueDate')
      .optional()
      .isISO8601().withMessage('La fecha de vencimiento debe tener formato válido (YYYY-MM-DD)')
  ];

  public validateList: ValidationChain[] = [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('La página debe ser un número entero positivo')
      .toInt(),

    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100')
      .toInt(),

    query('fromDate')
      .optional()
      .isISO8601().withMessage('La fecha inicial debe tener formato válido (YYYY-MM-DD)'),

    query('toDate')
      .optional()
      .isISO8601().withMessage('La fecha final debe tener formato válido (YYYY-MM-DD)'),

    query('clientId')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID del cliente debe ser un número entero positivo')
      .toInt(),

    query('status')
      .optional()
      .isIn(['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('El estado debe ser válido')
  ];

  public validateAddPayment: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido'),
    
    body('paymentMethodId')
      .notEmpty().withMessage('El ID del método de pago es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID del método de pago debe ser un número entero positivo')
      .toInt(),

    body('exchangeRateId')
      .notEmpty().withMessage('El ID de la tasa de cambio es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID de la tasa de cambio debe ser un número entero positivo')
      .toInt(),

    body('amount')
      .notEmpty().withMessage('El monto es obligatorio')
      .isFloat({ min: 0.01 }).withMessage('El monto debe ser un número positivo')
      .toFloat(),

    body('reference')
      .optional()
      .trim()
      .isString()
      .isLength({ max: 200 }).withMessage('La referencia no puede exceder 200 caracteres')
  ];

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];
}
