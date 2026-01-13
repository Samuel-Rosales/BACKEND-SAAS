import { Request, Response } from 'express';
import { ProductPresentationService } from './product-presentation.service';

const service = new ProductPresentationService();

export class ProductPresentationController {

    async create(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const result = await service.create(businessId, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error interno', status: 500 });
        }
    }

    async findAllByProduct(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const productId = Number(req.query.productId);
            const result = await service.findAllByProduct(businessId, productId);
            return res.status(result.status).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error interno', status: 500 });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const id = Number(req.params.id);
            const result = await service.update(businessId, id, req.body);
            return res.status(result.status).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error interno', status: 500 });
        }
    }

    async remove(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const id = Number(req.params.id);
            const result = await service.remove(businessId, id);
            return res.status(result.status).json(result);
        } catch (error) {
            return res.status(500).json({ message: 'Error interno', status: 500 });
        }
    }
}