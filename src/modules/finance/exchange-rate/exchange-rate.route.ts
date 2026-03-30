import { Router } from 'express';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateValidator } from './exchange-rate.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ExchangeRateController();
const validator = new ExchangeRateValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('BUSINESS_EXCHANGE_RATE_EDIT'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('FINANCE_READ'), controller.findAll);

router.get(
    '/latest',
  requireBusinessPermission('FINANCE_READ'),
    controller.findLatest
);

router.get(
    '/:id', 
  requireBusinessPermission('FINANCE_READ'),
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
