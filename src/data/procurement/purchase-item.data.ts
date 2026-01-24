export const purchaseItems = [
  { purchaseId: 1, productId: 1, depotId: 1, productPresentationId: 1, quantity: 50, unitCost: 3.0, expirationDate: new Date("2026-12-31").toISOString() },
  { purchaseId: 1, productId: 2, depotId: 1, productPresentationId: 2, quantity: 100, unitCost: 0.9, expirationDate: new Date("2026-07-31").toISOString() },

  // Purchase #2 (Business 1) - crédito
  { purchaseId: 2, productId: 5, depotId: 1, productPresentationId: 5, quantity: 48, unitCost: 1.05, expirationDate: new Date("2026-02-15").toISOString() },
  { purchaseId: 2, productId: 12, depotId: 1, productPresentationId: 11, quantity: 25, unitCost: 2.05, expirationDate: new Date("2026-02-10").toISOString() },

  // Purchase #3 (Business 1) - limpieza
  { purchaseId: 3, productId: 7, depotId: 1, productPresentationId: 8, quantity: 20, unitCost: 1.75, expirationDate: new Date("2027-12-31").toISOString() },
  { purchaseId: 3, productId: 8, depotId: 1, productPresentationId: 9, quantity: 100, unitCost: 0.22, expirationDate: new Date("2027-12-31").toISOString() },

  // Purchase #4 (Business 2)
  { purchaseId: 4, productId: 13, depotId: 2, productPresentationId: 12, quantity: 40, unitCost: 2.35, expirationDate: new Date("2026-12-31").toISOString() },
  { purchaseId: 4, productId: 14, depotId: 2, productPresentationId: 13, quantity: 80, unitCost: 0.48, expirationDate: new Date("2026-10-31").toISOString() },

  // Purchase #5 (Business 3)
  { purchaseId: 5, productId: 17, depotId: 5, productPresentationId: 14, quantity: 100, unitCost: 0.85, expirationDate: new Date("2028-01-31").toISOString() },
  { purchaseId: 5, productId: 18, depotId: 5, productPresentationId: 15, quantity: 50, unitCost: 0.95, expirationDate: new Date("2027-06-30").toISOString() }
];
