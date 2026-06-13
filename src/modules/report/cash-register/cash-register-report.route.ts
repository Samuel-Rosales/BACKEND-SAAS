import { Router } from 'express';
import { CashRegisterReportController } from './cash-register-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new CashRegisterReportController();

// Apply authentication to all routes in this sub-module
router.use(authMiddleware);

// GET /api/v1/report/cash-register/overview
router.get(
    '/overview',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getOverview
);

// GET /api/v1/report/cash-register/sellers
router.get(
    '/sellers',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getSellersReport
);

export const CashRegisterReportRoute = router;
