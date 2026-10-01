import { BudgetStatus, Conditions } from '@prisma/client';

export interface CreateBudgetItemDto {
    productId: number;
    productPresentationId?: number | null;
    quantity: number;
    unitPrice: number;
    discountPercentage?: number;
    notes?: string;
}

export interface CreateBudgetDto {
    clientId: number;
    exchangeRateId?: number;
    validUntil?: Date | string;
    discount?: number;
    notes?: string;
    items: CreateBudgetItemDto[];
}

export interface UpdateBudgetDto {
    clientId?: number;
    exchangeRateId?: number;
    validUntil?: Date | string;
    discount?: number;
    notes?: string;
    items?: CreateBudgetItemDto[];
}

export interface BudgetFilterQuery {
    page?: number;
    limit?: number;
    status?: BudgetStatus | 'ACTIVE' | 'PURGEABLE';
    clientId?: number;
    fromDate?: string;
    toDate?: string;
    search?: string;
    tzOffset?: number;
}

export interface ConvertBudgetPaymentDto {
    paymentMethodId: number;
    amount: number;
    reference: string;
    exchangeRateId?: number;
    paymentProofUrl?: string;
}

export interface ConvertBudgetToSaleDto {
    clientId?: number;
    depotId?: number;
    condition: Conditions;
    installments?: {
        number: number;
        amount: number;
        dueDate: Date | string;
    }[];
    payments: ConvertBudgetPaymentDto[];
    paymentDueDate?: Date | string;
}

export interface PriceCheckItem {
    productId: number;
    productPresentationId?: number | null;
    productName: string;
    presentationName?: string | null;
    quantity: number;
    quotedPrice: number;
    currentPrice: number;
    difference: number;
    hasChanged: boolean;
    currentStock: number;
    discountPercentage: number;
    subTotalQuoted: number;
    subTotalCurrent: number;
}

export interface PriceCheckResult {
    hasPriceChanges: boolean;
    currentExchangeRate: number;
    quotedExchangeRate: number;
    items: PriceCheckItem[];
    originalTotal: number;
    newSubTotal: number;
    newTaxAmount: number;
    newTotalAmount: number;
    newTotalBs: number;
}
