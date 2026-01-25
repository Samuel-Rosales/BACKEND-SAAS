// interfaces.ts
import { Currency } from '@prisma/client'; 

export interface CashCountInput {
    denomination: number; // Ej: 10.00
    quantity: number;     // Ej: 5
    currency: Currency;   // 'USD' | 'VES'
    exchangeRateId: number;
}

export interface CreateCashRegisterInterface {
    initialAmount: number; // Monto base total reportado
    denominations?: CashCountInput[]; // Detalle opcional (Billetes de apertura)
}

export interface CloseCashRegisterInterface {
    finalAmount: number; // Total contado por el usuario
    counts: CashCountInput[]; // DETALLE OBLIGATORIO (Billetes de cierre)
    closeTime?: Date;
}