import { Currency, PlanType } from '@prisma/client';

export interface CreateSubscriptionPaymentInterface {
  planType: PlanType;
  monthsPurchased: number;
  amount: number;
  currency: Currency;
  reference: string;
  proofUrl?: string;
  reviewNote?: string;
}
