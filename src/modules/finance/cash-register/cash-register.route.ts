import { Router } from 'express';
import { CashRegisterController } from './cash-register.controller';
import { CashRegisterValidator } from './cash-register.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Tu middleware

const router = Router();
const controller = new CashRegisterController();
const validator = new CashRegisterValidator();

router.use(authMiddleware);

// 1. Abrir Caja
router.post(
  '/open',
  validator.validateOpen,
  handleValidationErrors,
  controller.open
);

// 2. Dashboard del Cajero (Saber cuánto tengo que tener)
// IMPORTANTE: Pon esta ruta ANTES de /:id para que no confunda "status" con un ID
router.get(
  '/status',
  controller.findMyStatus
);

// 3. Histórico General (Admin)
router.get(
  '/',
  controller.findAll
);

// 4. Detalle por ID
router.get(
  '/:id',
  controller.findOne
);

// 5. Cerrar Caja
router.patch(
  '/:id/close',
  validator.validateClose,
  handleValidationErrors,
  controller.close
);

export const CashRegisterRoute = router;