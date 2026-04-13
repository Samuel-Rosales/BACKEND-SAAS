import { Router } from 'express';
import { BusinessCategoryController } from './business-category.controller';
import { BusinessCategoryValidator } from './business-category.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware, requireSuperAdmin } from '@/middlewares';

const router = Router();
const controller = new BusinessCategoryController();
const validator = new BusinessCategoryValidator();

router.post(
  '/', 
  authMiddleware,
  requireSuperAdmin,
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', authMiddleware, controller.findAll);

router.get(
    '/:id', 
  authMiddleware,
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  authMiddleware,
  requireSuperAdmin,
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  authMiddleware,
  requireSuperAdmin,
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const BusinessCategoryRoute = router;

export default router;
