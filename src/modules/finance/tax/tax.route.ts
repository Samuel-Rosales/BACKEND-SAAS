import { Router } from 'express';
import { TaxController } from './tax.controller';
import { TaxValidator } from './tax.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission, requireSuperAdmin } from '@/middlewares';
import type { BusinessPermissionCode } from '@/data/aim/role-permissions.data';

const router = Router();
const controller = new TaxController();
const validator = new TaxValidator();

const TAX_READ_PERMISSIONS: BusinessPermissionCode[] = [
  'FINANCE_READ',
  'SALES_READ',
  'SALES_WRITE',
  'PRODUCTS_READ',
  'PRODUCTS_WRITE',
  'PROCUREMENT_READ',
  'PROCUREMENT_WRITE',
  'INVENTORY_READ',
  'INVENTORY_WRITE',
];

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post('/', requireSuperAdmin, validator.validateCreate, handleValidationErrors, controller.create);

router.get('/', requireBusinessPermission(TAX_READ_PERMISSIONS), controller.findAll);

router.get('/active', requireBusinessPermission(TAX_READ_PERMISSIONS), controller.findActive);

router.get('/:id', requireBusinessPermission(TAX_READ_PERMISSIONS), validator.validateId, handleValidationErrors, controller.findOne);

router.patch('/:id', requireSuperAdmin, validator.validateUpdate, handleValidationErrors, controller.update);

router.delete('/:id', requireSuperAdmin, validator.validateId, handleValidationErrors, controller.remove);

export const TaxRoute = router;

export default router;
