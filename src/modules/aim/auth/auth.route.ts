import { Router } from 'express';
import { AuthController } from './auth.controller';
import { AuthValidator } from './auth.validator';
import { handleValidationErrors } from '@/middlewares/validation.middleware';

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

export const AuthRoute = router;

export default router;