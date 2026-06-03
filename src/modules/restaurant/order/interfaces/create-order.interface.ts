export interface OrderItemInput {
  productId: number;
  quantity: number;
  unitPrice: number;
  notes?: string;
}

export interface CreateOrderInterface {
  tableId?: number;
  clientId: number;
  notes?: string;
  items: OrderItemInput[];
}
