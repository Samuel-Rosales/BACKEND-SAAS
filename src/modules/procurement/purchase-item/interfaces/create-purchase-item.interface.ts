export interface CreatePurchaseItemInterface {
    purchaseId: number;
    productId: number;
    depotId: number;
    productPresentationId?: number;
    quantity: number;
    unitCost: number;
    expirationDate?: string; // "YYYY-MM-DD" (Opcional. Backend pondrá 2099 si falta)
}
