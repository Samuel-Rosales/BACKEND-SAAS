import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const adminController = new AdminController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// TODO: Agregar middleware de verificación de rol admin
// router.use(adminRoleMiddleware);

/**
 * GET /api/v1/admin/businesses
 * Listar todos los negocios
 */
router.get('/businesses', authMiddleware, adminController.findAllBusinesses.bind(adminController));

/**
 * PATCH /api/v1/admin/businesses/:id/status
 * Activar/desactivar negocio
 */
router.patch('/businesses/:id/status', authMiddleware, adminController.toggleBusinessStatus.bind(adminController));

/**
 * PATCH /api/v1/admin/businesses/:id/subscription
 * Actualizar suscripción
 */
router.patch('/businesses/:id/subscription', authMiddleware, adminController.updateBusinessSubscription.bind(adminController));

/**
 * GET /api/v1/admin/stats
 * Estadísticas del sistema
 */
router.get('/stats', authMiddleware, adminController.getStats.bind(adminController));

export default router;
