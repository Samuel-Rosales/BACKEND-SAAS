import { Router } from 'express';
import { DepositsReportController } from './deposits-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new DepositsReportController();

router.use(authMiddleware);

router.get(
    '/overview',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getOverview
);

router.get(
    '/',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getAll
);

router.get(
    '/:id',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getById
);

export const DepositsReportRoute = router;
