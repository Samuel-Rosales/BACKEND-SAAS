import { Request, Response } from 'express';
import { BusinessService } from './business.service';

export class BusinessController {
    private service = new BusinessService();

    create = async (req: Request, res: Response) => {
        // req.user está garantizado por authMiddleware
        const userId = req.user!.id;

        const {status, data, message} = await this.service.create(userId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAllByUser = async (req: Request, res: Response) => {
        // req.user está garantizado por authMiddleware
        const userId = req.user!.id;

        const {status, data, message} = await this.service.findAllByUser(userId);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        // req.user está garantizado por authMiddleware
        const userId = req.user!.id;

        const {status, data, message} = await this.service.findOne(+id, userId);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        // req.user está garantizado por authMiddleware
        const userId = req.user!.id;

        const {status, data, message} = await this.service.update(+id, userId, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };
}
