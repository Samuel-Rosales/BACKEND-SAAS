import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthValidator } from './auth.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new AuthController();
const validator = new AuthValidator();

// POST /api/v1/auth/login
router.post(
  '/login', 
  validator.validateAuth, 
  handleValidationErrors, 
  controller.login
);

router.get(
    '/me', 
    authMiddleware,
    controller.getMe
);

router.post(
    '/refresh',
    controller.refresh
);

export const AuthRoute = router;

export default router;