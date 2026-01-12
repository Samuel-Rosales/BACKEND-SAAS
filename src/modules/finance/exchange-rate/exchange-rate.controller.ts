import { Request, Response } from 'express';
import { ExchangeRateService } from './exchange-rate.service';

export class ExchangeRateController {
    private service = new ExchangeRateService();

    create = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId || req.body.businessId;
        const userId = req.user!.id;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.create(businessId, userId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAll = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findAll(businessId);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    findLatestByCurrency = async (req: Request, res: Response) => {
        const { currency } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findLatestByCurrency(businessId, currency);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findOne(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.update(businessId, +id, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.remove(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
