import { PlanType, SubStatus } from '@prisma/client';

export interface CreateSubscriptionInterface {
  businessId: number;
  planType: PlanType;
  status: SubStatus;
  startDate: Date;
  endDate: Date;
  lastPaymentRef: string;
}
