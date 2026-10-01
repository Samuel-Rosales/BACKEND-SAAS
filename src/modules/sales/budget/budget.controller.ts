import { Request, Response } from 'express';
import { BudgetService } from './budget.service';

const service = new BudgetService();

export class BudgetController {

    async create(req: Request, res: Response) {
        try {
            const { businessId, membershipId } = req.user!;

            if (!businessId || !membershipId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta businessId o membershipId en la sesión.',
                    data: null
                });
            }

            const { status, message, data } = await service.create(businessId, membershipId, req.body);
            return res.status(status).json({ status, message, data });

        } catch (error) {
            console.error('Error en BudgetController.create:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al crear presupuesto',
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
                    message: 'Falta businessId en la sesión.',
                    data: null
                });
            }

            const query = {
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                status: req.query.status as any,
                clientId: req.query.clientId ? Number(req.query.clientId) : undefined,
                fromDate: req.query.fromDate as string,
                toDate: req.query.toDate as string,
                search: req.query.search as string,
                tzOffset: req.query.tzOffset ? Number(req.query.tzOffset) : undefined
            };

            const result = await service.findAll(businessId, query);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.findAll:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al listar presupuestos',
                data: null
            });
        }
    }

    async findOne(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);

            const result = await service.findOne(businessId, id);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.findOne:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al obtener presupuesto',
                data: null
            });
        }
    }

    async checkPriceUpdates(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);

            const result = await service.checkPriceUpdates(businessId, id);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.checkPriceUpdates:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al verificar precios',
                data: null
            });
        }
    }

    async update(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);

            const result = await service.update(businessId, id, req.body);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.update:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al actualizar presupuesto',
                data: null
            });
        }
    }

    async changeStatus(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);
            const { status } = req.body;

            const result = await service.changeStatus(businessId, id, status);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.changeStatus:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al cambiar estado del presupuesto',
                data: null
            });
        }
    }

    async convertToSale(req: Request, res: Response) {
        try {
            const { businessId, membershipId } = req.user!;
            const id = Number(req.params.id);

            if (!businessId || !membershipId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta businessId o membershipId en la sesión.',
                    data: null
                });
            }

            const result = await service.convertToSale(businessId, membershipId, id, req.body);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.convertToSale:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al convertir presupuesto en venta',
                data: null
            });
        }
    }

    async delete(req: Request, res: Response) {
        try {
            const { businessId } = req.user!;
            const id = Number(req.params.id);

            const result = await service.delete(businessId, id);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en BudgetController.delete:', error);
            return res.status(500).json({
                status: 500,
                message: 'Error interno al eliminar presupuesto',
                data: null
            });
        }
    }
}
