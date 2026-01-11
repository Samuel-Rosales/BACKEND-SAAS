export interface CreateProductInterface {
  businessId: number;
  categoryId: number;
  name: string;
  sku?: string;
  description: string;
  imageUrl?: string;
  costPrice: number;
  salePrice: number;
  minStock: number;
  isService: boolean;
  isPerishable: boolean;
}
