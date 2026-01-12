import { CreateStockGeneralInterface } from './create-stock-general.interface';

export interface UpdateStockGeneralInterface extends Partial<Pick<CreateStockGeneralInterface, 'quantity'>> {}
