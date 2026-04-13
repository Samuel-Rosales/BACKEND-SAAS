import { UnitType } from "@prisma/client";

export interface CreateMeasurementUnitInterface {
  name: string;
  symbol: string;
  type: UnitType
  isActive?: boolean;
}
