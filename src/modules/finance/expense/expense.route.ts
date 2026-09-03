import { Router } from 'express';
import { ExpenseController } from './expense.controller';
import { ExpenseValidator } from './expense.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ExpenseController();
const validator = new ExpenseValidator();

router.use(authMiddleware);

// Resumen y métricas rápidas (antes de /:id)
router.get(
  '/summary',
  requireBusinessPermission('EXPENSES_READ'),
  controller.getSummary
);

// Reporte detallado de gastos
router.get(
  '/report',
  requireBusinessPermission('EXPENSES_READ'),
  controller.getReport
);

// Listado de gastos con filtros
router.get(
  '/',
  requireBusinessPermission('EXPENSES_READ'),
  controller.findAll
);

// Detalle de un gasto
router.get(
  '/:id',
  requireBusinessPermission('EXPENSES_READ'),
  validator.validateId,
  handleValidationErrors,
  controller.findOne
);

// Registrar nuevo gasto
router.post(
  '/',
  requireBusinessPermission('EXPENSES_WRITE'),
  validator.validateCreate,
  handleValidationErrors,
  controller.create
);

// Editar gasto existente
router.patch(
  '/:id',
  requireBusinessPermission('EXPENSES_WRITE'),
  validator.validateUpdate,
  handleValidationErrors,
  controller.update
);

// Eliminar / Anular gasto
router.delete(
  '/:id',
  requireBusinessPermission('EXPENSES_DELETE'),
  validator.validateId,
  handleValidationErrors,
  controller.remove
);

export const ExpenseRoute = router;
export default router;
