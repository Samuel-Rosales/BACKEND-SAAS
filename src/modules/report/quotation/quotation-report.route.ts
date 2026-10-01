import { Router } from 'express';
import { QuotationReportController } from './quotation-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new QuotationReportController();

router.use(authMiddleware);

router.get('/overview', controller.getOverview);

export const QuotationReportRoute = router;
export default router;
