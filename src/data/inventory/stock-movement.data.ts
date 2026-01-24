export const stockMovements = [
  { businessId: 1, productId: 1, memberId: 2, depotId: 1, type: "IN", quantity: 50, historicalCost: 3.0, reason: "Compra inicial", date: new Date("2026-01-05T10:00:00Z").toISOString() },
  { businessId: 1, productId: 2, memberId: 2, depotId: 1, type: "IN", quantity: 100, historicalCost: 0.9, reason: "Compra inicial", date: new Date("2026-01-05T10:05:00Z").toISOString() },
  { businessId: 1, productId: 1, memberId: 2, depotId: 1, type: "OUT", quantity: 2, historicalCost: 3.0, reason: "Venta #1", date: new Date("2026-01-15T12:05:00Z").toISOString() },
  { businessId: 1, productId: 2, memberId: 2, depotId: 1, type: "OUT", quantity: 3, historicalCost: 0.9, reason: "Venta #2", date: new Date("2026-01-16T10:03:00Z").toISOString() },

  // Business 1 - reposición y movimientos internos
  { businessId: 1, productId: 1, memberId: 4, depotId: 1, type: "IN", quantity: 30, historicalCost: 3.05, reason: "Compra reposición", date: new Date("2026-01-20T10:00:00Z").toISOString() },
  { businessId: 1, productId: 4, memberId: 4, depotId: 3, type: "IN", quantity: 120, historicalCost: 0.33, reason: "Compra reposición", date: new Date("2026-01-18T10:00:00Z").toISOString() },
  { businessId: 1, productId: 5, memberId: 4, depotId: 1, type: "IN", quantity: 48, historicalCost: 1.05, reason: "Compra lácteos", date: new Date("2026-01-18T10:05:00Z").toISOString() },
  { businessId: 1, productId: 6, memberId: 5, depotId: 3, type: "IN", quantity: 60, historicalCost: 0.38, reason: "Producción panadería", date: new Date("2026-01-18T10:07:00Z").toISOString() },
  { businessId: 1, productId: 7, memberId: 5, depotId: 1, type: "IN", quantity: 20, historicalCost: 1.75, reason: "Compra limpieza", date: new Date("2026-01-18T10:10:00Z").toISOString() },
  { businessId: 1, productId: 8, memberId: 5, depotId: 1, type: "IN", quantity: 100, historicalCost: 0.22, reason: "Compra limpieza", date: new Date("2026-01-18T10:10:00Z").toISOString() },
  { businessId: 1, productId: 11, memberId: 4, depotId: 1, type: "IN", quantity: 40, historicalCost: 1.15, reason: "Compra abarrotes", date: new Date("2026-01-18T10:12:00Z").toISOString() },
  { businessId: 1, productId: 12, memberId: 4, depotId: 1, type: "IN", quantity: 25, historicalCost: 2.05, reason: "Compra lácteos", date: new Date("2026-01-18T10:15:00Z").toISOString() },
  { businessId: 1, productId: 4, memberId: 5, depotId: 1, type: "TRANSFER", quantity: 20, historicalCost: 0.33, reason: "Reabastecer almacén desde piso de venta", date: new Date("2026-01-19T11:00:00Z").toISOString() },
  { businessId: 1, productId: 2, memberId: 5, depotId: 1, type: "ADJUSTMENT", quantity: -2, historicalCost: 0.9, reason: "Merma / inventario físico", date: new Date("2026-01-19T12:00:00Z").toISOString() },

  // Business 2
  { businessId: 2, productId: 13, memberId: 10, depotId: 2, type: "IN", quantity: 40, historicalCost: 2.35, reason: "Compra reposición", date: new Date("2026-01-19T09:00:00Z").toISOString() },
  { businessId: 2, productId: 14, memberId: 10, depotId: 2, type: "IN", quantity: 80, historicalCost: 0.48, reason: "Compra reposición", date: new Date("2026-01-19T09:05:00Z").toISOString() },
  { businessId: 2, productId: 16, memberId: 11, depotId: 4, type: "IN", quantity: 50, historicalCost: 0.28, reason: "Producción hielo", date: new Date("2026-01-19T09:10:00Z").toISOString() },

  // Business 3
  { businessId: 3, productId: 17, memberId: 12, depotId: 5, type: "IN", quantity: 100, historicalCost: 0.85, reason: "Compra medicamentos", date: new Date("2026-01-20T09:00:00Z").toISOString() },
  { businessId: 3, productId: 18, memberId: 12, depotId: 5, type: "IN", quantity: 50, historicalCost: 0.95, reason: "Compra cuidado personal", date: new Date("2026-01-20T09:05:00Z").toISOString() },
  { businessId: 3, productId: 19, memberId: 12, depotId: 5, type: "IN", quantity: 20, historicalCost: 4.2, reason: "Compra cuidado personal", date: new Date("2026-01-20T09:08:00Z").toISOString() },

  // Salidas por ventas
  { businessId: 1, productId: 5, memberId: 2, depotId: 1, type: "OUT", quantity: 2, historicalCost: 1.05, reason: "Venta #3", date: new Date("2026-01-20T12:05:00Z").toISOString() },
  { businessId: 1, productId: 6, memberId: 2, depotId: 3, type: "OUT", quantity: 5, historicalCost: 0.38, reason: "Venta #3", date: new Date("2026-01-20T12:06:00Z").toISOString() },

  { businessId: 2, productId: 13, memberId: 9, depotId: 2, type: "OUT", quantity: 2, historicalCost: 2.35, reason: "Venta B2 #1", date: new Date("2026-01-20T10:03:00Z").toISOString() },
  { businessId: 2, productId: 14, memberId: 9, depotId: 2, type: "OUT", quantity: 5, historicalCost: 0.48, reason: "Venta B2 #1", date: new Date("2026-01-20T10:03:30Z").toISOString() },

  { businessId: 3, productId: 17, memberId: 13, depotId: 5, type: "OUT", quantity: 2, historicalCost: 0.85, reason: "Venta B3 #1", date: new Date("2026-01-21T11:03:00Z").toISOString() },
  { businessId: 3, productId: 18, memberId: 13, depotId: 5, type: "OUT", quantity: 1, historicalCost: 0.95, reason: "Venta B3 #1", date: new Date("2026-01-21T11:03:30Z").toISOString() },

  // Devoluciones (Notas de crédito)
  { businessId: 1, productId: 1, memberId: 2, depotId: 1, type: "RETURN", quantity: 1, historicalCost: 3.0, reason: "Nota de crédito #1", date: new Date("2026-01-16T10:01:00Z").toISOString() },
  { businessId: 2, productId: 14, memberId: 9, depotId: 2, type: "RETURN", quantity: 1, historicalCost: 0.48, reason: "Nota de crédito B2 #1", date: new Date("2026-01-20T11:01:00Z").toISOString() }
];
