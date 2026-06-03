import { Router } from 'express';
import { RoleController } from './role.controller';
import { RoleValidator } from './role.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares';
// import { authMiddleware } from '@/middlewares/auth.middleware'; // Opcional: Proteger rutas

const router = Router();
const controller = new RoleController();
const validator = new RoleValidator();

router.use(authMiddleware); // Descomentar para exigir login

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', controller.findAll);

router.get('/all', controller.findAllWithOwner);

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

export const RoleRoute = router;

export default router;