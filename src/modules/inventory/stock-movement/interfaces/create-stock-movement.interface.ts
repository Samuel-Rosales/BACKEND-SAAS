import { MovementType } from '@prisma/client';

export interface CreateStockMovementInterface {
  productId: number;
  memberId: number;
  depotId: number;
  type: MovementType;
  quantity: number;
  reason?: string;
  date?: Date;
}
