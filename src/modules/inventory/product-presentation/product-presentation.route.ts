import { Router } from 'express';
import { ProductPresentationController } from './product-presentation.controller';
import { ProductPresentationValidator } from './product-presentation.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ProductPresentationController();
const validator = new ProductPresentationValidator();

router.use(authMiddleware);

// 1. Crear
router.post(
    '/', 
    requireBusinessPermission('PRESENTATIONS_WRITE'),
    validator.validateCreate, 
    handleValidationErrors, 
    controller.create
);

// 2. Listar (Requiere ?productId=123)
router.get(
    '/', 
    requireBusinessPermission('PRESENTATIONS_READ'),
    validator.validateList, 
    handleValidationErrors, 
    controller.findAllByProduct
);

// 3. Actualizar
router.patch(
    '/:id', 
    requireBusinessPermission('PRESENTATIONS_WRITE'),
    validator.validateUpdate, 
    handleValidationErrors, 
    controller.update
);

// 4. Eliminar
router.delete(
    '/:id', 
    requireBusinessPermission('PRESENTATIONS_WRITE'),
    validator.validateId, 
    handleValidationErrors, 
    controller.remove
);

export const ProductPresentationRoute = router;
export default router;