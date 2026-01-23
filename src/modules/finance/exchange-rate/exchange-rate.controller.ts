import { Request, Response } from 'express';
import { ExchangeRateService } from './exchange-rate.service';

export class ExchangeRateController {
    private service = new ExchangeRateService();

    create = async (req: Request, res: Response) => {
        const userId = req.user!.id;

        const {status, data, message} = await this.service.create(userId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAll = async (req: Request, res: Response) => {

        const {status, data, message} = await this.service.findAll();
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    findLatest = async (req: Request, res: Response) => {

        const {status, data, message} = await this.service.findLatest();

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;

        const {status, data, message} = await this.service.findOne( +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;

        const {status, data, message} = await this.service.update(+id, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;

        const {status, data, message} = await this.service.remove(+id);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
