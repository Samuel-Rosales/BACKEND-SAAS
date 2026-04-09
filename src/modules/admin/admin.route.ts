import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware, requireSuperAdmin } from '@/middlewares';
import { BusinessAdminRoute } from './platform/business/business.admin.route';
import { SubscriptionPaymentAdminRoute } from './platform/subscription-payment/subscription-payment.admin.route';

const router = Router();
const adminController = new AdminController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);
router.use(requireSuperAdmin)

// --- Businesses (Super Admin) ---
router.use('/business', requireSuperAdmin, BusinessAdminRoute);

/**
 * GET /api/v1/admin/stats
 * Estadísticas del sistema
 */
router.get('/stats', adminController.getStats.bind(adminController));

// --- Subscription Payments (Super Admin) ---
router.use('/subscription-payments', SubscriptionPaymentAdminRoute);

export default router;
