import { Router } from 'express';
import { PurchaseOrderController } from './purchase-order.controller';
import { PurchaseOrderValidator } from './purchase-order.validator';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new PurchaseOrderController();
const validator = new PurchaseOrderValidator();

// Ruta de visualización / streaming de PDF
router.get('/:id/pdf', controller.streamPdf);

router.use(authMiddleware);

// Crear Orden de Compra
router.post(
    '/',
    requireBusinessPermission('PROCUREMENT_WRITE'),
    validator.validateCreate,
    handleValidationErrors,
    controller.create
);

// Listar Órdenes de Compra
router.get(
    '/',
    requireBusinessPermission('PROCUREMENT_READ'),
    validator.validateQuery,
    handleValidationErrors,
    controller.findAll
);

// Obtener detalle por ID
router.get(
    '/:id',
    requireBusinessPermission('PROCUREMENT_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

// Cambiar Estado (Aprobar o Cancelar)
router.patch(
    '/:id/status',
    requireBusinessPermission('PROCUREMENT_WRITE'),
    validator.validateStatus,
    handleValidationErrors,
    controller.updateStatus
);

// Recibir y Verificar Mercancía -> Crea la Compra e ingresa a Inventario
router.post(
    '/:id/receive',
    requireBusinessPermission('PROCUREMENT_WRITE'),
    validator.validateReceive,
    handleValidationErrors,
    controller.receive
);

export const PurchaseOrderRoute = router;
export default router;
