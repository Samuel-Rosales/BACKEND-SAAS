import { Router } from 'express';
import { TaxController } from './tax.controller';
import { TaxValidator } from './tax.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission, requireSuperAdmin } from '@/middlewares';

const router = Router();
const controller = new TaxController();
const validator = new TaxValidator();

// Todas las rutas requieren autenticación
router.use(authMiddleware);

router.post('/', requireSuperAdmin, validator.validateCreate, handleValidationErrors, controller.create);

router.get('/', requireBusinessPermission('FINANCE_READ'), controller.findAll);

router.get('/active', requireBusinessPermission('FINANCE_READ'), controller.findActive);

router.get('/:id', requireBusinessPermission('FINANCE_READ'), validator.validateId, handleValidationErrors, controller.findOne);

router.patch('/:id', requireSuperAdmin, validator.validateUpdate, handleValidationErrors, controller.update);

router.delete('/:id', requireSuperAdmin, validator.validateId, handleValidationErrors, controller.remove);

export const TaxRoute = router;

export default router;
