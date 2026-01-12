import { CashStatus } from '@prisma/client';

export interface UpdateCashRegisterInterface {
  status?: CashStatus;
  finalAmount?: number;
  closeTime?: Date;
}
