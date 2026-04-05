import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware, requireSuperAdmin } from '@/middlewares';

const router = Router();
const adminController = new AdminController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);
router.use(requireSuperAdmin);

/**
 * GET /api/v1/admin/businesses
 * Listar todos los negocios
 */
router.get('/businesses', adminController.findAllBusinesses.bind(adminController));

/**
 * PATCH /api/v1/admin/businesses/:id/status
 * Activar/desactivar negocio
 */
router.patch('/businesses/:id/status', adminController.toggleBusinessStatus.bind(adminController));

/**
 * PATCH /api/v1/admin/businesses/:id/subscription
 * Actualizar suscripción
 */
router.patch('/businesses/:id/subscription', adminController.updateBusinessSubscription.bind(adminController));

/**
 * GET /api/v1/admin/stats
 * Estadísticas del sistema
 */
router.get('/stats', adminController.getStats.bind(adminController));

/**
 * GET /api/v1/admin/subscription-payments
 * Listar pagos de suscripción (opcional: ?status=UNDER_REVIEW)
 */
router.get('/subscription-payments', adminController.listSubscriptionPayments.bind(adminController));

/**
 * PATCH /api/v1/admin/subscription-payments/:id/review
 * Revisar un pago: APPROVED | REJECTED
 */
router.patch('/subscription-payments/:id/review', adminController.reviewSubscriptionPayment.bind(adminController));

export default router;
