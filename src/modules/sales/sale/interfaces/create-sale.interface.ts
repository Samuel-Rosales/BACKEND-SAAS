import { Conditions, SaleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export interface CreateSaleInstallmentDto {
    number: number;
    amount: Decimal;
    amountPaid?: Decimal; 
    dueDate: Date | string;
}

export interface CreateSaleItemDto {
    productId: number;
    productPresentationId?: number; // Opcional (Si es null, es la unidad base)
    quantity: number; // Cantidad visual (ej: 2 Cajas)
    price?: Decimal;   // Opcional: Sobreescribir precio del sistema
    depotId?: number;
    // discount?: number; // Opcional: Descuento por línea (Lo dejaremos para v3 si quieres simplificar ahora)
}

export interface CreateSalePaymentDto {
    paymentMethodId: number;
    exchangeRateId: number;
    amount: Decimal; // Monto nominal (ej: 100 Bs)
    reference?: string;
}

export interface CreateSaleInterface {
    clientId: number;
    exchangeRateId: number;
    type: SaleType; // RETAIL / WHOLESALE
    depotId: number;
    
    // --- FINANZAS ---
    discount: Decimal; // Descuento Global en dinero (ej: $5.00)
    
    // --- CONDICIONES ---
    condition: Conditions; // CASH / CREDIT
    installments?: CreateSaleInstallmentDto[]; // Obligatorio si es CREDIT

    items: CreateSaleItemDto[];
    payments: CreateSalePaymentDto[]; // Puede estar vacío si es Crédito total
    
    paymentDueDate?: Date | string; // Fecha límite general (para reportes rápidos)
    totalAmount?: Decimal; // Monto total final (para validación)
    subTotal?: Decimal; // Monto subtotal (para validación)
    taxAmount?: Decimal; // Monto total de impuestos (para validación)
}