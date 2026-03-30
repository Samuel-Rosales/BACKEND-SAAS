import { Router } from 'express';
import { StockLotController } from './stock-lot.controller';
import { StockLotValidator } from './stock-lot.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new StockLotController();
const validator = new StockLotValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('INVENTORY_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('INVENTORY_READ'), controller.findAll);

router.get(
    '/:id', 
  requireBusinessPermission('INVENTORY_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.get(
    '/product/:productId',
  requireBusinessPermission('INVENTORY_READ'),
    validator.validateProductId,
    handleValidationErrors,
    controller.findByProduct
);

router.patch(
  '/:id', 
  requireBusinessPermission('INVENTORY_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('INVENTORY_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const StockLotRoute = router;

export default router;
