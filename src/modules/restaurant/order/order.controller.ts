import { Request, Response } from 'express';
import { OrderService } from './order.service';

export class OrderController {
    private service = new OrderService();

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
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const query = {
            status: req.query.status as string,
            tableId: req.query.tableId ? Number(req.query.tableId) : undefined
        };

        const { status, data, message } = await this.service.findAll(businessId, query);

        res.status(status).json({
            message,
            data
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user.businessId;

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

    updateStatus = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.updateStatus(businessId, +id, req.body);

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

    markAsPaid = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.markAsPaid(businessId, +id);

        res.status(status).json({
            message,
            data
        });
    };

    cancel = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user?.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.cancel(businessId, +id);

        res.status(status).json({
            message,
            data
        });
    };
}
