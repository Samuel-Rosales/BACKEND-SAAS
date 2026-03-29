import { Router } from 'express';
import { SalesReportController } from '../controllers/sales.controller';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new SalesReportController();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// GET /api/report/sales/overview
// Protegemos la ruta para asegurarnos de tener el usuario y el businessId
router.get(
    '/overview',
    requireBusinessPermission('REPORTS_SALES_VIEW'),
    controller.SalesMetrics
);

export const SalesReportRoute = router;