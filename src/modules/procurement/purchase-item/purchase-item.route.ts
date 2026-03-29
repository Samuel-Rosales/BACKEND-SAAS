import { Router } from 'express';
import { PurchaseItemController } from './purchase-item.controller';
import { PurchaseItemValidator } from './purchase-item.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new PurchaseItemController();
const validator = new PurchaseItemValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('PROCUREMENT_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get(
  '/',
  requireBusinessPermission('PROCUREMENT_READ'),
  validator.validatePurchaseId,
  handleValidationErrors,
  controller.findAll
);

router.get(
    '/:id', 
  requireBusinessPermission('PROCUREMENT_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('PROCUREMENT_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('PROCUREMENT_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const PurchaseItemRoute = router;

export default router;
