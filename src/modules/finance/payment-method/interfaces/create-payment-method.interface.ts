import { PaymentType } from '@prisma/client';

export interface CreatePaymentMethodInterface {
  name: string;
  type: PaymentType;
  isActive?: boolean;
}
