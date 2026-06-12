import { Router } from 'express';
import { PurchaseReportController } from './purchase-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new PurchaseReportController();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// GET /api/report/purchases/overview
// Protegemos la ruta para asegurarnos de tener el usuario y el businessId
router.get(
    '/overview',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.PurchaseMetrics
);

router.get(
    '/grouped-report',
    requireBusinessPermission('REPORTS_VIEW'),
    controller.generateGroupedReportPDF
);

export const PurchaseReportRoute = router;
