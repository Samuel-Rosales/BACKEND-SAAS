import { Request, Response } from 'express';
import { ExchangeRateService } from './exchange-rate.service';

export class ExchangeRateController {
    private service = new ExchangeRateService();

    private getBusinessIdOrThrow(req: Request, res: Response): number | null {
        const businessId = req.user?.businessId;
        if (!businessId) {
            res.status(400).json({ message: 'Header x-business-id requerido', data: null });
            return null;
        }
        return businessId;
    }

    create = async (req: Request, res: Response) => {
        const businessId = this.getBusinessIdOrThrow(req, res);
        if (!businessId) return;

        const {status, data, message} = await this.service.create(businessId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAll = async (req: Request, res: Response) => {

        const businessId = this.getBusinessIdOrThrow(req, res);
        if (!businessId) return;

        const {status, data, message} = await this.service.findAll(businessId);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    findLatest = async (req: Request, res: Response) => {

        const businessId = this.getBusinessIdOrThrow(req, res);
        if (!businessId) return;

        const {status, data, message} = await this.service.findLatest(businessId);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;

        const businessId = this.getBusinessIdOrThrow(req, res);
        if (!businessId) return;

        const {status, data, message} = await this.service.findOne( +id, businessId);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;

        const businessId = this.getBusinessIdOrThrow(req, res);
        if (!businessId) return;

        const {status, data, message} = await this.service.update(+id, businessId, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;

        const businessId = this.getBusinessIdOrThrow(req, res);
        if (!businessId) return;

        const {status, data, message} = await this.service.remove(+id, businessId);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
