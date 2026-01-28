import { Conditions } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";

// DTO para Cuotas
export interface CreatePurchaseInstallment {
    number: number;
    amount: number | Decimal; // Aceptamos ambos para flexibilidad en el servicio
    dueDate: Date | string;
}

// DTO para Items
export interface CreatePurchaseItemDto {
    productId: number;
    depotId: number;
    productPresentationId?: number; // Opcional (Cajas, Packs)
    
    quantity: number | Decimal;     // Usamos number|Decimal para que TS no se queje si pasas un float simple
    unitCost: number | Decimal;     // Costo unitario
    expirationDate?: string;        // "YYYY-MM-DD"
}

// DTO para Pagos Iniciales
export interface PurchasePaymentDto {
    paymentMethodId: number;
    exchangeRateId: number;  // <--- Agregado según tu DTO de CreatePaymentDto
    amount: number | Decimal;
    reference: string;
}

// DTO Principal (Cabecera)
export interface CreatePurchaseInterface {
    supplierId: number;
    exchangeRateId: number; // Tasa global de la factura (para referencia)
    
    // --- NUEVO: ID del Impuesto (Obligatorio) ---
    taxId: number; 

    // Totales
    subTotal: number | Decimal;
    taxAmount: number | Decimal;
    totalCost: number | Decimal;
    
    reference?: string;   // Nro Factura Proveedor
    observation?: string;
    
    // Condiciones
    condition: Conditions;
    installments?: CreatePurchaseInstallment[];

    // Detalle
    items: CreatePurchaseItemDto[];
    payments: PurchasePaymentDto[];
}

// DTO para el endpoint de "Agregar un Pago extra" (POST /purchases/:id/payments)
export interface CreatePaymentDto {
    paymentMethodId: number;
    exchangeRateId: number;  
    amount: number | Decimal;          
    reference?: string;      
}

export interface FindPurchasesQuery {
    page?: number;
    limit?: number;
    search?: string;        // Buscador
    paymentStatus?: string; // Filtro: PENDING, PAID, PARTIAL
    fromDate?: string;
    toDate?: string;
}