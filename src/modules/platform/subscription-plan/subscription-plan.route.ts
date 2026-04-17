import { Router } from 'express';
import { SubscriptionPlanController } from './subscription-plan.controller';

const router = Router();
const controller = new SubscriptionPlanController();

// Catálogo público de planes (sin auth): landing page / signup.
router.get('/public', controller.findAllPublic);

export const SubscriptionPlanRoute = router;

export default router;
