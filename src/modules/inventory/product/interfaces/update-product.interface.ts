import { CreateProductInterface } from './create-product.interface';

export interface UpdateProductInterface extends Partial<CreateProductInterface> {
    // Revalorización general de lotes al cambiar el costo
    revalueLots?: boolean;
    // Nombre exacto del producto para confirmar la revalorización
    confirmProductName?: string;
}
