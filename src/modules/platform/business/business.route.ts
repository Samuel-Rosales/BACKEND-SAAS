import { Router } from 'express';
import { BusinessController } from './business.controller';
import { BusinessValidator } from './business.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new BusinessController();
const validator = new BusinessValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/my-businesses', controller.findAllByUser);

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

router.patch(
  '/:id/exchange-rate-config',
  validator.validateUpdateExchangeRateConfig,
  handleValidationErrors,
  controller.updateExchangeRateConfig
);

export const BusinessRoute = router;

export default router;
