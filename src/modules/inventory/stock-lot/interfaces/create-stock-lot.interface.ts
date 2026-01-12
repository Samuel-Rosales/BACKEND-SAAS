export interface CreateStockLotInterface {
  productId: number;
  depotId: number;
  quantity: number;
  expirationDate: Date;
  lotCost: number;
}
