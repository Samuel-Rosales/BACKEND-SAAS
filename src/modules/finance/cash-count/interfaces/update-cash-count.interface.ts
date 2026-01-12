import { CreateCashCountInterface } from './create-cash-count.interface';

export interface UpdateCashCountInterface extends Partial<Omit<CreateCashCountInterface, 'cashRegisterId' | 'type'>> {}
