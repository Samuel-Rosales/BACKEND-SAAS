import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class SaleValidator {

  public validateCreate: ValidationChain[] = [
    // Cabecera
    body('clientId')
      .notEmpty().withMessage('El ID del cliente es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID del cliente debe ser un número entero positivo')
      .toInt()
      .custom(async (value, { req }) => {
        const businessId = req.user?.businessId;
        if (!businessId) return true;

        const client = await prisma.client.findFirst({
          where: { id: value, businessId: Number(businessId) }
        });
        if (!client) {
          throw new Error('El cliente no existe o no pertenece a este negocio');
        }
        return true;
      }),

    body('memberId')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID del vendedor debe ser un número entero positivo')
      .toInt(),

    body('exchangeRateId')
      .notEmpty().withMessage('El ID de la tasa de cambio es obligatorio')
      .isInt({ min: 1 }).withMessage('El ID de la tasa de cambio debe ser un número entero positivo')
      .toInt()
      .custom(async (value) => {
        const exchangeRate = await prisma.exchangeRate.findUnique({
          where: { id: value, isActive: true }
        });
        if (!exchangeRate) {
          throw new Error('La tasa de cambio no existe o está inactiva');
        }
        return true;
      }),

    body('type')
      .optional()
      .isIn(['RETAIL', 'WHOLESALE']).withMessage('El tipo de venta debe ser RETAIL o WHOLESALE'),

    body('status')
      .optional()
      .isIn(['PENDING', 'COMPLETED', 'CANCELLED', 'REFUNDED']).withMessage('El estado debe ser válido'),

    body('totalAmount')
      .notEmpty().withMessage('El total de la venta es obligatorio')
      .isFloat({ min: 0 }).withMessage('El total debe ser un número positivo')
      .toFloat(),

    body('remainingBalance')
      .optional()
      .isFloat({ min: 0 }).withMessage('El saldo pendiente debe ser un número positivo')
      .toFloat(),

    body('paymentDueDate')
      .optional()
      .isISO8601().withMessage('La fecha de vencimiento debe tener formato válido (YYYY-MM-DD)'),

    // Items
    body('items')
      .isArray({ min: 1 }).withMessage('Debes agregar al menos un producto a la venta'),

    body('items.*.productId')
      .isInt({ min: 1 }).withMessage('El ID del producto debe ser un entero positivo')
      .toInt(),

    body('items.*.productPresentationId')
      .optional()
      .isInt({ min: 1 }).withMessage('El ID de la presentación debe ser un entero positivo')
      .toInt(),

    body('items.*.quantity')
      .isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0')
      .toInt(),

    body('items.*.unitPrice')
      .isFloat({ min: 0 }).withMessage('El precio unitario no puede ser negativo')
      .toFloat(),

    body('items.*.subTotal')
      .isFloat({ min: 0 }).withMessage('El subtotal no puede ser negativo')
      .toFloat(),

    // Pagos
    body('payments')
      .isArray().withMessage('El campo pagos debe ser un arreglo'),
    
    body('payments.*.paymentMethodId')
      .isInt({ min: 1 }).withMessage('El método de pago debe ser un ID válido')
      .toInt(),

    body('payments.*.exchangeRateId')
      .isInt({ min: 1 }).withMessage('El ID de la tasa de cambio del pago debe ser un número entero positivo')
      .toInt(),

    body('payments.*.amount')
      .isFloat({ min: 0.01 }).withMessage('El monto del pago debe ser mayor a 0')
      .toFloat(),

    body('payments.*.currency')
      .isIn(['USD', 'VES']).withMessage('La moneda del pago debe ser USD o VES'),
      
    body('payments.*.reference')
      .optional()
      .trim()
      .isString()
      .isLength({ max: 200 }).withMessage('La referencia no puede exceder 200 caracteres')
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

  public validateId: ValidationChain[] = [
    param('id').isInt().toInt().withMessage('ID inválido')
  ];
}
