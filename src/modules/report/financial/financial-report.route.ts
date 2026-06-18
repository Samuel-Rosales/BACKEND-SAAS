import { Router } from 'express';
import { FinancialReportController } from './financial-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new FinancialReportController();

// Apply authentication to all endpoints in this router
router.use(authMiddleware);

// GET /api/v1/report/financial/overview
router.get(
    '/overview',
    requireBusinessPermission('REPORTS_FINANCIAL_VIEW'),
    controller.getOverview
);

// GET /api/v1/report/financial/product-margins
router.get(
    '/product-margins',
    requireBusinessPermission('REPORTS_FINANCIAL_VIEW'),
    controller.getProductMargins
);

export const FinancialReportRoute = router;
