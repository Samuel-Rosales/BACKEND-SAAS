import { ProductType } from '@prisma/client'; // Importa el Enum de Prisma

export interface ProductComponentDTO {
    childProductId: number; // ID del ingrediente (Ej: Carne)
    quantity: number;       // Cantidad (Ej: 0.200)
}

export interface CreateProductInterface {
    name: string;
    sku?: string;
    description?: string;
    categoryId: number;
    unitId: number;
    taxId: number; // No olvides el impuesto
    
    // --- NUEVO ---
    type: ProductType; // SIMPLE, COMPOSITE, SERVICE
    components?: ProductComponentDTO[]; // Solo si es COMPOSITE
    
    isPerishable?: boolean;
    imageUrl?: string;
    
    costPrice: number;
    profitMargin: number;
    salePrice: number;
    minStock?: number;
}

export interface StockLotInterface {
  quantity: number;
  expirationDate: Date;
  lotCost: number;
}

export interface DepotInterface {
    depotId: number;
    name: string;
    stockLots?: StockLotInterface[];
}