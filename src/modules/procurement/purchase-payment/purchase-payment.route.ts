import { Router } from 'express';
import { PurchasePaymentController } from './purchase-payment.controller';
import { PurchasePaymentValidator } from './purchase-payment.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new PurchasePaymentController();
const validator = new PurchasePaymentValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get(
  '/',
  validator.validatePurchaseId,
  handleValidationErrors,
  controller.findAll
);

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

/*router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);*/

export const PurchasePaymentRoute = router;

export default router;
