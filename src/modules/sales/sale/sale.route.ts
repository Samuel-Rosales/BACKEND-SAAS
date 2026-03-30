import { Router } from 'express';
import { SaleController } from './sale.controller';
import { SaleValidator } from './sale.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new SaleController();
const validator = new SaleValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// 1. Crear Venta
router.post(
  '/', 
    requireBusinessPermission('SALES_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

// 2. Listar Ventas (Con validación de query params)
router.get(
    '/', 
    requireBusinessPermission('SALES_READ'),
    validator.validateList,
    handleValidationErrors,
    controller.findAll
);


router.get(
    '/credit',
    requireBusinessPermission('SALES_READ'),
    controller.findCredits
);

// 3. Obtener una Venta por ID
router.get(
    '/:id', 
    requireBusinessPermission('SALES_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.get(
    '/:id/payment-history',
    requireBusinessPermission('SALES_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.getPaymentHistory
);

// 4. Actualizar Venta (Solo status y remainingBalance)
router.patch(
    '/:id', 
    requireBusinessPermission('SALES_WRITE'),
    validator.validateUpdate, 
    handleValidationErrors, 
    controller.update
);

// 5. Agregar Pago a Venta
router.post(
    '/:id/sale-payment', 
    requireBusinessPermission('CREDITS_SALES_COLLECT'),
    validator.validateAddPayment,
    handleValidationErrors,
    controller.addPayment
);

router.post(
    '/:id/cancel',
    requireBusinessPermission('SALES_WRITE'),
    validator.validateId,
    handleValidationErrors,
    controller.cancel
);

export const SaleRoute = router;

export default router;
