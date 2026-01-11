import { CreateBusinessInterface } from './create-business.interface';

export interface UpdateBusinessInterface extends Partial<CreateBusinessInterface> {
  exchangeRate?: number; // Permitimos actualizar la tasa base aquí
  currencySymbol?: string; // Símbolo de moneda (si existe en el schema)
}