import { Request, Response } from 'express';
import { PurchaseItemService } from './purchase-item.service';

export class PurchaseItemController {
    private service = new PurchaseItemService();

    create = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.create(businessId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAll = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const purchaseId = req.query.purchaseId ? Number(req.query.purchaseId) : undefined;

        const { status, data, message } = await this.service.findAll(businessId, purchaseId);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.findOne(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.update(businessId, +id, req.body);
        
        res.status(status).json({ 
            message, 
            data 
        });
    };

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.remove(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
