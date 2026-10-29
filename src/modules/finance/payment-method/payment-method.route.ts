import { Router } from 'express';
import { PaymentMethodController } from './payment-method.controller';
import { PaymentMethodValidator } from './payment-method.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission, requireSuperAdmin } from '@/middlewares';
import type { BusinessPermissionCode } from '@/data/aim/role-permissions.data';

const router = Router();
const controller = new PaymentMethodController();
const validator = new PaymentMethodValidator();

const PAYMENT_METHOD_READ_PERMISSIONS: BusinessPermissionCode[] = [
  'FINANCE_READ',
  'SALES_READ',
  'SALES_WRITE',
  'CASH_REGISTER_READ',
  'CREDITS_SALES_COLLECT',
  'CREDITS_PURCHASES_PAY',
  'ORDERS_READ',
  'ORDERS_WRITE',
  'PROCUREMENT_READ',
  'PROCUREMENT_WRITE',
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireSuperAdmin,
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission(PAYMENT_METHOD_READ_PERMISSIONS), controller.findAll);

router.get('/active', requireBusinessPermission(PAYMENT_METHOD_READ_PERMISSIONS), controller.findActive);

router.get(
    '/:id', 
  requireBusinessPermission(PAYMENT_METHOD_READ_PERMISSIONS),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireSuperAdmin,
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireSuperAdmin,
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const PaymentMethodRoute = router;

export default router;
