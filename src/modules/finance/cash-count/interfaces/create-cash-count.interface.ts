import { CashCountType } from '@prisma/client';

export interface CreateCashCountInterface {
  cashRegisterId: number;
  denomination: number;
  quantity: number;
  currency: string;
  exchangeRateId: number;
  type: CashCountType;
}
