import { PaymentType } from '@prisma/client';

export interface CreatePaymentMethodInterface {
  name: string;
  type: PaymentType;
  currency: string;
  isActive?: boolean;
}
