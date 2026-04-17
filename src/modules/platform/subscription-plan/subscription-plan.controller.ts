import { Request, Response } from 'express';
import { SubscriptionPlanService } from './subscription-plan.service';

export class SubscriptionPlanController {
  private service = new SubscriptionPlanService();

  findAllPublic = async (req: Request, res: Response) => {
    const { status, data, message } = await this.service.findAllPublic();

    res.status(status).json({
      message,
      data,
    });
  };
}
