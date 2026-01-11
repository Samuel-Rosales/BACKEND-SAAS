import { Router } from 'express';
import { DepotController } from './depot.controller';
import { DepotValidator } from './depot.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new DepotController();
const validator = new DepotValidator();

// Todas las rutas requieren autenticación
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

export const DepotRoute = router;

export default router;
