import { Request, Response } from 'express';
import { MeasurementUnitService } from './measurement-unit.service';

export class MeasurementUnitController {
    private service = new MeasurementUnitService();

    create = async (req: Request, res: Response) => {

        const {message, status, data} = await this.service.create(req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAll = async (_req: Request, res: Response) => {

        const {message, status, data} = await this.service.findAll();

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findOne = async (req: Request, res: Response) => {

        const id = Number(req.params.id);

        const {message, status, data} = await this.service.findOne(id);
        res.status(status).json({ 
            message, 
            data 
        });
    };

    update = async (req: Request, res: Response) => {
        
        const id = Number(req.params.id);

        const {message, status, data} = await this.service.update(id, req.body);
        res.status(status).json({ 
            message, 
            data 
        });
    };

    remove = async (req: Request, res: Response) => {

        const id = Number(req.params.id);

        const {message, status, data} = await this.service.remove(id);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
