export interface OrderItemInput {
  productId: number;
  quantity: number;
  salePrice: number;
  notes?: string;
}

export interface CreateOrderInterface {
  tableId?: number;
  clientId: number;
  notes?: string;
  items: OrderItemInput[];
}
