import { ProductType } from '@prisma/client';

export interface BatchImportProductItem {
    name: string;
    sku?: string;
    description?: string;
    categoryName?: string;
    unitSymbolOrName?: string;
    costPrice?: number;
    profitMargin?: number;
    salePrice: number;
    minStock?: number;
    stockInitial?: number;
    depotNameOrId?: string | number;
    type?: ProductType;
    isPerishable?: boolean;
}

export interface BatchImportDTO {
    products: BatchImportProductItem[];
    defaultDepotId?: number;
    defaultCategoryId?: number;
}
