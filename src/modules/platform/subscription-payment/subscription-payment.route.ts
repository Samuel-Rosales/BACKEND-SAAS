import { Router } from 'express';
import { SubscriptionPaymentController } from './subscription-payment.controller';
import { SubscriptionPaymentValidator } from './subscription-payment.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new SubscriptionPaymentController();
const validator = new SubscriptionPaymentValidator();

// Todas las rutas requieren autenticación (y x-business-id para contexto)
router.use(authMiddleware);

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);
router.get('/my', controller.findAllMy);
router.get('/my/:id', validator.validateId, handleValidationErrors, controller.findOneMy);

export const SubscriptionPaymentRoute = router;
export default router;
