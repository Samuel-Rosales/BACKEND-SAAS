import { Router } from 'express';
import { PurchasePaymentController } from './purchase-payment.controller';
import { PurchasePaymentValidator } from './purchase-payment.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new PurchasePaymentController();
const validator = new PurchasePaymentValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('CREDITS_PURCHASES_PAY'),
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
  requireBusinessPermission('CREDITS_PURCHASES_PAY'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

/*router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);*/

export const PurchasePaymentRoute = router;

export default router;
