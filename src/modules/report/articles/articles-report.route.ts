import { Router } from 'express';
import { ArticlesReportController } from './articles-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ArticlesReportController();

router.use(authMiddleware);

router.get(
    '/overview',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getOverview
);

router.get(
    '/ranking',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.getRanking
);

router.get(
    '/pdf',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.generatePDF
);

export const ArticlesReportRoute = router;
