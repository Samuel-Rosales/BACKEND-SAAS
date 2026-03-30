import { Router } from 'express';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterValidator } from './cash-register.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Tu middleware
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new CashRegisterController();
const validator = new CashRegisterValidator();

router.use(authMiddleware);

// 1. Abrir Caja
router.post(
  '/open',
  requireBusinessPermission('CASH_REGISTER_OPEN'),
  validator.validateOpen,
  handleValidationErrors,
  controller.open
);

// 2. Dashboard del Cajero (Saber cuánto tengo que tener)
// IMPORTANTE: Pon esta ruta ANTES de /:id para que no confunda "status" con un ID
router.get(
  '/status',
  requireBusinessPermission('CASH_REGISTER_READ'),
  controller.findMyStatus
);

// 3. Histórico General (Admin)
router.get(
  '/',
  requireBusinessPermission('CASH_REGISTER_READ'),
  controller.findAll
);

// 4. Detalle por ID
router.get(
  '/:id',
  requireBusinessPermission('CASH_REGISTER_READ'),
  controller.findOne
);

// 5. Cerrar Caja
router.patch(
  '/:id/close',
  requireBusinessPermission('CASH_REGISTER_CLOSE'),
  validator.validateClose,
  handleValidationErrors,
  controller.close
);

export const CashRegisterRoute = router;