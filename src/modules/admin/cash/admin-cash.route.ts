import { Router } from 'express';
import { AdminCashController } from './admin-cash.controller';

const router = Router();
const controller = new AdminCashController();

router.get('/balance', controller.getBalance.bind(controller));
router.get('/expenses', controller.getExpenses.bind(controller));
router.post('/expenses', controller.createExpense.bind(controller));
router.delete('/expenses/:id', controller.deleteExpense.bind(controller));

export const AdminCashRoute = router;
export default router;
