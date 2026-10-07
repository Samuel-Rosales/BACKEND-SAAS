import { Router } from 'express';
import { CommissionReportController } from './commission-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new CommissionReportController();

// Todas las rutas requieren sesión autenticada
router.use(authMiddleware);

// GET /api/report/commissions
router.get(
    '/',
    requireBusinessPermission('REPORTS_SALES_VIEW'),
    controller.getCommissions
);

export const CommissionReportRoute = router;
