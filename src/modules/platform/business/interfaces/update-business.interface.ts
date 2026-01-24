import { ExchangeRateStrategy } from '@prisma/client';
import { CreateBusinessInterface } from './create-business.interface';

export interface UpdateBusinessInterface extends Partial<CreateBusinessInterface> {
  exchangeRate?: number; // Permitimos actualizar la tasa base aquí
  currencySymbol?: string; // Símbolo de moneda (si existe en el schema)
}

export interface UpdateExchangeConfigInterface {
  strategy: ExchangeRateStrategy;
  manualRate?: number; // Solo requerido si strategy === MANUAL
}