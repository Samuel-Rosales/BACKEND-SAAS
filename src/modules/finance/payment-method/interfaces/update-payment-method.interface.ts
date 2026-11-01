import { CreatePaymentMethodInterface } from './create-payment-method.interface';
import { PaymentType } from '@prisma/client';

export interface UpdatePaymentMethodInterface extends Partial<CreatePaymentMethodInterface> {
  name?: string;
  type?: PaymentType;
  currency?: string;
  isActive?: boolean;
}
