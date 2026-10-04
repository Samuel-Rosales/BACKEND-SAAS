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

  /**
   * GET /api/v1/admin/reports/subscriptions/reminders
   */
  async reminders(req: Request, res: Response) {
    const windowDaysRaw = req.query.windowDays;
    const windowDays = windowDaysRaw === undefined ? 7 : Number(windowDaysRaw);

    const result = await reportService.getReminders(windowDays);
    return res.status(result.status).json(result);
  }

  /**
   * GET /api/v1/admin/reports/subscriptions/financial
   */
  async financial(req: Request, res: Response) {
    const month = typeof req.query.month === 'string' ? req.query.month : undefined;
    const result = await reportService.getFinancialReport(month);
    return res.status(result.status).json(result);
  }
}

