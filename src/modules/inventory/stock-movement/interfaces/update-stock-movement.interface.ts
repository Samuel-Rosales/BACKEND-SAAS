import { CreateStockMovementInterface } from './create-stock-movement.interface';
import { MovementType } from '@prisma/client';

export interface UpdateStockMovementInterface extends Partial<Pick<CreateStockMovementInterface, 'quantity' | 'reason' | 'date'>> {
  type?: MovementType;
}
