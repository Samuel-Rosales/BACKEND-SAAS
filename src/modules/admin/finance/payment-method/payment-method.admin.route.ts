import { Router } from 'express';
import { PaymentMethodAdminController } from './payment-method.admin.controller';
import { PaymentMethodValidator } from '@/modules/finance/payment-method/payment-method.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

const router = Router();
const controller = new PaymentMethodAdminController();
const validator = new PaymentMethodValidator();

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);

router.get('/', controller.findAll);

router.get('/:id', validator.validateId, handleValidationErrors, controller.findOne);

router.patch('/:id', validator.validateUpdate, handleValidationErrors, controller.update);

router.delete('/:id', validator.validateId, handleValidationErrors, controller.remove);

export const PaymentMethodAdminRoute = router;
export default router;
