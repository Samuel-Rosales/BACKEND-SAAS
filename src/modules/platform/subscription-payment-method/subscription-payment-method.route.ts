import { Router } from 'express';
import { SubscriptionPaymentMethodController } from './subscription-payment-method.controller';

const router = Router();
const controller = new SubscriptionPaymentMethodController();

router.get('/public', controller.findActive);

export const SubscriptionPaymentMethodRoute = router;
export default router;
