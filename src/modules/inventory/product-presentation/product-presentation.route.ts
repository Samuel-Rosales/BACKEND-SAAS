import { Router } from 'express';
import { ProductPresentationController } from './product-presentation.controller';
import { ProductPresentationValidator } from './product-presentation.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new ProductPresentationController();
const validator = new ProductPresentationValidator();

router.use(authMiddleware);

// 1. Crear
router.post(
    '/', 
    validator.validateCreate, 
    handleValidationErrors, 
    controller.create
);

// 2. Listar (Requiere ?productId=123)
router.get(
    '/', 
    validator.validateList, 
    handleValidationErrors, 
    controller.findAllByProduct
);

// 3. Actualizar
router.patch(
    '/:id', 
    validator.validateUpdate, 
    handleValidationErrors, 
    controller.update
);

// 4. Eliminar
router.delete(
    '/:id', 
    validator.validateId, 
    handleValidationErrors, 
    controller.remove
);

export const ProductPresentationRoute = router;
export default router;