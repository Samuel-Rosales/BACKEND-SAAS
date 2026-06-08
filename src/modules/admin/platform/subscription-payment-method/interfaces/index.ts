import { PaymentType } from '@prisma/client';

export interface CreateSubscriptionPaymentMethodInterface {
  name: string;
  type: PaymentType;
  currency: string;
  isActive?: boolean;
  details?: Record<string, any> | null;
}

export interface UpdateSubscriptionPaymentMethodInterface {
  name?: string;
  type?: PaymentType;
  currency?: string;
  isActive?: boolean;
  details?: Record<string, any> | null;
}
