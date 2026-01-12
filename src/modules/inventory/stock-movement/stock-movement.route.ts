import { Router } from 'express';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementValidator } from './stock-movement.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new StockMovementController();
const validator = new StockMovementValidator();

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
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.get(
    '/product/:productId',
    validator.validateProductId,
    handleValidationErrors,
    controller.findByProduct
);

router.get(
    '/depot/:depotId',
    validator.validateDepotId,
    handleValidationErrors,
    controller.findByDepot
);

router.get(
    '/type/:type',
    validator.validateType,
    handleValidationErrors,
    controller.findByType
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

export const StockMovementRoute = router;

export default router;
