import { CreateBusinessDto } from './create-business.interface';

export interface UpdateBusinessDto extends Partial<CreateBusinessDto> {
  exchangeRate?: number; // Permitimos actualizar la tasa base aquí
}