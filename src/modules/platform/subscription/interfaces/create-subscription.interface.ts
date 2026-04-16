import { PlanType, SubStatus } from '@prisma/client';

export interface CreateSubscriptionInterface {
  businessId: number;
  // Compatibilidad: se acepta planType (legacy) o planId (nuevo catálogo)
  planType?: PlanType;
  planId?: number;
  status: SubStatus;
  startDate: Date;
  endDate: Date;
  lastPaymentRef: string;
}
