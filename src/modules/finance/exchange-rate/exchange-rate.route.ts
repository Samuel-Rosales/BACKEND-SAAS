import { Router } from 'express';
import { ExchangeRateController } from './exchange-rate.controller';
import { ExchangeRateValidator } from './exchange-rate.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new ExchangeRateController();
const validator = new ExchangeRateValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', controller.findAll);

router.get(
    '/latest',
    handleValidationErrors,
    controller.findLatest
);

router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const ExchangeRateRoute = router;

export default router;
