export const sales = [
  { businessId: 1, receiptNumber: 1, memberId: 2, clientId: 1, exchangeRateId: 3, type: "RETAIL", status: "COMPLETED", conditions: "CASH", paymentStatus: "PAID", subTotal: 7.0, taxAmount: 1.12, discount: 0.0, totalAmount: 8.12, remainingBalance: 0.0, paymentDueDate: null, createdAt: new Date("2026-01-15T12:00:00Z").toISOString(), updatedAt: new Date("2026-01-15T12:10:00Z").toISOString(), deletedAt: null },
  { businessId: 1, receiptNumber: 2, memberId: 2, clientId: 1, exchangeRateId: 3, type: "RETAIL", status: "COMPLETED", conditions: "CASH", paymentStatus: "PAID", subTotal: 3.6, taxAmount: 0.58, discount: 0.0, totalAmount: 4.18, remainingBalance: 0.0, paymentDueDate: null, createdAt: new Date("2026-01-16T10:00:00Z").toISOString(), updatedAt: new Date("2026-01-16T10:05:00Z").toISOString(), deletedAt: null },

  // Business 1 - venta a crédito (parcial)
  { businessId: 1, receiptNumber: 3, memberId: 2, clientId: 2, exchangeRateId: 3, type: "RETAIL", status: "COMPLETED", conditions: "CREDIT", paymentStatus: "PARTIAL", subTotal: 5.98, taxAmount: 0.96, discount: 0.0, totalAmount: 6.94, remainingBalance: 3.94, paymentDueDate: new Date("2026-01-31").toISOString(), createdAt: new Date("2026-01-20T12:00:00Z").toISOString(), updatedAt: new Date("2026-01-20T12:10:00Z").toISOString(), deletedAt: null },

  // Business 1 - borrador (carrito)
  { businessId: 1, receiptNumber: 4, memberId: 2, clientId: 5, exchangeRateId: 3, type: "RETAIL", status: "DRAFT", conditions: "CASH", paymentStatus: "PENDING", subTotal: 0.0, taxAmount: 0.0, discount: 0.0, totalAmount: 0.0, remainingBalance: 0.0, paymentDueDate: null, createdAt: new Date("2026-01-21T09:00:00Z").toISOString(), updatedAt: new Date("2026-01-21T09:00:00Z").toISOString(), deletedAt: null },

  // Business 2
  { businessId: 2, receiptNumber: 1, memberId: 9, clientId: 6, exchangeRateId: 5, type: "RETAIL", status: "COMPLETED", conditions: "CASH", paymentStatus: "PAID", subTotal: 9.5, taxAmount: 1.52, discount: 0.0, totalAmount: 11.02, remainingBalance: 0.0, paymentDueDate: null, createdAt: new Date("2026-01-20T10:00:00Z").toISOString(), updatedAt: new Date("2026-01-20T10:05:00Z").toISOString(), deletedAt: null },

  // Business 3
  { businessId: 3, receiptNumber: 1, memberId: 13, clientId: 8, exchangeRateId: 6, type: "RETAIL", status: "COMPLETED", conditions: "CASH", paymentStatus: "PAID", subTotal: 3.84, taxAmount: 0.22, discount: 0.0, totalAmount: 4.06, remainingBalance: 0.0, paymentDueDate: null, createdAt: new Date("2026-01-21T11:00:00Z").toISOString(), updatedAt: new Date("2026-01-21T11:05:00Z").toISOString(), deletedAt: null },

  // Business 4 (servicios)
  { businessId: 4, receiptNumber: 1, memberId: 16, clientId: 9, exchangeRateId: 7, type: "WHOLESALE", status: "COMPLETED", conditions: "CASH", paymentStatus: "PAID", subTotal: 50.0, taxAmount: 8.0, discount: 0.0, totalAmount: 58.0, remainingBalance: 0.0, paymentDueDate: null, createdAt: new Date("2026-01-22T15:00:00Z").toISOString(), updatedAt: new Date("2026-01-22T15:05:00Z").toISOString(), deletedAt: null }
];
