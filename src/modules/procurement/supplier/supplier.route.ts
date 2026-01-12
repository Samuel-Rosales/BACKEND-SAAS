import { Router } from 'express';
import { SupplierController } from './supplier.controller';
import { SupplierValidator } from './supplier.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware'; // Ajusta la ruta a tu proyecto
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto

const router = Router();
const controller = new SupplierController();
const validator = new SupplierValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', controller.findAll);

router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors, 
  controller.remove
);

export const SupplierRoute = router;

export default router;