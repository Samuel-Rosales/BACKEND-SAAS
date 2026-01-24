import { ExchangeRateStrategy } from '@prisma/client';

export interface CreateExchangeRateInterface {
  rate: number;
  source?: ExchangeRateStrategy;
  isActive?: boolean;
  createdAt?: string; // ISO string
}
