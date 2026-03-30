import { Router } from 'express';
import { MemberController } from './member.controller';
import { MemberValidator } from './member.validator';
import { handleValidationErrors, authMiddleware, requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new MemberController();
const validator = new MemberValidator();

// Todas las rutas requieren Login y estar dentro de una Empresa
router.use(authMiddleware);

// POST: Agregar empleado
router.post(
  '/', 
  requireBusinessPermission('MEMBERS_MANAGE'),
  validator.validateAdd, 
  handleValidationErrors, 
  controller.addMember
);

// GET: Ver lista de empleados
router.get('/', requireBusinessPermission('MEMBERS_VIEW'), controller.findAll);

// GET One
router.get(
    '/:id', 
  requireBusinessPermission('MEMBERS_VIEW'),
    validator.validateId,
    handleValidationErrors,
    controller.findOne
);

// PATCH: Cambiar rol o estado
router.patch(
  '/:id', 
  requireBusinessPermission('MEMBERS_MANAGE'),
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

// DELETE: Desvincular empleado
router.delete(
  '/:id', 
  requireBusinessPermission('MEMBERS_MANAGE'),
  validator.validateId, 
  handleValidationErrors, 
  controller.remove
);

export const BusinessMemberRoute = router;