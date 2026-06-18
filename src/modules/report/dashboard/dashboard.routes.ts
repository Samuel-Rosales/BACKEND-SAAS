import { Router } from 'express';
import { DashboardController } from './dashboard.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const dashboardController = new DashboardController();

router.use(authMiddleware);

router.get(
    '/overview',
    requireBusinessPermission('REPORTS_DASHBOARD_VIEW'),
    dashboardController.getDashboardOverview
);

export const DashboardRoute = router;