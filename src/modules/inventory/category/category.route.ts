import { Router } from 'express';
import { CategoryController } from './category.controller';
import { CategoryValidator } from './category.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new CategoryController();
const validator = new CategoryValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('CATEGORIES_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('CATEGORIES_READ'), controller.findAll);

router.get(
    '/:id', 
  requireBusinessPermission('CATEGORIES_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('CATEGORIES_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('CATEGORIES_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const CategoryRoute = router;

export default router;
