import { Router } from 'express';
import { AiController } from './ai.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';

const router = Router();
const controller = new AiController();

router.use(authMiddleware);

router.post('/chat', controller.chat);
router.get('/usage', controller.getUsage);

export const AiRoute = router;
