import { Request, Response } from 'express';
import { PurchaseService } from './purchase.service';

// Instanciamos el servicio una sola vez
const service = new PurchaseService();

export class PurchaseController {

    async create(req: Request, res: Response) {
        try {
            const { businessId, id: userId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }
            
            const result = await service.create(businessId, userId, req.body);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en PurchaseController.create:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno del servidor al crear la compra',
                data: null
            });
        }
    }

    async findAll(req: Request, res: Response) {
        try {

            const { businessId } = req.user;
            
            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }

            const query = {
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                fromDate: req.query.fromDate as string,
                toDate: req.query.toDate as string
            };

            const result = await service.findAll(businessId, query);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en PurchaseController.findAll:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener las compras',
                data: null
            });
        }
    }
    
    async findOne(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const id = Number(req.params.id);

            // Validación básica del ID antes de molestar al servicio
            if (isNaN(id)) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID de la compra debe ser un número válido',
                    data: null
                });
            }

            const result = await service.findOne(businessId, id);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en PurchaseController.findOne:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al buscar la compra',
                data: null
            });
        }
    }
}