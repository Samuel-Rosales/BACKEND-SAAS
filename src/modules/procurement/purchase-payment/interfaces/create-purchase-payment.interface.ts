export interface CreatePurchasePaymentInterface {
    purchaseId: number;
    paymentMethodId: number;
    amount: number;
    currency: string; // 'USD' | 'VES'
    exchangeRateId: number;
    reference?: string;
}
