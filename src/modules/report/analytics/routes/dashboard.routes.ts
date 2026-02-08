import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto

const router = Router();
const dashboardController = new DashboardController();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// GET /api/dashboard/overview
// Protegemos la ruta para asegurarnos de tener el usuario y el businessId
router.get(
    '/overview',
    dashboardController.getDashboardOverview
);

export const DashboardRoute = router;