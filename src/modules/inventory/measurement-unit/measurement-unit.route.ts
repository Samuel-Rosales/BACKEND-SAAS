import { Router } from 'express';
import { MeasurementUnitController } from './measurement-unit.controller';
import { MeasurementUnitValidator } from './measurement-unit.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new MeasurementUnitController();
const validator = new MeasurementUnitValidator();

// Autenticación requerida
router.use(authMiddleware);

router.post(
  '/',
  requireBusinessPermission('INVENTORY_WRITE'),
  validator.validateCreate,
  handleValidationErrors,
  controller.create
);

router.get('/', requireBusinessPermission('INVENTORY_READ'), controller.findAll);

router.get(
  '/:id',
  requireBusinessPermission('INVENTORY_READ'),
  validator.validateId,
  handleValidationErrors,
  controller.findOne
);

router.patch(
  '/:id',
  requireBusinessPermission('INVENTORY_WRITE'),
  validator.validateUpdate,
  handleValidationErrors,
  controller.update
);

router.delete(
  '/:id',
  requireBusinessPermission('INVENTORY_WRITE'),
  validator.validateId,
  handleValidationErrors,
  controller.remove
);

export const MeasurementUnitRoute = router;

export default router;
