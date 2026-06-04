import { Request, Response } from 'express';
import { SubscriptionPaymentAdminService } from './subscription-payment.admin.service';

const subscriptionPaymentService = new SubscriptionPaymentAdminService();

export class SubscriptionPaymentAdminController {
  /**
   * GET /api/v1/admin/subscription-payments
   */
  async list(req: Request, res: Response) {
    try {

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;

      const result = await subscriptionPaymentService.listForAdmin(page, limit, status, search);

      return res.status(result.status).json(result);

    } catch (error) {
      console.error('SubscriptionPaymentAdminController.list error:', error);

      return res.status(500).json({
        message: 'Error interno del servidor',
        status: 500,
        data: null,
      });
    }
  }

  /**
   * PATCH /api/v1/admin/subscription-payments/:id/review
   * body: { status: 'APPROVED' | 'REJECTED', note?: string }
   */
  async review(req: Request, res: Response) {
    try {
       const id = parseInt(req.params.id as string);
      const { status, note } = req.body;

      const valid = ['APPROVED', 'REJECTED'];

      if (!valid.includes(status)) {
        return res.status(400).json({
          message: 'Estado inválido. Use APPROVED o REJECTED',
          status: 400,
          data: null,
        });
      }

      const reviewerUserId = req.user?.id;

      if (!reviewerUserId) {
        return res.status(401).json({
          message: 'No autorizado',
          status: 401,
          data: null,
        });
      }

      const result = await subscriptionPaymentService.reviewByAdmin(id, status, reviewerUserId, note);

      return res.status(result.status).json(result);

    } catch (error) {
      console.error('SubscriptionPaymentAdminController.review error:', error);
      
      return res.status(500).json({
        message: 'Error interno del servidor',
        status: 500,
        data: null,
      });
    }
  }
}
