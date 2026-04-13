import { Router } from 'express';
import { MeasurementUnitAdminController } from './measurement-unit.admin.controller';
import { MeasurementUnitValidator } from '@/modules/inventory/measurement-unit/measurement-unit.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

const router = Router();
const controller = new MeasurementUnitAdminController();
const validator = new MeasurementUnitValidator();

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);

router.get('/', controller.findAll);

router.get('/:id', validator.validateId, handleValidationErrors, controller.findOne);

router.patch('/:id', validator.validateUpdate, handleValidationErrors, controller.update);

router.delete('/:id', validator.validateId, handleValidationErrors, controller.remove);

export const MeasurementUnitAdminRoute = router;
export default router;
