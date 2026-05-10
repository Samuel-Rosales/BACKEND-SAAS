import { Router } from 'express';
import { InventoryReportController } from '../controllers/inventory-report.controller';
import { authMiddleware } from '@/middlewares/auth.middleware';
import { requireBusinessPermission } from '@/middlewares';

const router = Router();
const controller = new InventoryReportController();

router.use(authMiddleware);

router.get(
    '/overview',
    requireBusinessPermission('REPORTS_INVENTORY_VIEW'),
    controller.getOverview
);

router.get(
    '/by-cost',
    requireBusinessPermission('REPORTS_INVENTORY_VIEW'),
    controller.getByCost
);

router.get(
    '/by-sale',
    requireBusinessPermission('REPORTS_INVENTORY_VIEW'),
    controller.getBySale
);

router.get(
    '/by-category',
    requireBusinessPermission('REPORTS_INVENTORY_VIEW'),
    controller.getByCategory
);

export const InventoryReportRoute = router;