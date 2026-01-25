import { Product, SaleItem, SaleItemLot } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/client";

export interface CreditNoteItemInput {
    productId: number;
    quantity: number;
    returnToStock: boolean; 
}

export interface CreateCreditNoteInterface {
    saleId: number;
    reason: string;
    items: CreditNoteItemInput[];
}

export interface ItemProcessingData {
    originalItem: SaleItem & {
        product: Product;
        lotAllocations: SaleItemLot[];
    };
    quantityToReturn: Decimal;
    refundAmount: Decimal;
    ratio: Decimal;
    returnToStock: boolean;
}

export interface ListCreditNoteQuery {
    page?: number;
    limit?: number;
    fromDate?: string; // YYYY-MM-DD
    toDate?: string;   // YYYY-MM-DD
    clientId?: number;
    saleId?: number;   // Por si quieren ver las notas de una venta específica
    search?: string;   // Búsqueda por motivo o número
}