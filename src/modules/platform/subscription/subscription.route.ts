import { Router } from 'express';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionValidator } from './subscription.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
// import { authMiddleware } from '@/middlewares/auth.middleware'; // Opcional: Proteger rutas

const router = Router();
const controller = new SubscriptionController();
const validator = new SubscriptionValidator();

// router.use(authMiddleware); // Descomentar para exigir login

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

router.get(
    '/business/:businessId',
    validator.validateBusinessId,
    handleValidationErrors,
    controller.findByBusinessId
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

export const SubscriptionRoute = router;

export default router;
