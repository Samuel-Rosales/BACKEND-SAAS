import { body, param, query, ValidationChain } from 'express-validator';
import { prisma } from '@/configs';
import { Conditions } from '@prisma/client'; // Importamos el Enum

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
      .toInt(),

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

    // --- [NUEVO] 2.5 CONDICIONES DE PAGO Y CUOTAS ---
    body('condition')
      .notEmpty().withMessage('La condición de pago es obligatoria')
      .isIn([Conditions.CASH, Conditions.CREDIT]).withMessage('La condición debe ser CASH o CREDIT'),

    // Validación condicional para Cuotas
    body('installments')
      .if(body('condition').equals(Conditions.CREDIT))
      .isArray({ min: 1 }).withMessage('Si la compra es a crédito, debes definir al menos una cuota de pago'),

    body('installments.*.number')
      .if(body('installments').exists())
      .isInt({ min: 1 }).withMessage('El número de cuota debe ser un entero positivo'),

    body('installments.*.amount')
      .if(body('installments').exists())
      .isFloat({ min: 0.01 }).withMessage('El monto de la cuota debe ser mayor a 0'),

    body('installments.*.dueDate')
      .if(body('installments').exists())
      .isISO8601().withMessage('La fecha de vencimiento de la cuota debe ser válida (YYYY-MM-DD)'),


    // --- 3. ITEMS (Validación de Array) ---
    body('items')
      .isArray({ min: 1 }).withMessage('Debes agregar al menos un producto a la compra'),

    body('items.*.productId')
      .isInt().withMessage('El ID del producto debe ser un entero'),

    body('items.*.depotId')
      .isInt().withMessage('El ID del almacén debe ser un entero'),

    body('items.*.quantity')
      .isInt({ min: 1 }).withMessage('La cantidad debe ser mayor a 0'),

    body('items.*.unitCost')
      .isFloat({ min: 0 }).withMessage('El costo unitario no puede ser negativo'),

    body('items.*.expirationDate')
      .optional({ nullable: true })
      .isISO8601().withMessage('La fecha de vencimiento debe tener formato válido (YYYY-MM-DD)'),

    // --- 4. PAGOS (Validación de Array) ---
    // [MODIFICADO]: Ahora es opcional (puede venir vacío si es crédito total)
    body('payments')
      .optional()
      .isArray().withMessage('El campo pagos debe ser un arreglo'),
    
    body('payments.*.paymentMethodId')
      .if(body('payments').exists())
      .isInt().withMessage('El método de pago debe ser un ID válido'),

    body('payments.*.amount')
      .if(body('payments').exists())
      .isFloat({ min: 0.01 }).withMessage('El monto del pago debe ser mayor a 0'),
      
    // Nota: 'currency' ya no es necesario validarlo aquí si el backend lo deduce del paymentMethodId,
    // pero si lo estás enviando desde el front, déjalo. Si no, quítalo.
    /*
    body('payments.*.currency')
      .if(body('payments').exists())
      .isIn(['USD', 'VES']).withMessage('La moneda del pago debe ser USD o VES'),
    */
      
    body('payments.*.reference')
      .if(body('payments').exists())
      .optional()
      .trim()
      .isString()
  ];

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
      // La validación de pertenencia al negocio se hace en el controlador/servicio
      // para evitar doble consulta a BD, pero si quieres hacerla aquí, está bien.
  ];
}