import { Router } from 'express';
import { UserAdminController } from './user.admin.controller';

const router = Router();
const controller = new UserAdminController();

router.get('/', controller.list.bind(controller));
router.post('/:id/reset-password', controller.resetPassword.bind(controller));

export const UserAdminRoute = router;
export default router;
