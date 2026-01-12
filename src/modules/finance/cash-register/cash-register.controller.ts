import { Request, Response } from 'express';
import { CashRegisterService } from './cash-register.service';

export class CashRegisterController {
    private service = new CashRegisterService();

    open = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.open(businessId, req.body);

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

    findOpen = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findOpen(businessId);
        
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

    close = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId || req.body.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.close(businessId, +id, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };
}
