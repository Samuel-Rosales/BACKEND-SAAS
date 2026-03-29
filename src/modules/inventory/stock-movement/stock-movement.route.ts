import { Router } from 'express';
import { StockMovementController } from './stock-movement.controller';
import { StockMovementValidator } from './stock-movement.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new StockMovementController();
const validator = new StockMovementValidator();

// Todas las rutas de inventario son protegidas
router.use(authMiddleware);

// ==========================================
// 1. RUTAS DE LECTURA (Queries)
// ==========================================

// LISTAR CON FILTROS AVANZADOS
// Ahora soporta: ?page=1 & search=aspirina & type=IN & productId=5 & depotId=2
// Ya no necesitas rutas separadas por tipo o producto.
router.get(
    '/', 
  requireBusinessPermission('STOCK_MOVEMENTS_READ'),
    validator.validateListQuery,
    handleValidationErrors, 
    controller.findAll
);

// OBTENER UNO POR ID
router.get(
    '/:id', 
  requireBusinessPermission('STOCK_MOVEMENTS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

// ==========================================
// 2. RUTAS DE ESCRITURA (Commands)
// ==========================================

// CREAR MOVIMIENTO
router.post(
  '/', 
  requireBusinessPermission('STOCK_MOVEMENTS_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

// ACTUALIZAR (Solo metadatos como 'reason', no cantidades)
/*router.patch(
  '/:id', 
  // Primero validamos que el ID de la URL sea número
  validator.validateId,
  // Luego validamos el cuerpo del request
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);*/

// ELIMINAR (Reversión lógica o física)
router.delete(
  '/:id', 
  requireBusinessPermission('STOCK_MOVEMENTS_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const StockMovementRoute = router;
export default router;