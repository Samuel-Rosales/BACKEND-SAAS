import { Router } from 'express';
import { MemberController } from './member.controller';
import { MemberValidator } from './member.validator';
import { handleValidationErrors, authMiddleware } from '@/middlewares';

const router = Router();
const controller = new MemberController();
const validator = new MemberValidator();

// Todas las rutas requieren Login y estar dentro de una Empresa
router.use(authMiddleware);

// POST: Agregar empleado (Por email)
router.post(
  '/', 
  validator.validateAdd, 
  handleValidationErrors, 
  controller.addMember
);

// GET: Ver lista de empleados
router.get('/', controller.findAll);

// GET One
router.get(
    '/:id', 
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

// PATCH: Cambiar rol o estado
router.patch(
  '/:id', 
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

// DELETE: Desvincular empleado
router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors, 
  controller.remove
);

export const BusinessMemberRoute = router;