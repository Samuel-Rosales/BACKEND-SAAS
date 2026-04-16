import { Request, Response } from 'express';
import { AdminSubscriptionsReportService } from './subscriptions-report.admin.service';

const reportService = new AdminSubscriptionsReportService();

export class AdminSubscriptionsReportController {
  /**
   * GET /api/v1/admin/reports/subscriptions/overview
   */
  async overview(req: Request, res: Response) {
    const windowDaysRaw = req.query.windowDays;
    const windowDays = windowDaysRaw === undefined ? 7 : Number(windowDaysRaw);

    const result = await reportService.getOverview(windowDays);
    return res.status(result.status).json(result);
  }
}
