import { Router } from 'express';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateValidator } from './exchange-rate.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';
import type { BusinessPermissionCode } from '@/data/aim/role-permissions.data';

const router = Router();
const controller = new ExchangeRateController();
const validator = new ExchangeRateValidator();

const EXCHANGE_RATE_READ_PERMISSIONS: BusinessPermissionCode[] = [
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
  'EXPENSES_READ',
  'EXPENSES_WRITE',
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('BUSINESS_EXCHANGE_RATE_EDIT'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.post(
  '/sync-bcv',
  requireBusinessPermission('BUSINESS_EXCHANGE_RATE_EDIT'),
  controller.syncBCV
);

router.get('/', requireBusinessPermission(EXCHANGE_RATE_READ_PERMISSIONS), controller.findAll);

router.get(
    '/latest',
  requireBusinessPermission(EXCHANGE_RATE_READ_PERMISSIONS),
    controller.findLatest
);

router.get(
    '/active',
  requireBusinessPermission(EXCHANGE_RATE_READ_PERMISSIONS),
    controller.findLatest
);

router.get(
    '/:id', 
  requireBusinessPermission(EXCHANGE_RATE_READ_PERMISSIONS),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('BUSINESS_EXCHANGE_RATE_EDIT'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('BUSINESS_EXCHANGE_RATE_EDIT'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const ExchangeRateRoute = router;

export default router;
