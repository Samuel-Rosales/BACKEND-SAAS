import { Router } from 'express';
import { PermissionController } from './permission.controller';
import { authMiddleware } from '@/middlewares';

const router = Router();
const controller = new PermissionController();

router.use(authMiddleware);

router.get('/', controller.findAll);

export const PermissionRoute = router;
export default router;