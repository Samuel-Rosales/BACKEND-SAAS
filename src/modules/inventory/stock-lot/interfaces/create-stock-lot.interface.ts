export interface CreateStockLotInterface {
  productId: number;
  depotId: number;
  quantity: number;
  expirationDate: Date;
  lotCost: number;
}

export interface FindStockLotsQuery {
    productId?: number;
    depotId?: number;
    hasStock?: boolean; // Para filtrar solo los que tienen cantidad > 0
}