import { Router } from 'express';
import { ProductController } from './product.controller';
import { ProductValidator } from './product.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new ProductController();
const validator = new ProductValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Cloudinary: firma para subida directa (cliente -> Cloudinary)
router.get('/cloudinary/signature', controller.getCloudinarySignature);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', controller.findAll);

router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const ProductRoute = router;

export default router;
