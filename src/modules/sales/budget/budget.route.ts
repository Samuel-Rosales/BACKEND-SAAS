import { Router } from 'express';
import { BudgetController } from './budget.controller';
import { BudgetValidator } from './budget.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new BudgetController();
const validator = new BudgetValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

// 1. Crear Presupuesto
router.post(
    '/',
    requireBusinessPermission('BUDGETS_WRITE'),
    validator.validateCreate,
    handleValidationErrors,
    controller.create
);

// 2. Listar Presupuestos (con filtros y paginación)
router.get(
    '/',
    requireBusinessPermission('BUDGETS_READ'),
    validator.validateList,
    handleValidationErrors,
    controller.findAll
);

// 3. Verificación de Precios Actuales vs Cotizados y Tasa Activa
router.get(
    '/:id/price-check',
    requireBusinessPermission('BUDGETS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.checkPriceUpdates
);

// 4. Obtener Detalle de un Presupuesto por ID
router.get(
    '/:id',
    requireBusinessPermission('BUDGETS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

// 5. Actualizar Presupuesto
router.put(
    '/:id',
    requireBusinessPermission('BUDGETS_WRITE'),
    validator.validateUpdate,
    handleValidationErrors,
    controller.update
);

// 6. Cambiar Estado (Aceptar, Cancelar, etc.)
router.patch(
    '/:id/status',
    requireBusinessPermission('BUDGETS_WRITE'),
    validator.validateStatus,
    handleValidationErrors,
    controller.changeStatus
);

// 7. Cobrar Directamente / Convertir a Venta
router.post(
    '/:id/convert-to-sale',
    requireBusinessPermission('BUDGETS_CONVERT'),
    validator.validateConvert,
    handleValidationErrors,
    controller.convertToSale
);

// 8. Eliminar Presupuesto
router.delete(
    '/:id',
    requireBusinessPermission('BUDGETS_DELETE'),
    validator.validateId,
    handleValidationErrors,
    controller.delete
);

export { router as BudgetRoute };
