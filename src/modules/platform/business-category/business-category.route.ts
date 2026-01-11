import { Router } from 'express';
import { BusinessCategoryController } from './business-category.controller';
import { BusinessCategoryValidator } from './business-category.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
// import { authMiddleware } from '@/middlewares/auth.middleware'; // Opcional: Proteger rutas

const router = Router();
const controller = new BusinessCategoryController();
const validator = new BusinessCategoryValidator();

// router.use(authMiddleware); // Descomentar para exigir login

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

export const BusinessCategoryRoute = router;

export default router;
