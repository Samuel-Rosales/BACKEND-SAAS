export const exchangeRates = [
  // Business 1 (Tienda Central) - histórico
  { businessId: 1, rate: 315.9, createdAt: new Date("2025-12-20T00:00:00Z").toISOString(), isActive: false, source: "MANUAL" },
  { businessId: 1, rate: 318.9, createdAt: new Date("2026-01-05T00:00:00Z").toISOString(), isActive: false, source: "MANUAL" },
  { businessId: 1, rate: 320.3, createdAt: new Date("2026-01-10T00:00:00Z").toISOString(), isActive: true, source: "MANUAL" },

  // Business 2 (Bodega Norte)
  { businessId: 2, rate: 319.7, createdAt: new Date("2026-01-08T00:00:00Z").toISOString(), isActive: false, source: "MANUAL" },
  { businessId: 2, rate: 320.3, createdAt: new Date("2026-01-10T00:00:00Z").toISOString(), isActive: true, source: "MANUAL" },

  // Business 3 (Farmacia Centro)
  { businessId: 3, rate: 321.1, createdAt: new Date("2026-01-12T00:00:00Z").toISOString(), isActive: true, source: "MANUAL" },

  // Business 4 (Agencia Creativa)
  { businessId: 4, rate: 320.3, createdAt: new Date("2026-01-10T00:00:00Z").toISOString(), isActive: true, source: "MANUAL" }
];
