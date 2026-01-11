import { CreateProductInterface } from './create-product.interface';

export interface UpdateProductInterface extends Partial<CreateProductInterface> {}
