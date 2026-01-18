import { Request, Response } from 'express';
import { ClientService } from './client.service';

export class ClientController {
    private service = new ClientService();

    create = async (req: Request, res: Response) => {
        // req.user garantizado por authMiddleware
        // Asumimos que el middleware inyectó el businessId desde el header/token
        const businessId = req.user!.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        const { status, data, message } = await this.service.create(businessId, req.body);

        res.status(status).json({
            message,
            data
        });
    };

    findAll = async (req: Request, res: Response) => {
        const businessId = req.user!.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        const query = {
            search: req.query.search ? String(req.query.search) : undefined,
            status: req.query.status ? String(req.query.status) : undefined
        };

        const { status, data, message } = await this.service.findAll(businessId, query);

        res.status(status).json({
            message,
            data
        });
    };

    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user!.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        const { status, data, message } = await this.service.findOne(businessId, +id);

        res.status(status).json({
            message,
            data
        });
    };

    update = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user!.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        const { status, data, message } = await this.service.update(businessId, +id, req.body);

        res.status(status).json({
            message,
            data
        });
    };

    remove = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user!.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        const { status, data, message } = await this.service.remove(businessId, +id);

        res.status(status).json({
            message,
            data
        });
    };
}
