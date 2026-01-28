export const purchases = [
  { businessId: 1, supplierId: 1, memberId: 4, taxId: 1, subTotal: 240.0, taxAmount: 38.4, totalCost: 278.4, status: "COMPLETED", exchangeRateId: 3, reference: "FAC-00045", observation: "Sin novedad", createdAt: new Date("2026-01-05T09:00:00Z").toISOString(), conditions: "CASH", paymentStatus: "PAID", remainingBalance: 0.0, paymentDueDate: null },

  // Business 1 - compra a crédito (parcial)
  { businessId: 1, supplierId: 2, memberId: 4, taxId: 1, subTotal: 101.65, taxAmount: 16.26, totalCost: 117.91, status: "COMPLETED", exchangeRateId: 3, reference: "FAC-00046", observation: "Recibido completo", createdAt: new Date("2026-01-18T09:00:00Z").toISOString(), conditions: "CREDIT", paymentStatus: "PARTIAL", remainingBalance: 60.0, paymentDueDate: new Date("2026-02-15").toISOString() },

  // Business 1 - compra de limpieza (contado)
  { businessId: 1, supplierId: 5, memberId: 4, taxId: 1, subTotal: 57.0, taxAmount: 9.12, totalCost: 66.12, status: "COMPLETED", exchangeRateId: 3, reference: "FAC-00047", observation: "Sin novedad", createdAt: new Date("2026-01-18T09:30:00Z").toISOString(), conditions: "CASH", paymentStatus: "PAID", remainingBalance: 0.0, paymentDueDate: null },

  // Business 2
  { businessId: 2, supplierId: 3, memberId: 10, taxId: 1, subTotal: 132.4, taxAmount: 21.18, totalCost: 153.58, status: "COMPLETED", exchangeRateId: 5, reference: "N-00012", observation: "Entrega parcial revisada", createdAt: new Date("2026-01-19T08:30:00Z").toISOString(), conditions: "CASH", paymentStatus: "PAID", remainingBalance: 0.0, paymentDueDate: null },

  // Business 3 (Farmacia)
  { businessId: 3, supplierId: 4, memberId: 12, taxId: 1, subTotal: 132.5, taxAmount: 7.6, totalCost: 140.1, status: "COMPLETED", exchangeRateId: 6, reference: "FAR-0099", observation: "Lote en buen estado", createdAt: new Date("2026-01-20T08:00:00Z").toISOString(), conditions: "CASH", paymentStatus: "PAID", remainingBalance: 0.0, paymentDueDate: null }
];
