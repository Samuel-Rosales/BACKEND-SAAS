import { Router } from 'express';
import { ClientController } from './client.controller';
import { ClientValidator } from './client.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new ClientController();
const validator = new ClientValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

router.post(
  '/', 
  requireBusinessPermission('CLIENTS_WRITE'),
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', requireBusinessPermission('CLIENTS_READ'), controller.findAll);

router.get(
  '/:id/history',
  requireBusinessPermission('CLIENTS_READ'),
  validator.validateId,
  handleValidationErrors,
  controller.purchaseHistory
);

router.get(
    '/:id', 
  requireBusinessPermission('CLIENTS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
  '/:id', 
  requireBusinessPermission('CLIENTS_WRITE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

router.delete(
  '/:id', 
  requireBusinessPermission('CLIENTS_WRITE'),
  validator.validateId, 
  handleValidationErrors,
  controller.remove
);

export const ClientRoute = router;

export default router;
