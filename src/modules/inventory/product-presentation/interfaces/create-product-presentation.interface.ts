export interface CreateProductPresentationInterface {
    productId: number;
    name: string;
    factor: number; // Decimal factor e.g., 12.0000
    barCode?: string;
    price?: number;
    isActive?: boolean;
}
