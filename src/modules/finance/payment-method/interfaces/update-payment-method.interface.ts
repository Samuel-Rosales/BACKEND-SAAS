import { CreatePaymentMethodInterface } from './create-payment-method.interface';
import { PaymentType } from '@prisma/client';

export interface UpdatePaymentMethodInterface extends Partial<Omit<CreatePaymentMethodInterface, 'name'>> {
  type?: PaymentType;
}
