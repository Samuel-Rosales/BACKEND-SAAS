import { UnitType } from "@prisma/client";

export const measurementUnits = [
  { name: "Unidad", symbol: "Und", isActive: true, type: UnitType.UNIT },
  { name: "Litro", symbol: "L", isActive: true, type: UnitType.VOLUME },
  { name: "Kilogramo", symbol: "Kg", isActive: true, type: UnitType.MASS },
  { name: "Servicio", symbol: "Srv", isActive: true, type: UnitType.UNIT }
];
