import { Request, Response } from 'express';
import { SubscriptionPaymentMethodPublicService } from './subscription-payment-method.service';

export class SubscriptionPaymentMethodController {
  private service = new SubscriptionPaymentMethodPublicService();

  findActive = async (_req: Request, res: Response) => {
    const result = await this.service.findActive();
    return res.status(result.status).json({ message: result.message, data: result.data });
  };
}
