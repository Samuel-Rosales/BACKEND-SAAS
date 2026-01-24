import { Conditions } from "@prisma/client";

export interface CreatePurchaseInstallment {
    number: number;
    amount: number;
    dueDate: Date | string;
}

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
    amount: number;       // El monto tal cual lo pagó el usuario (Ej: 100 Bs)
    reference: string;   // Referencia bancaria / Zelle
}

// DTO Principal de Creación (Cabecera)
export interface CreatePurchaseInterface {
    supplierId: number;
    subTotal: number;
    taxAmount: number;
    totalCost: number;
    exchangeRateId: number; // Validación de seguridad
    reference?: string;
    observation?: string;
    
    // --- NUEVOS CAMPOS ---
    condition: Conditions; // CONTADO o CRÉDITO
    installments?: CreatePurchaseInstallment[]; // Opcional, solo si es crédito

    items: CreatePurchaseItemDto[];

    payments: PurchasePaymentDto[];
}

export interface CreatePaymentDto {
    // 1. ¿Cómo paga? (Zelle, Pago Móvil, Efectivo USD)
    paymentMethodId: number; 

    // 2. ¿A qué tasa? (Vital para la conversión si paga en Bs)
    exchangeRateId: number;  

    // 3. ¿Cuánto paga? (El número que sale en el comprobante bancario)
    amount: number;          

    // 4. ¿Cuál es el comprobante? (Opcional, pues Efectivo no suele tener)
    reference?: string;      
}