export const purchasePayments = [
  { purchaseId: 1, paymentMethodId: 2, amount: 278.4, exchangeRateId: 3, reference: "ZL-0001", paymentDate: new Date("2026-01-05T10:00:00Z").toISOString() },

  // Purchase #2 (crédito/parcial)
  { purchaseId: 2, paymentMethodId: 6, amount: 50.0, exchangeRateId: 3, reference: "TR-0002", paymentDate: new Date("2026-01-18T10:00:00Z").toISOString() },
  { purchaseId: 2, paymentMethodId: 2, amount: 7.91, exchangeRateId: 3, reference: "EF-0003", paymentDate: new Date("2026-01-18T10:05:00Z").toISOString() },

  // Purchase #3
  { purchaseId: 3, paymentMethodId: 5, amount: 66.12, exchangeRateId: 3, reference: "TR-0003", paymentDate: new Date("2026-01-18T10:30:00Z").toISOString() },

  // Purchase #4 (Business 2)
  { purchaseId: 4, paymentMethodId: 3, amount: 153.58, exchangeRateId: 5, reference: "ZL-N-001", paymentDate: new Date("2026-01-19T10:00:00Z").toISOString() },

  // Purchase #5 (Business 3)
  { purchaseId: 5, paymentMethodId: 5, amount: 140.1, exchangeRateId: 6, reference: "TR-FAR-001", paymentDate: new Date("2026-01-20T10:00:00Z").toISOString() }
];
