import { Router } from 'express';
import { SubscriptionPlanAdminController } from './subscription-plan.admin.controller';
import { SubscriptionPlanValidator } from '@/modules/platform/subscription-plan/subscription-plan.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

const router = Router();
const controller = new SubscriptionPlanAdminController();
const validator = new SubscriptionPlanValidator();

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);
router.get('/', controller.findAll);
router.get('/:id', validator.validateId, handleValidationErrors, controller.findOne);
router.patch('/:id', validator.validateUpdate, handleValidationErrors, controller.update);
router.delete('/:id', validator.validateId, handleValidationErrors, controller.remove);

router.get('/:id/prices', validator.validateId, handleValidationErrors, controller.listPrices);
router.put('/:id/prices', validator.validatePriceUpsert, handleValidationErrors, controller.upsertPrice);

export const SubscriptionPlanAdminRoute = router;
export default router;
