import { Currency, PlanType } from '@prisma/client';

export interface CreateSubscriptionPaymentInterface {
  // Compatibilidad: se acepta planType (legacy) o planId (nuevo catálogo)
  planType?: PlanType;
  planId?: number;
  monthsPurchased: number;
  amount: number;
  currency: Currency;
  reference: string;
  proofUrl?: string;
  reviewNote?: string;
}
