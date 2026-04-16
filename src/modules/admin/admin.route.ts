import { Router } from 'express';
import { AdminController } from './admin.controller';
import { authMiddleware, requireSuperAdmin } from '@/middlewares';
import { BusinessAdminRoute } from './platform/business/business.admin.route';
import { SubscriptionPaymentAdminRoute } from './platform/subscription-payment/subscription-payment.admin.route';
import { SubscriptionPlanAdminRoute } from './platform/subscription-plan/subscription-plan.admin.route';
import { UserAdminRoute } from './aim/user/user.admin.route';
import { PaymentMethodAdminRoute } from './finance/payment-method/payment-method.admin.route';
import { TaxAdminRoute } from './finance/tax/tax.admin.route';
import { MeasurementUnitAdminRoute } from './inventory/measurement-unit/measurement-unit.admin.route';
import { AdminReportsRoute } from './reports/admin-reports.route';

const router = Router();
const adminController = new AdminController();

// Todas las rutas requieren autenticación
router.use(authMiddleware);
router.use(requireSuperAdmin)

// --- Businesses (Super Admin) ---
router.use('/business', requireSuperAdmin, BusinessAdminRoute);

// --- Users (Super Admin) ---
router.use('/users', UserAdminRoute);

/**
 * GET /api/v1/admin/stats
 * Estadísticas del sistema
 */
router.get('/stats', adminController.getStats.bind(adminController));

// --- Reports (Super Admin) ---
router.use('/reports', AdminReportsRoute);

// --- Subscription Payments (Super Admin) ---
router.use('/subscription-payments', SubscriptionPaymentAdminRoute);

// --- Subscription Plans (Super Admin) ---
router.use('/subscription-plans', SubscriptionPlanAdminRoute);

// --- Payment Methods (Super Admin) ---
router.use('/payment-methods', PaymentMethodAdminRoute);

// --- Taxes (Super Admin) ---
router.use('/taxes', TaxAdminRoute);

// --- Measurement Units (Super Admin) ---
router.use('/measurement-units', MeasurementUnitAdminRoute);

export default router;
