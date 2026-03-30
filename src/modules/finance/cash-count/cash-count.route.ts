import { Router } from 'express';
import { CashCountController } from './cash-count.controller';
import { CashCountValidator } from './cash-count.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new CashCountController();
const validator = new CashCountValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('CASH_COUNT'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get(
    '/cash-register/:cashRegisterId',
  requireBusinessPermission('CASH_REGISTER_READ'),
    validator.validateCashRegisterId,
    handleValidationErrors,
    controller.findByCashRegister
);

router.get(
    '/:id', 
  requireBusinessPermission('CASH_REGISTER_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('CASH_COUNT'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('CASH_COUNT'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const CashCountRoute = router;

export default router;
