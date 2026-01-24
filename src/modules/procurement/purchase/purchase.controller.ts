import { Request, Response } from 'express';
import { PurchaseService } from './purchase.service';

// Instanciamos el servicio una sola vez
const service = new PurchaseService();

export class PurchaseController {

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
                    message: 'Falta el ID de la membresía en el header.',
                    data: null
                });
            }
            
            const {data, status, message} = await service.create(businessId, Number(membershipId), req.body);

            return res.status(status).json({ data, status, message });

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

            const {data, status, message} = await service.findOne(businessId, id);

            return res.status(status).json({ data, status, message });

        } catch (error) {
            console.error('Error en PurchaseController.findOne:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al buscar la compra',
                data: null
            });
        }
    }

    async addPayment(req: Request, res: Response) {
        try {
            const { businessId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }

            const purchaseId = Number(req.params.id);

            if (!purchaseId) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID de la compra es inválido.',
                    data: null
                });
            }

            const paymentData = req.body;

            const {data, status, message} = await service.addPayment(businessId, purchaseId, paymentData);

            return res.status(status).json({ data, status, message });
        } catch (error) {
            console.error('Error en PurchaseController.addPayment:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al agregar el pago a la compra',
                data: null
            });
        }
    }

    async findPayables(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }
            const {data, status, message} = await service.findPayables(businessId);

            return res.status(status).json({ data, status, message });

        } catch (error) {
            console.error('Error en PurchaseController.findPayables:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener las cuentas por pagar',
                data: null
            });
        }
    }

    async getPurchasePaymentDetails(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la empresa en el header.',
                    data: null
                });
            }
            const purchaseId = Number(req.params.id);
            if (!purchaseId) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID de la compra es inválido.',
                    data: null
                });
            }
            const {data, status, message} = await service.getPurchasePaymentDetails(businessId, purchaseId);

            return res.status(status).json({ data, status, message });
        } catch (error) {
            console.error('Error en PurchaseController.getPurchasePaymentDetails:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener los detalles de pago de la compra',
                data: null
            });
        }
    }
}