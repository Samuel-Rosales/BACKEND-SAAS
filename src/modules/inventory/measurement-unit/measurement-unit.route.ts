import { Router } from 'express';
import { MeasurementUnitController } from './measurement-unit.controller';
import { MeasurementUnitValidator } from './measurement-unit.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new MeasurementUnitController();
const validator = new MeasurementUnitValidator();

// Autenticación requerida
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

export const MeasurementUnitRoute = router;

export default router;
