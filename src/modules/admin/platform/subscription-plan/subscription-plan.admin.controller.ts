import { Request, Response } from 'express';
import { SubscriptionPlanService } from '@/modules/platform/subscription-plan/subscription-plan.service';

export class SubscriptionPlanAdminController {
  private service = new SubscriptionPlanService();

  create = async (req: Request, res: Response) => {
    const result = await this.service.create(req.body);
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  findAll = async (_req: Request, res: Response) => {
    const result = await this.service.findAllAdmin();
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  findOne = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.service.findOneAdmin(id);
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

  listPrices = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const result = await this.service.listPrices(id);
    return res.status(result.status).json({ message: result.message, data: result.data });
  };

  upsertPrice = async (req: Request, res: Response) => {
    const id = Number(req.params.id);
    const { months, price, isActive } = req.body;

    const result = await this.service.upsertPrice(id, {
      months,
      price,
      isActive,
    });

    return res.status(result.status).json({ message: result.message, data: result.data });
  };
}
