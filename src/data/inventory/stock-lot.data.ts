export const stockLots = [
  { productId: 1, depotId: 1, quantity: 50, expirationDate: new Date("2026-12-31").toISOString(), lotCost: 3.0, createdAt: new Date("2026-01-05T10:00:00Z").toISOString() },
  { productId: 2, depotId: 1, quantity: 100, expirationDate: new Date("2026-07-31").toISOString(), lotCost: 0.9, createdAt: new Date("2026-01-05T10:00:00Z").toISOString() },

  // Business 1 - lotes adicionales (depot 1 y 3)
  { productId: 1, depotId: 1, quantity: 30, expirationDate: new Date("2027-03-31").toISOString(), lotCost: 3.05, createdAt: new Date("2026-01-20T10:00:00Z").toISOString() },
  { productId: 4, depotId: 3, quantity: 120, expirationDate: new Date("2027-01-31").toISOString(), lotCost: 0.33, createdAt: new Date("2026-01-18T10:00:00Z").toISOString() },
  { productId: 5, depotId: 1, quantity: 48, expirationDate: new Date("2026-02-15").toISOString(), lotCost: 1.05, createdAt: new Date("2026-01-18T10:05:00Z").toISOString() },
  { productId: 6, depotId: 3, quantity: 60, expirationDate: new Date("2026-01-25").toISOString(), lotCost: 0.38, createdAt: new Date("2026-01-18T10:07:00Z").toISOString() },
  { productId: 7, depotId: 1, quantity: 20, expirationDate: new Date("2027-12-31").toISOString(), lotCost: 1.75, createdAt: new Date("2026-01-18T10:10:00Z").toISOString() },
  { productId: 8, depotId: 1, quantity: 100, expirationDate: new Date("2027-12-31").toISOString(), lotCost: 0.22, createdAt: new Date("2026-01-18T10:10:00Z").toISOString() },
  { productId: 11, depotId: 1, quantity: 40, expirationDate: new Date("2027-08-31").toISOString(), lotCost: 1.15, createdAt: new Date("2026-01-18T10:12:00Z").toISOString() },
  { productId: 12, depotId: 1, quantity: 25, expirationDate: new Date("2026-02-10").toISOString(), lotCost: 2.05, createdAt: new Date("2026-01-18T10:15:00Z").toISOString() },

  // Business 2 - depot 2 y 4
  { productId: 13, depotId: 2, quantity: 40, expirationDate: new Date("2026-12-31").toISOString(), lotCost: 2.35, createdAt: new Date("2026-01-19T09:00:00Z").toISOString() },
  { productId: 14, depotId: 2, quantity: 80, expirationDate: new Date("2026-10-31").toISOString(), lotCost: 0.48, createdAt: new Date("2026-01-19T09:05:00Z").toISOString() },
  { productId: 16, depotId: 4, quantity: 50, expirationDate: new Date("2026-01-20").toISOString(), lotCost: 0.28, createdAt: new Date("2026-01-19T09:10:00Z").toISOString() },

  // Business 3 - depot 5
  { productId: 17, depotId: 5, quantity: 100, expirationDate: new Date("2028-01-31").toISOString(), lotCost: 0.85, createdAt: new Date("2026-01-20T09:00:00Z").toISOString() },
  { productId: 18, depotId: 5, quantity: 50, expirationDate: new Date("2027-06-30").toISOString(), lotCost: 0.95, createdAt: new Date("2026-01-20T09:05:00Z").toISOString() },
  { productId: 19, depotId: 5, quantity: 20, expirationDate: new Date("2027-12-31").toISOString(), lotCost: 4.2, createdAt: new Date("2026-01-20T09:08:00Z").toISOString() }
];
