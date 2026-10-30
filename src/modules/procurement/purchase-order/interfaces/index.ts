import { PurchaseOrderStatus } from "@prisma/client";

export interface CreatePurchaseOrderItemDto {
  productId: number;
  productPresentationId?: number | null;
  quantity: number;
  unitCost: number;
}

export interface CreatePurchaseOrderDto {
  supplierId: number;
  depotId: number;
  expectedDeliveryDate?: string | null;
  notes?: string | null;
  items: CreatePurchaseOrderItemDto[];
}

export interface ReceivePurchaseOrderDto {
  taxId: number;
  condition: 'CASH' | 'CREDIT';
  reference?: string; // Nro Factura / Guia física del proveedor
  observation?: string;
  items: Array<{
    productId: number;
    depotId: number;
    productPresentationId?: number | null;
    quantity: number;
    unitCost: number;
    expirationDate?: string;
  }>;
  payments?: Array<{
    paymentMethodId: number;
    exchangeRateId: number;
    amount: number;
    reference: string;
  }>;
  installments?: Array<{
    number: number;
    amount: number;
    dueDate: string;
  }>;
}

export interface FindPurchaseOrdersQuery {
  page?: string | number;
  limit?: string | number;
  status?: PurchaseOrderStatus | 'ALL';
  supplierId?: string | number;
  search?: string;
}
