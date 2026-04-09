import { Router } from 'express';
import { SubscriptionPaymentAdminController } from './subscription-payment.admin.controller';

const router = Router();
const controller = new SubscriptionPaymentAdminController();

router.get('/', controller.list.bind(controller));
router.patch('/:id/review', controller.review.bind(controller));

export const SubscriptionPaymentAdminRoute = router;
export default router;
