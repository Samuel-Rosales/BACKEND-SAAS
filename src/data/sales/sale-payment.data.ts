export const salePayments = [
  { saleId: 1, paymentMethodId: 1, amount: 8.12, exchangeRateId: 3, reference: "EF-0001", date: new Date("2026-01-15T12:08:00Z").toISOString() },
  { saleId: 2, paymentMethodId: 1, amount: 4.18, exchangeRateId: 3, reference: "EF-0002", date: new Date("2026-01-16T10:04:00Z").toISOString() },

  // Sale #3 (crédito/parcial)
  { saleId: 3, paymentMethodId: 2, amount: 3.0, exchangeRateId: 3, reference: "EF-0004", date: new Date("2026-01-20T12:08:00Z").toISOString() },

  // Sale #5 (Business 2)
  { saleId: 5, paymentMethodId: 3, amount: 11.02, exchangeRateId: 5, reference: "ZL-0005", date: new Date("2026-01-20T10:04:00Z").toISOString() },

  // Sale #6 (Business 3)
  { saleId: 6, paymentMethodId: 4, amount: 4.06, exchangeRateId: 6, reference: "PM-0001", date: new Date("2026-01-21T11:04:00Z").toISOString() },

  // Sale #7 (Business 4)
  { saleId: 7, paymentMethodId: 9, amount: 58.0, exchangeRateId: 7, reference: "PP-0001", date: new Date("2026-01-22T15:04:00Z").toISOString() }
];
