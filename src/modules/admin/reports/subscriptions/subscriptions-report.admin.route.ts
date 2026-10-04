import { Router } from 'express';
import { AdminSubscriptionsReportController } from './subscriptions-report.admin.controller';

const router = Router();
const controller = new AdminSubscriptionsReportController();

router.get('/overview', controller.overview.bind(controller));
router.get('/reminders', controller.reminders.bind(controller));
router.get('/financial', controller.financial.bind(controller));

export const AdminSubscriptionReportRoute = router;
export default router;
