import { Router } from 'express';
import { ContactController } from './contact.controller';
import { ContactValidator } from './contact.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware'; // Opcional: Proteger rutas

const router = Router();
const controller = new ContactController();
const validator = new ContactValidator();

router.use(authMiddleware); // Descomentar para exigir login

router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/', controller.findAll);

router.get(
  '/user',
  handleValidationErrors,
  controller.findByUserId
);

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

export const ContactRoute = router;

export default router;
