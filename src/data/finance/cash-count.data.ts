export const cashCounts = [
  // Cash register #1 (Business 1) - apertura
  { cashRegisterId: 1, denomination: 20.0, quantity: 5, currency: "USD", exchangeRateId: 3, type: "INITIAL" },
  { cashRegisterId: 1, denomination: 10.0, quantity: 10, currency: "USD", exchangeRateId: 3, type: "INITIAL" },
  { cashRegisterId: 1, denomination: 100.0, quantity: 2, currency: "VES", exchangeRateId: 3, type: "INITIAL" },

  // Cash register #2 (Business 1) - apertura/cierre + arqueo
  { cashRegisterId: 2, denomination: 20.0, quantity: 2, currency: "USD", exchangeRateId: 3, type: "INITIAL" },
  { cashRegisterId: 2, denomination: 10.0, quantity: 2, currency: "USD", exchangeRateId: 3, type: "INITIAL" },
  { cashRegisterId: 2, denomination: 5.0, quantity: 4, currency: "USD", exchangeRateId: 3, type: "FINAL" },
  { cashRegisterId: 2, denomination: 20.0, quantity: 6, currency: "USD", exchangeRateId: 3, type: "FINAL" },
  { cashRegisterId: 2, denomination: 200.0, quantity: 20, currency: "VES", exchangeRateId: 3, type: "FINAL" },
  { cashRegisterId: 2, denomination: 50.0, quantity: 3, currency: "VES", exchangeRateId: 3, type: "AUDIT" },

  // Cash register #3 (Business 2) - apertura
  { cashRegisterId: 3, denomination: 10.0, quantity: 3, currency: "USD", exchangeRateId: 5, type: "INITIAL" },
  { cashRegisterId: 3, denomination: 100.0, quantity: 5, currency: "VES", exchangeRateId: 5, type: "INITIAL" },

  // Cash register #4 (Business 3) - apertura
  { cashRegisterId: 4, denomination: 20.0, quantity: 2, currency: "USD", exchangeRateId: 6, type: "INITIAL" },
  { cashRegisterId: 4, denomination: 200.0, quantity: 10, currency: "VES", exchangeRateId: 6, type: "INITIAL" }
];
