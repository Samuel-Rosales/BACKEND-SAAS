import { Request, Response } from 'express';
import { PaymentMethodService } from './payment-method.service';

export class PaymentMethodController {
    private service = new PaymentMethodService();

    create = async (req: Request, res: Response) => {
        const { status, data, message } = await this.service.create(req.body);

        res.status(status).json({
            message,
            data
        });
    };

    findAll = async (req: Request, res: Response) => {
        const { status, data, message } = await this.service.findAll();

        res.status(status).json({
            message,
            data
        });
    };

    findActive = async (req: Request, res: Response) => {
        const { status, data, message } = await this.service.findActive();

        res.status(status).json({
            message,
            data
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status, data, message } = await this.service.findOne(+id);

        res.status(status).json({
            message,
            data
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status, data, message } = await this.service.update(+id, req.body);

        res.status(status).json({
            message,
            data
        });
    };

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;
        const { status, data, message } = await this.service.remove(+id);

        res.status(status).json({
            message,
            data
        });
    };
}
