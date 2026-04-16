import { Router } from 'express';
import { AdminSubscriptionReportRoute } from './subscriptions/subscriptions-report.admin.route';

const router = Router();

router.use('/subscriptions', AdminSubscriptionReportRoute);

export const AdminReportsRoute = router;
export default router;
