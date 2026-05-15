import { Request, Response } from 'express';
import { StockLotService } from './stock-lot.service';

export class StockLotController {
    private service = new StockLotService();

    create = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.create(businessId, req.body);

        res.status(status).json({ 
            message, 
            data 
        });
    };

    findAll = async (req: Request, res: Response) => {
        const businessId = req.user?.businessId;

        // Mapeamos los Query Params del Frontend
        const query = {
            productId: req.query.productId ? Number(req.query.productId) : undefined,
            depotId: req.query.depotId ? Number(req.query.depotId) : undefined,
            // Opcional: forzar que solo traiga con stock positivo
            hasStock: true 
        };

        const result = await this.service.findAll(businessId, query);
        res.status(result.status).json(result);
    }

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId;

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

    findByProduct = async (req: Request, res: Response) => {
        const { productId } = req.params;
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const {status, data, message} = await this.service.findByProduct(businessId, +productId);

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

        const {status, data, message} = await this.service.update(businessId, +id, req.body);
        
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

        const {status, data, message} = await this.service.remove(businessId, +id);

        res.status(status).json({ 
            message, 
            data 
        });
    };
}
