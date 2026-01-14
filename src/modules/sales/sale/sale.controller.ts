import { Request, Response } from 'express';
import { SaleService } from './sale.service';

const service = new SaleService();

export class SaleController {

    async create(req: Request, res: Response) {
        try {
            const { businessId, id: userId } = req.user!;
            const memberId = req.body.memberId || userId; // Usar el memberId del body o el del usuario autenticado

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }
            
            const result = await service.create(businessId, memberId, req.body);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en SaleController.create:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno del servidor al crear la venta',
                data: null
            });
        }
    }

    async findAll(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            
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
                toDate: req.query.toDate as string,
                clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
                status: req.query.status as string
            };

            const result = await service.findAll(businessId, query);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en SaleController.findAll:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener las ventas',
                data: null
            });
        }
    }
    
    async findOne(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);

            if (isNaN(id)) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID de la venta debe ser un número válido',
                    data: null
                });
            }

            const result = await service.findOne(businessId, id);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en SaleController.findOne:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al buscar la venta',
                data: null
            });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);

            if (isNaN(id)) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID de la venta debe ser un número válido',
                    data: null
                });
            }

            const result = await service.update(businessId, id, req.body);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en SaleController.update:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al actualizar la venta',
                data: null
            });
        }
    }
}
