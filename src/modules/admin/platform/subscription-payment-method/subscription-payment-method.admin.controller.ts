import { Request, Response } from 'express';
import { SubscriptionPaymentMethodService } from './subscription-payment-method.service';

export class SubscriptionPaymentMethodAdminController {
  private service = new SubscriptionPaymentMethodService();

  create = async (req: Request, res: Response) => {
    const result = await this.service.create(req.body);
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  findAll = async (_req: Request, res: Response) => {
    const result = await this.service.findAll();
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  findOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.service.findOne(id);
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  update = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.service.update(id, req.body);
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  remove = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.service.remove(id);
    return res.status(result.status).json({ message: result.message, data: result.data });
  };
}
