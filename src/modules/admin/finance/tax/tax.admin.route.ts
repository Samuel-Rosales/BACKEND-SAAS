import { Router } from 'express';
import { TaxAdminController } from './tax.admin.controller';
import { TaxValidator } from '@/modules/finance/tax/tax.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

const router = Router();
const controller = new TaxAdminController();
const validator = new TaxValidator();

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);

router.get('/', controller.findAll);

router.get('/:id', validator.validateId, handleValidationErrors, controller.findOne);

router.patch('/:id', validator.validateUpdate, handleValidationErrors, controller.update);

router.delete('/:id', validator.validateId, handleValidationErrors, controller.remove);

export const TaxAdminRoute = router;
export default router;
