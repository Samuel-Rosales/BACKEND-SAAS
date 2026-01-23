export interface CreateProductInterface {
  businessId: number;
  categoryId: number;
  unitId: number;
  name: string;
  sku?: string;
  description: string;
  imageUrl?: string;
  costPrice: number;
  profitMargin: number;
  salePrice: number;
  minStock: number;
  isService: boolean;
  isPerishable: boolean;
}
