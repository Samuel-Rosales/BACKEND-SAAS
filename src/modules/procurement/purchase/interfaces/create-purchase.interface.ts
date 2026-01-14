// DTO para cada línea de producto (Simplificado y con Destino)
export interface CreatePurchaseItemDto {
    productId: number;
    depotId: number;    // <--- NUEVO: Cada producto puede ir a un almacén distinto
    productPresentationId?: number; // Opcional (si es null, es la unidad base)
    quantity: number;
    unitCost: number;   // Costo unitario según factura
    expirationDate?: string; // "YYYY-MM-DD" (Opcional. Backend pondrá 2099 si falta)
}

// DTO para los pagos (Soporte bi-monetario)
export interface PurchasePaymentDto {
    paymentMethodId: number;
    exchangeRateId: number; // Tasa del día (para conversión)
    amount: number;       // El monto tal cual lo pagó el usuario (Ej: 100 Bs)
    currency: 'USD' | 'VES'; // Moneda del pago físico
    reference: string;   // Referencia bancaria / Zelle

}

// DTO Principal de Creación (Cabecera)
export interface CreatePurchaseInterface {
    supplierId: number;
    exchangeRateId: number; // ID de la tasa del día (para conversiones)
    
    // Metadatos de la Factura Física
    reference?: string;     // Nro de Factura del Proveedor (Ej: "A-00459")
    observation: string;   // Notas adicionales

    // Desglose Financiero (El frontend envía los cálculos para validación)
    subTotal: number;       // Suma de items
    taxAmount: number;      // Monto del IVA
    totalCost: number;      // Total Final (SubTotal + Tax)

    // Arrays de datos
    items: CreatePurchaseItemDto[];
    payments: PurchasePaymentDto[];
}