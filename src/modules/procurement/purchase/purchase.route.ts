import { Router } from 'express';
import { PurchaseController } from './purchase.controller';
import { PurchaseValidator } from './purchase.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware'; // Ajusta la ruta a tu proyecto
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto

const router = Router();
const controller = new PurchaseController();
const validator = new PurchaseValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// 1. Crear Compra
router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

// 2. Listar Compras (Con validación de query params: page, limit, dates)
router.get(
    '/', 
    validator.validateList,
    handleValidationErrors,
    controller.findAll
);

// 3. Obtener una Compra por ID
router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

export const PurchaseRoute = router;

export default router;