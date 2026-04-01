import { Router } from 'express';
import { BusinessController } from './business.controller';
import { BusinessValidator } from './business.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new BusinessController();
const validator = new BusinessValidator();

// Aplicar autenticación a todas las rutas
router.use(authMiddleware);

// --- CREACIÓN Y LISTADOS ---
router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

router.get('/my-businesses', controller.findAllByUser);

// --- LECTURA DE DATOS ---

// 1. Obtener datos básicos (Header / Dashboard)
router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

// 2. Obtener configuración completa (Para el formulario React)
router.get(
    '/:id/settings',
    requireBusinessPermission('BUSINESS_SETTINGS_VIEW'),
    validator.validateId,
    handleValidationErrors,
    controller.getSettings
);

// --- ACTUALIZACIONES SEGMENTADAS ---

// A. Actualizar Info General (Nombre, Dirección, Logo)
router.patch( // O PUT, dependiendo de tu preferencia
  '/:id/general', 
  validator.validateUpdateGeneral, 
  handleValidationErrors, 
  controller.updateGeneral
);

// B. Actualizar Políticas (Créditos, Reglas)
router.patch(
  '/:id/policies',
  validator.validateUpdatePolicies,
  handleValidationErrors,
  controller.updatePolicies
);

// C. Actualizar Tasas (Estrategia, Monto)
router.patch(
  '/:id/exchange-rate',
  validator.validateUpdateExchangeRateConfig,
  handleValidationErrors,
  controller.updateExchangeRateConfig
);

export const BusinessRoute = router;
export default router;