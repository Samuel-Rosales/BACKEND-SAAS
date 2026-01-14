import { Router } from 'express';
import { ClientController } from './client.controller';
import { ClientValidator } from './client.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new ClientController();
const validator = new ClientValidator();

// Aplicar autenticación a todas las rutas
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

export const ClientRoute = router;

export default router;
