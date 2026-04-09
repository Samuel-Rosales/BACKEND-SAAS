import { Router } from 'express';
import { BusinessAdminController } from './business.admin.controller';

const router = Router();
const controller = new BusinessAdminController();

router.get('/', controller.findAll.bind(controller));

router.patch('/:id/status', controller.toggleStatus.bind(controller));

router.patch('/:id/subscription', controller.updateSubscription.bind(controller));

export const BusinessAdminRoute = router;

export default router;
