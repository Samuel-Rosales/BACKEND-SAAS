import { Router } from 'express';
import { SupplierController } from './supplier.controller';
import { SupplierValidator } from './supplier.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware'; // Ajusta la ruta a tu proyecto
import { authMiddleware } from '@/middlewares/auth.middleware'; // Ajusta la ruta a tu proyecto
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new SupplierController();
const validator = new SupplierValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('SUPPLIERS_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('SUPPLIERS_READ'), controller.findAll);

router.get(
    '/:id', 
  requireBusinessPermission('SUPPLIERS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('SUPPLIERS_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('SUPPLIERS_WRITE'),
  validator.validateId, 
  handleValidationErrors, 
  controller.remove
);

export const SupplierRoute = router;

export default router;