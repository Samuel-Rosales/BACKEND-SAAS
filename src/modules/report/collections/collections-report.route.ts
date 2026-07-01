import { Router } from 'express';
import { CollectionsReportController } from './collections-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new CollectionsReportController();

// Apply authentication to all routes in this sub-module
router.use(authMiddleware);

// GET /api/v1/report/collections/overview
router.get(
    '/overview',
    requireBusinessPermission('REPORTS_COLLECTIONS_VIEW'),
    controller.getOverview
);

// GET /api/v1/report/collections/debtors
router.get(
    '/debtors',
    requireBusinessPermission('REPORTS_COLLECTIONS_VIEW'),
    controller.getDebtors
);

// GET /api/v1/report/collections/pdf
router.get(
    '/pdf',
    requireBusinessPermission('REPORTS_COLLECTIONS_VIEW'),
    controller.generateReportPDF
);

export const CollectionsReportRoute = router;
