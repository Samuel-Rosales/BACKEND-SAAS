import { Router } from 'express';
import { SalesReportController } from '../controllers/sales.controller';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto

const router = Router();
const controller = new SalesReportController();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// GET /api/report/sales/overview
// Protegemos la ruta para asegurarnos de tener el usuario y el businessId
router.get(
    '/overview',
    controller.SalesMetrics
);

export const SalesReportRoute = router;