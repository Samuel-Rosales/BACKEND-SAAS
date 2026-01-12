import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';

export class PurchaseValidator {

  public validateCreate: ValidationChain[] = [
    // --- 1. CABECERA Y RELACIONES ---
    body('supplierId')
      .notEmpty().withMessage('El ID del proveedor es obligatorio')
      .isInt().withMessage('El ID del proveedor debe ser un número entero')
      .toInt()
      .custom(async (id, { req }) => {
        const businessId = req.user.businessId;
        if (!businessId) return true;

        const supplier = await prisma.supplier.findFirst({
          where: { id: Number(id), businessId: Number(businessId) }
        });

        if (!supplier) throw new Error('El proveedor no existe o no pertenece a tu negocio.');
        if (!supplier.isActive) throw new Error('El proveedor está inactivo y no se le puede comprar.');
        return true;
      }),

    body('exchangeRateId')
      .notEmpty().withMessage('La tasa de cambio es obligatoria')
      .isInt().withMessage('El ID de la tasa debe ser un número entero')
      .toInt()
      .custom(async (id) => {
        const rate = await prisma.exchangeRate.findUnique({ where: { id: Number(id) } });
        if (!rate) throw new Error('La tasa de cambio seleccionada no existe.');
        return true;
      }),

    body('reference')
      .optional()
      .trim()
      .isString().withMessage('La referencia debe ser texto'),

    body('observation')
      .optional()
      .trim()
      .isString().withMessage('La observación debe ser texto'),

    // --- 2. TOTALES FINANCIEROS ---
    body('subTotal')
      .notEmpty().withMessage('El SubTotal es obligatorio')
      .isFloat({ min: 0 }).withMessage('El SubTotal debe ser un número positivo'),

    body('taxAmount')
      .notEmpty().withMessage('El monto de impuestos es obligatorio')
      .isFloat({ min: 0 }).withMessage('El impuesto debe ser un número positivo (puede ser 0)'),

    body('totalCost')
      .notEmpty().withMessage('El costo total es obligatorio')
      .isFloat({ min: 0 }).withMessage('El costo total debe ser un número positivo'),

    // --- 3. ITEMS (Validación de Array) ---
    body('items')
      .isArray({ min: 1 }).withMessage('Debes agregar al menos un producto a la compra'),

    body('items.*.productId')
      .isInt().withMessage('El ID del producto debe ser un entero'),

    body('items.*.depotId')
      .isInt().withMessage('El ID del almacén debe ser un entero'),

    body('items.*.quantity')
      .isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0')
      .toInt(),

    body('items.*.unitCost')
      .isFloat({ min: 0 }).withMessage('El costo unitario no puede ser negativo')
      .toFloat(),

    body('items.*.expirationDate')
      .optional({ nullable: true })
      .isISO8601().withMessage('La fecha de vencimiento debe tener formato válido (YYYY-MM-DD)'),

    // --- 4. PAGOS (Validación de Array) ---
    body('payments')
      .isArray().withMessage('El campo pagos debe ser un arreglo'),
    
    // (Opcional: Si exiges al menos un pago, usa { min: 1 })
    
    body('payments.*.paymentMethodId')
      .isInt().withMessage('El método de pago debe ser un ID válido'),

    body('payments.*.amount')
      .isFloat({ min: 0.01 }).withMessage('El monto del pago debe ser mayor a 0'),

    body('payments.*.currency')
      .isIn(['USD', 'VES']).withMessage('La moneda del pago debe ser USD o VES'),
      
    body('payments.*.reference')
      .optional()
      .trim()
      .isString()
  ];

  // No solemos tener validateUpdate en Compras porque son documentos inmutables contablemente.
  // Si necesitas editar observaciones, podrías agregar uno pequeño aquí.

  public validateList: ValidationChain[] = [
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('La página debe ser un número mayor a 0')
      .toInt(),
    
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('El límite debe ser entre 1 y 100')
      .toInt(),

    query('fromDate')
      .optional()
      .isISO8601().withMessage('La fecha "desde" debe ser válida (YYYY-MM-DD)'),

    query('toDate')
      .optional()
      .isISO8601().withMessage('La fecha "hasta" debe ser válida (YYYY-MM-DD)')
  ];

  public validateId: ValidationChain[] = [
    param('id')
      .isInt().withMessage('ID de compra inválido')
      .toInt()
  ];
}