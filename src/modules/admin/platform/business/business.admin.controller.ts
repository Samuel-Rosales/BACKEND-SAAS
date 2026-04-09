import { Request, Response } from 'express';
import { BusinessAdminService } from './business.admin.service';

const businessAdminService = new BusinessAdminService();

export class BusinessAdminController {
  /**
   * GET /api/v1/admin/businesses
   */
  async findAll(req: Request, res: Response) {
    try {

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const planType = req.query.planType as string | undefined;

      const result = await businessAdminService.findAll(page, limit, status, planType);

      return res.status(result.status).json(result);

    } catch (error) {
      console.error('BusinessAdminController.findAll error:', error);

      return res.status(500).json({
        message: 'Error interno del servidor',
        status: 500,
        data: null,
      });
    }
  }

  /**
   * PATCH /api/v1/admin/businesses/:id/status
   */
  async toggleStatus(req: Request, res: Response) {
    try {

      const businessId = parseInt(req.params.id);
      const { status } = req.body;

      const validStatuses = ['ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELLED'];

      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          message: 'Estado de suscripción inválido',
          status: 400,
          data: null,
        });
      }

      const result = await businessAdminService.toggleBusinessStatus(businessId, status);

      return res.status(result.status).json(result);
    } catch (error) {
      console.error('BusinessAdminController.toggleStatus error:', error);

      return res.status(500).json({
        message: 'Error interno del servidor',
        status: 500,
        data: null,
      });
    }
  }

  /**
   * PATCH /api/v1/admin/businesses/:id/subscription
   */
  async updateSubscription(req: Request, res: Response) {
    try {
      const businessId = parseInt(req.params.id);
      const { planType, status, endDate } = req.body;

      if (status) {
        const validStatuses = ['ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELLED'];

        if (!validStatuses.includes(status)) {
          return res.status(400).json({
            message: 'Estado de suscripción inválido',
            status: 400,
            data: null,
          });
        }
      }

      const result = await businessAdminService.updateBusinessSubscription(businessId, {
        planType,
        status: status as any,
        endDate: endDate ? new Date(endDate) : undefined,
      });

      return res.status(result.status).json(result);
      
    } catch (error) {
      console.error('BusinessAdminController.updateSubscription error:', error);
      return res.status(500).json({
        message: 'Error interno del servidor',
        status: 500,
        data: null,
      });
    }
  }
}
