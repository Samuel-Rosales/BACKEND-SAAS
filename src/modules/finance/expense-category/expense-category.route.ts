import { Router } from 'express';
import { ExpenseCategoryController } from './expense-category.controller';
import { ExpenseCategoryValidator } from './expense-category.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ExpenseCategoryController();
const validator = new ExpenseCategoryValidator();

router.use(authMiddleware);

router.get(
  '/',
  requireBusinessPermission('EXPENSES_READ'),
  controller.findAll
);

router.get(
  '/:id',
  requireBusinessPermission('EXPENSES_READ'),
  validator.validateId,
  handleValidationErrors,
  controller.findOne
);

router.post(
  '/',
  requireBusinessPermission('EXPENSES_CATEGORIES_MANAGE'),
  validator.validateCreate,
  handleValidationErrors,
  controller.create
);

router.patch(
  '/:id',
  requireBusinessPermission('EXPENSES_CATEGORIES_MANAGE'),
  validator.validateUpdate,
  handleValidationErrors,
  controller.update
);

router.delete(
  '/:id',
  requireBusinessPermission('EXPENSES_CATEGORIES_MANAGE'),
  validator.validateId,
  handleValidationErrors,
  controller.remove
);

export const ExpenseCategoryRoute = router;
export default router;
