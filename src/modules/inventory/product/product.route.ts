import { Router } from 'express';
import { ProductController } from './product.controller';
import { ProductValidator } from './product.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ProductController();
const validator = new ProductValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// Cloudinary: firma para subida directa (cliente -> Cloudinary)
router.get('/cloudinary/signature', requireBusinessPermission('PRODUCTS_WRITE'), controller.getCloudinarySignature);

// Cloudinary: cleanup de imagen subida pero no guardada
router.post('/cloudinary/delete', requireBusinessPermission('PRODUCTS_WRITE'), controller.deleteCloudinaryImage);

router.post(
  '/', 
  requireBusinessPermission('PRODUCTS_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('PRODUCTS_READ'), controller.findAll);

router.get(
    '/:id', 
  requireBusinessPermission('PRODUCTS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('PRODUCTS_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('PRODUCTS_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const ProductRoute = router;

export default router;
