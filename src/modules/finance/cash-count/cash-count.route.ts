import { Router } from 'express';
import { CashCountController } from './cash-count.controller';
import { CashCountValidator } from './cash-count.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new CashCountController();
const validator = new CashCountValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get(
    '/cash-register/:cashRegisterId',
    validator.validateCashRegisterId,
    handleValidationErrors,
    controller.findByCashRegister
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

export const CashCountRoute = router;

export default router;
