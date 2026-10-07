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
            page: req.query.page ? Number(req.query.page) : undefined,
            limit: req.query.limit ? Number(req.query.limit) : undefined,
            search: req.query.search ? String(req.query.search) : undefined,
            isActive: req.query.isActive ? String(req.query.isActive) : undefined
        };

        const { status, data, message, pagination } = await this.service.findAll(businessId, query);

        res.status(status).json({
            message,
            data,
            pagination
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

    purchaseHistory = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user!.businessId;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        const { status, data, message } = await this.service.purchaseHistory(businessId, +id);

        return res.status(status).json({
            message,
            data
        });
    };

    lookupRif = async (req: Request, res: Response) => {
        const businessId = req.user!.businessId;
        const document = req.params.document || (req.query.document as string);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        if (!document) {
            return res.status(400).json({ message: 'Debe proporcionar un número de documento para consultar.' });
        }

        const { status, data, message } = await this.service.lookupRif(businessId, document);

        return res.status(status).json({
            message,
            data
        });
    };

    verifyCaptcha = async (req: Request, res: Response) => {
        const businessId = req.user!.businessId;
        const { sessionId, captchaCode, docType, docNumber, checkDigit } = req.body;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el ID de la empresa en el header.' });
        }

        if (!sessionId || !captchaCode) {
            return res.status(400).json({ message: 'Se requiere el ID de sesión y el código de seguridad de la imagen.' });
        }

        const { status, data, message } = await this.service.verifyRifCaptcha(businessId, {
            sessionId,
            captchaCode,
            docType,
            docNumber,
            checkDigit
        });

        return res.status(status).json({
            message,
            data
        });
    };
}

