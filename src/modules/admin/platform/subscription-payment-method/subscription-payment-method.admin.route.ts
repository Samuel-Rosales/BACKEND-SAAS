import { Router } from 'express';
import { SubscriptionPaymentMethodAdminController } from './subscription-payment-method.admin.controller';
import { SubscriptionPaymentMethodValidator } from './subscription-payment-method.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

const router = Router();
const controller = new SubscriptionPaymentMethodAdminController();
const validator = new SubscriptionPaymentMethodValidator();

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);
router.get('/', controller.findAll);
router.get('/:id', validator.validateId, handleValidationErrors, controller.findOne);
router.patch('/:id', validator.validateUpdate, handleValidationErrors, controller.update);
router.delete('/:id', validator.validateId, handleValidationErrors, controller.remove);

export const SubscriptionPaymentMethodAdminRoute = router;
export default router;
