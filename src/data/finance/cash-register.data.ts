export const cashRegisters = [
  // Business 1
  { businessId: 1, memberId: 2, status: "OPEN", openTime: new Date("2026-01-15T08:00:00Z").toISOString(), closeTime: null, initialAmount: 100.0, finalAmount: null },
  { businessId: 1, memberId: 2, status: "CLOSED", openTime: new Date("2026-01-10T08:00:00Z").toISOString(), closeTime: new Date("2026-01-10T18:00:00Z").toISOString(), initialAmount: 60.0, finalAmount: 245.5 },

  // Business 2
  { businessId: 2, memberId: 9, status: "OPEN", openTime: new Date("2026-01-16T09:00:00Z").toISOString(), closeTime: null, initialAmount: 50.0, finalAmount: null },

  // Business 3
  { businessId: 3, memberId: 13, status: "OPEN", openTime: new Date("2026-01-18T09:00:00Z").toISOString(), closeTime: null, initialAmount: 80.0, finalAmount: null }
];
