import { Request, Response } from 'express';
import { SubscriptionPaymentService } from './subscription-payment.service';

export class SubscriptionPaymentController {
  private service = new SubscriptionPaymentService();

  create = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    const userId = req.user?.id;

    if (!businessId) {
      return res.status(400).json({
        status: 400,
        message: 'Falta el header x-business-id',
        data: null,
      });
    }

    if (!userId) {
      return res.status(401).json({
        status: 401,
        message: 'No autorizado',
        data: null,
      });
    }

    const result = await this.service.create(businessId, userId, req.body);
    return res.status(result.status).json(result);
  };

  findAllMy = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(400).json({
        status: 400,
        message: 'Falta el header x-business-id',
        data: null,
      });
    }

    const result = await this.service.findAllMy(businessId);
    return res.status(result.status).json(result);
  };

  findOneMy = async (req: Request, res: Response) => {
    const businessId = req.user?.businessId;
    const id = Number(req.params.id);

    if (!businessId) {
      return res.status(400).json({
        status: 400,
        message: 'Falta el header x-business-id',
        data: null,
      });
    }

    const result = await this.service.findOneMy(businessId, id);
    return res.status(result.status).json(result);
  };
}
