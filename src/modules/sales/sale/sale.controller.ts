import { Request, Response } from 'express';
import { SaleService } from './sale.service';

const service = new SaleService();

export class SaleController {

    async create(req: Request, res: Response) {
        try {
            const { businessId, membershipId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }

            if (!membershipId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID del miembro (vendedor) en el header.',
                    data: null
                });
            }
            
            const {data, message, status} = await service.create(businessId, membershipId, req.body);

            return res.status(status).json({
                data,
                message
            });

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
                status: req.query.status as string,
                search: req.query.search as string,
                type: req.query.type as string
            };

            const {data, message, status, pagination} = await service.findAll(businessId, query);

            return res.status(status).json({
                data,
                message,
                pagination
            });

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

            const {data, message, status} = await service.findOne(businessId, id);

            return res.status(status).json({
                data,
                message
            });

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

            const {data, message, status} = await service.update(businessId, id, req.body);

            return res.status(status).json({
                data,
                message
            });

        } catch (error) {
            console.error('Error en SaleController.update:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al actualizar la venta',
                data: null
            });
        }
    }

    async addPayment(req: Request, res: Response) {
        try {
            const { businessId } = req.user;

            const saleId = Number(req.params.id);
            console.log('Received addPayment request for businessId:', businessId, 'with body:', req.body);

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }

            const { data, message, status } = await service.addPayment(businessId, saleId, req.body);

            return res.status(status).json({
                data,
                message
            });  
        } catch (error) {
            console.error('Error en SaleController.addPayment:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al agregar pago',
                data: null
            });
        }
    }

    async findCredits(req: Request, res: Response) {
        try {

            const { businessId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }

            const { data, message, status } = await service.findCredits(businessId);

            return res.status(status).json({
                data,
                message
            });
        }
        catch (error) {

            console.error('Error en SaleController.findCredits:', error);

            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener créditos',
                data: null
            });
        }
    }

    async getPaymentHistory(req: Request, res: Response) {
        try {

            const { businessId } = req.user;
            const saleId = Number(req.params.id);

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }
            
            const { data, message, status } = await service.getPaymentHistory(businessId, saleId);

            return res.status(status).json({
                data,
                message
            });
        } catch (error) {

            console.error('Error en SaleController.getPaymentHistory:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener el historial de pagos',
                data: null
            });
        }
    }
}
