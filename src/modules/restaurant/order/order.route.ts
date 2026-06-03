import { Router } from 'express';
import { OrderController } from './order.controller';
import { OrderValidator } from './order.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new OrderController();
const validator = new OrderValidator();

router.use(authMiddleware);

router.post(
    '/',
    requireBusinessPermission('ORDERS_WRITE'),
    validator.validateCreate,
    handleValidationErrors,
    controller.create
);

router.get(
    '/',
    requireBusinessPermission('ORDERS_READ'),
    validator.validateQuery,
    handleValidationErrors,
    controller.findAll
);

router.get(
    '/:id',
    requireBusinessPermission('ORDERS_READ'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
    '/:id',
    requireBusinessPermission('ORDERS_WRITE'),
    validator.validateUpdate,
    handleValidationErrors,
    controller.updateStatus
);

router.delete(
    '/:id',
    requireBusinessPermission('ORDERS_WRITE'),
    validator.validateId,
    handleValidationErrors,
    controller.remove
);

router.patch(
    '/:id/pay',
    requireBusinessPermission('ORDERS_WRITE'),
    controller.markAsPaid
);

router.patch(
    '/:id/cancel',
    requireBusinessPermission('ORDERS_WRITE'),
    controller.cancel
);

export const OrderRoute = router;

export default router;
