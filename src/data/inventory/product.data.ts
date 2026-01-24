export const products = [
  { businessId: 1, categoryId: 1, unitId: 2, taxId: 1, name: "Coca Cola 2L", sku: "CC2L-001", description: "Bebida gaseosa", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 3.0, profitMargin: 0.15, salePrice: 3.5, minStock: 10, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 2, unitId: 1, taxId: 1, name: "Galletas Top", sku: "GAL-001", description: "Galletas dulces", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 0.9, profitMargin: 0.2, salePrice: 1.2, minStock: 20, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 2, unitId: 1, taxId: 1, name: "Combo Coca Cola + Galletas", sku: "COMBO-001", description: "Combo promocional", imageUrl: null, type: "COMPOSITE", isPerishable: false, costPrice: 3.9, profitMargin: 0.2, salePrice: 4.68, minStock: 0, updatedById: 1, isActive: true },

  // Business 1 - más productos
  { businessId: 1, categoryId: 1, unitId: 1, taxId: 1, name: "Agua Mineral 500ml", sku: "AGUA-500", description: "Agua sin gas", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 0.35, profitMargin: 0.4, salePrice: 0.49, minStock: 50, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 3, unitId: 2, taxId: 1, name: "Leche Entera 1L", sku: "LEC-1L", description: "Leche pasteurizada", imageUrl: null, type: "SIMPLE", isPerishable: true, costPrice: 1.1, profitMargin: 0.35, salePrice: 1.49, minStock: 24, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 5, unitId: 1, taxId: 1, name: "Pan Campesino", sku: "PAN-001", description: "Pan recién horneado", imageUrl: null, type: "SIMPLE", isPerishable: true, costPrice: 0.4, profitMargin: 0.5, salePrice: 0.6, minStock: 30, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 4, unitId: 2, taxId: 1, name: "Detergente Líquido 1L", sku: "DET-1L", description: "Detergente multiuso", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 1.8, profitMargin: 0.3, salePrice: 2.34, minStock: 15, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 4, unitId: 1, taxId: 1, name: "Esponja Multiuso", sku: "ESP-001", description: "Esponja para limpieza", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 0.25, profitMargin: 0.6, salePrice: 0.4, minStock: 40, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 2, unitId: 1, taxId: 1, name: "Combo Merienda", sku: "COMBO-002", description: "Coca 2L + Galletas + Pan", imageUrl: null, type: "COMPOSITE", isPerishable: false, costPrice: 4.55, profitMargin: 0.25, salePrice: 5.69, minStock: 0, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 4, unitId: 1, taxId: 1, name: "Kit Limpieza", sku: "KIT-001", description: "Detergente + Esponja", imageUrl: null, type: "COMPOSITE", isPerishable: false, costPrice: 2.05, profitMargin: 0.25, salePrice: 2.56, minStock: 0, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 5, unitId: 1, taxId: 1, name: "Harina P.A.N 1kg", sku: "HAR-1KG", description: "Harina precocida", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 1.2, profitMargin: 0.25, salePrice: 1.5, minStock: 25, updatedById: 1, isActive: true },
  { businessId: 1, categoryId: 3, unitId: 1, taxId: 1, name: "Queso Blanco 500g", sku: "QUES-500", description: "Queso fresco", imageUrl: null, type: "SIMPLE", isPerishable: true, costPrice: 2.2, profitMargin: 0.25, salePrice: 2.75, minStock: 10, updatedById: 1, isActive: true },

  // Business 2
  { businessId: 2, categoryId: 6, unitId: 2, taxId: 1, name: "Refresco Cola 1.5L", sku: "RC15-001", description: "Bebida gaseosa", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 2.4, profitMargin: 0.25, salePrice: 3.0, minStock: 12, updatedById: 1, isActive: true },
  { businessId: 2, categoryId: 7, unitId: 1, taxId: 1, name: "Papas Fritas 50g", sku: "PAP-050", description: "Snack salado", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 0.5, profitMargin: 0.4, salePrice: 0.7, minStock: 30, updatedById: 1, isActive: true },
  { businessId: 2, categoryId: 7, unitId: 1, taxId: 1, name: "Combo Snack Norte", sku: "COMBO-N-001", description: "Refresco 1.5L + Papas", imageUrl: null, type: "COMPOSITE", isPerishable: false, costPrice: 2.9, profitMargin: 0.25, salePrice: 3.63, minStock: 0, updatedById: 1, isActive: true },
  { businessId: 2, categoryId: 6, unitId: 1, taxId: 3, name: "Hielo (Bolsa)", sku: "HIE-001", description: "Bolsa de hielo", imageUrl: null, type: "SIMPLE", isPerishable: true, costPrice: 0.3, profitMargin: 0.5, salePrice: 0.45, minStock: 20, updatedById: 1, isActive: true },

  // Business 3 (Farmacia)
  { businessId: 3, categoryId: 8, unitId: 1, taxId: 2, name: "Paracetamol 500mg (10 tabs)", sku: "PARA-500-10", description: "Analgésico", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 0.9, profitMargin: 0.35, salePrice: 1.22, minStock: 40, updatedById: 1, isActive: true },
  { businessId: 3, categoryId: 9, unitId: 2, taxId: 1, name: "Alcohol 70% 500ml", sku: "ALC-70-500", description: "Uso tópico", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 1.0, profitMargin: 0.4, salePrice: 1.4, minStock: 20, updatedById: 1, isActive: true },
  { businessId: 3, categoryId: 9, unitId: 1, taxId: 1, name: "Protector Solar SPF50", sku: "SOL-50", description: "Cuidado de la piel", imageUrl: null, type: "SIMPLE", isPerishable: false, costPrice: 4.5, profitMargin: 0.35, salePrice: 6.08, minStock: 8, updatedById: 1, isActive: true },

  // Business 4 (Servicios)
  { businessId: 4, categoryId: 10, unitId: 6, taxId: 1, name: "Consultoría (1 hora)", sku: "CONS-1H", description: "Servicio profesional", imageUrl: null, type: "SERVICE", isPerishable: false, costPrice: 0.0, profitMargin: 1.0, salePrice: 25.0, minStock: 0, updatedById: 1, isActive: true },
  { businessId: 4, categoryId: 10, unitId: 6, taxId: 1, name: "Diseño de Logo", sku: "DES-LOGO", description: "Entrega digital", imageUrl: null, type: "SERVICE", isPerishable: false, costPrice: 0.0, profitMargin: 1.0, salePrice: 60.0, minStock: 0, updatedById: 1, isActive: true }
];
