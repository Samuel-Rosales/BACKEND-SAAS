import { ExchangeRateStrategy } from '@prisma/client';
import { CreateBusinessInterface } from './create-business.interface';

export interface UpdateBusinessInterface extends Partial<CreateBusinessInterface> {}

export interface UpdateExchangeConfigInterface {
  strategy: ExchangeRateStrategy;
  manualRate?: number; // Solo requerido si strategy === MANUAL
}