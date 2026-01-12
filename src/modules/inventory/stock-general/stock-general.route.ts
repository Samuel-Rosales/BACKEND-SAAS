import { Router } from 'express';
import { StockGeneralController } from './stock-general.controller';
import { StockGeneralValidator } from './stock-general.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new StockGeneralController();
const validator = new StockGeneralValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.createOrUpdate
);

router.get('/', controller.findAll);

router.get(
    '/product/:productId/depot/:depotId', 
    validator.validateProductAndDepot,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/product/:productId/depot/:depotId', 
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/product/:productId/depot/:depotId', 
  validator.validateProductAndDepot, 
  handleValidationErrors,
  controller.remove
);

export const StockGeneralRoute = router;

export default router;
