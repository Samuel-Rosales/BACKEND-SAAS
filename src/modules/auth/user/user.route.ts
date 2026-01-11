import { Router } from 'express';
import { UserController } from './user.controller';
import { UserValidator } from './user.validator';
import { handleValidationErrors } from '@/middlewares';

const router = Router();
const controller = new UserController();
const validator = new UserValidator(); // Instanciamos el validador

// RUTAS

// 1. Crear: Validador -> Middleware de Errores -> Controlador
router.post(
  '/', 
  validator.validateCreate, 
  handleValidationErrors, 
  controller.create
);

// 2. Listar: No requiere validación
router.get('/', controller.findAll);

// 3. Obtener uno: Validamos que el ID sea numérico y exista
router.get(
  '/:id', 
  validator.validateId, 
  handleValidationErrors, 
  controller.findOne
);

// 4. Actualizar: Validamos campos y lógica de duplicados
router.patch(
  '/:id', 
  validator.validateUpdate, 
  handleValidationErrors, 
  controller.update
);

// 5. Eliminar
router.delete(
  '/:id', 
  validator.validateId, 
  handleValidationErrors, 
  controller.remove
);

export const UserRoute = router;

export default router;