import { Router } from 'express';
import { TaxController } from './tax.controller';
import { TaxValidator } from './tax.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new TaxController();
const validator = new TaxValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post('/', validator.validateCreate, handleValidationErrors, controller.create);

router.get('/', controller.findAll);

router.get('/active', controller.findActive);

router.get('/:id', validator.validateId, handleValidationErrors, controller.findOne);

router.patch('/:id', validator.validateUpdate, handleValidationErrors, controller.update);

router.delete('/:id', validator.validateId, handleValidationErrors, controller.remove);

export const TaxRoute = router;

export default router;
