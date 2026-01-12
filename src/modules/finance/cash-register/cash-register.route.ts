import { Router } from 'express';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterValidator } from './cash-register.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new CashRegisterController();
const validator = new CashRegisterValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/open', 
  validator.validateOpen, 
  handleValidationErrors, 
  controller.open
);

router.get('/', controller.findAll);

router.get('/open', controller.findOpen);

router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id/close', 
  validator.validateClose, 
  handleValidationErrors, 
  controller.close
);

export const CashRegisterRoute = router;

export default router;
