import { Router } from 'express';
import { DepotController } from './depot.controller';
import { DepotValidator } from './depot.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new DepotController();
const validator = new DepotValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('DEPOSITS_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('DEPOSITS_READ'), controller.findAll);

router.get(
    '/:id', 
  requireBusinessPermission('DEPOSITS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('DEPOSITS_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('DEPOSITS_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const DepotRoute = router;

export default router;
