import { Router } from 'express';
import { CategoryController } from './category.controller';
import { CategoryValidator } from './category.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new CategoryController();
const validator = new CategoryValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

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

export const CategoryRoute = router;

export default router;
