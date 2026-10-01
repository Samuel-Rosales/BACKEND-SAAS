import { Router } from 'express';
import { QuotationController } from './quotation.controller';
import { QuotationValidator } from './quotation.validator';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

const router = Router();
const controller = new QuotationController();
const validator = new QuotationValidator();

// Ruta pública para ver/descargar PDF de la cotización (útil para links de WhatsApp)
router.get('/:id/pdf', controller.streamPdf);

router.use(authMiddleware);

router.post(
    '/',
    validator.validateCreate,
    handleValidationErrors,
    controller.create
);

router.get(
    '/',
    validator.validateQuery,
    handleValidationErrors,
    controller.findAll
);

router.get(
    '/:id',
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

router.patch(
    '/:id/status',
    validator.validateStatus,
    handleValidationErrors,
    controller.updateStatus
);

export const QuotationRoute = router;
export default router;
