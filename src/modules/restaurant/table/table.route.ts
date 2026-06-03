import { Router } from 'express';
import { TableController } from './table.controller';
import { TableValidator } from './table.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new TableController();
const validator = new TableValidator();

router.use(authMiddleware);

router.post(
    '/',
    requireBusinessPermission('TABLES_WRITE'),
    validator.validateCreate,
    handleValidationErrors,
    controller.create
);

router.get('/', requireBusinessPermission('TABLES_READ'), controller.findAll);

router.get(
    '/:id',
    requireBusinessPermission('TABLES_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
    '/:id',
    requireBusinessPermission('TABLES_WRITE'),
    validator.validateUpdate,
    handleValidationErrors,
    controller.update
);

router.delete(
    '/:id',
    requireBusinessPermission('TABLES_WRITE'),
    validator.validateId,
    handleValidationErrors,
    controller.remove
);

export const TableRoute = router;

export default router;
