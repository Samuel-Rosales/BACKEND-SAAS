export const businessMembers = [
  { userId: 1, businessId: 1, roleId: 1, isActive: true, joinedAt: new Date("2025-12-01T10:00:00Z").toISOString() },
  { userId: 2, businessId: 1, roleId: 2, isActive: true, joinedAt: new Date("2025-12-10T09:00:00Z").toISOString() },
  { userId: 3, businessId: 2, roleId: 1, isActive: true, joinedAt: new Date("2025-12-15T09:30:00Z").toISOString() },

  // Business 1 (Tienda Central)
  { userId: 4, businessId: 1, roleId: 3, isActive: true, joinedAt: new Date("2025-12-20T08:00:00Z").toISOString() },
  { userId: 5, businessId: 1, roleId: 6, isActive: true, joinedAt: new Date("2025-12-22T08:00:00Z").toISOString() },
  { userId: 6, businessId: 1, roleId: 4, isActive: true, joinedAt: new Date("2026-01-02T08:00:00Z").toISOString() },
  { userId: 7, businessId: 1, roleId: 5, isActive: true, joinedAt: new Date("2026-01-03T08:00:00Z").toISOString() },
  { userId: 10, businessId: 1, roleId: 2, isActive: false, joinedAt: new Date("2025-11-10T08:00:00Z").toISOString() },

  // Business 2 (Bodega Norte)
  { userId: 8, businessId: 2, roleId: 2, isActive: true, joinedAt: new Date("2026-01-01T09:00:00Z").toISOString() },
  { userId: 9, businessId: 2, roleId: 3, isActive: true, joinedAt: new Date("2026-01-04T09:00:00Z").toISOString() },
  { userId: 5, businessId: 2, roleId: 6, isActive: true, joinedAt: new Date("2026-01-08T09:00:00Z").toISOString() },

  // Business 3 (Farmacia Centro)
  { userId: 6, businessId: 3, roleId: 4, isActive: true, joinedAt: new Date("2026-01-05T10:00:00Z").toISOString() },
  { userId: 7, businessId: 3, roleId: 2, isActive: true, joinedAt: new Date("2026-01-06T10:00:00Z").toISOString() },
  { userId: 4, businessId: 3, roleId: 7, isActive: true, joinedAt: new Date("2026-01-07T10:00:00Z").toISOString() },

  // Business 4 (Agencia Creativa)
  { userId: 1, businessId: 4, roleId: 1, isActive: true, joinedAt: new Date("2026-01-10T12:00:00Z").toISOString() },
  { userId: 9, businessId: 4, roleId: 5, isActive: true, joinedAt: new Date("2026-01-10T12:00:00Z").toISOString() },
  { userId: 4, businessId: 4, roleId: 7, isActive: true, joinedAt: new Date("2026-01-11T12:00:00Z").toISOString() }
];
