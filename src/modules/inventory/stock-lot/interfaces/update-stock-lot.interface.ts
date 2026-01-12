import { CreateStockLotInterface } from './create-stock-lot.interface';

export interface UpdateStockLotInterface extends Partial<Omit<CreateStockLotInterface, 'productId' | 'depotId'>> {}
