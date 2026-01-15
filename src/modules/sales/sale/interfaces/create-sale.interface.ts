// =================================================================
// 1. ITEMS (Detalle de productos)
// =================================================================
export interface CreateSaleItemDto {
    productId: number;
    productPresentationId?: number; // Opcional (si es null, es la unidad base)
    
    quantity: number;
    unitPrice: number; // Precio unitario bruto (o neto, según tu config de impuestos)
    
    // El frontend envía esto para "doble chequeo", 
    // pero el backend debe recalcular (quantity * unitPrice) y validar que coincida.
    subTotal: number;
    stockLotId?: number; // Opcional: Para ventas con lotes específicos
}

// =================================================================
// 2. PAGOS (Bi-monetario)
// =================================================================
export interface SalePaymentDto {
    paymentMethodId: number;
    exchangeRateId: number; // ID de la tasa usada para este pago específico
    
    amount: number; // Monto numérico
    currency: 'USD' | 'VES'; // Moneda original del pago
    
    reference?: string; // Opcional: "Zelle #12345", "Lote #999"
}

// =================================================================
// 3. CABECERA (La Venta Principal)
// =================================================================
export interface CreateSaleInterface {
    clientId: number;
    memberId: number; // ID del Vendedor asignado a la venta
    exchangeRateId: number; // ID de la tasa global del día (para reportes)

    // --- Lógica de Negocio ---
    conditions: 'CASH' | 'CREDIT';
    type: 'RETAIL' | 'WHOLESALE'; // Default: RETAIL (backend)
    
    // Nota: Eliminamos 'status' y 'creditStatus' porque al crear la venta:
    // 1. status siempre nace como 'COMPLETED' (o 'DRAFT' si tienes carrito).
    // 2. paymentStatus se calcula solo (si payments >= total ? PAID : PENDING).

    // --- Totales y Desglose Fiscal (Nuevo) ---
    // Enviamos el desglose para asegurar que el frontend y backend coincidan en los centavos
    subTotal: number;  // Base imponible
    taxAmount: number; // Monto del IVA
    discount?: number; // Opcional: Descuentos globales
    totalAmount: number; // La suma final que el cliente debe pagar

    // --- Crédito (Solo si conditions === 'CREDIT') ---
    // Eliminamos 'remainingBalance' por seguridad (el backend lo calcula: total - pagos)
    paymentDueDate?: string; // Obligatorio si es CREDIT. Formato ISO: "2023-12-31"

    // --- Arrays de Datos ---
    items: CreateSaleItemDto[];
    payments: SalePaymentDto[]; // Puede estar vacío si es 100% Crédito
}