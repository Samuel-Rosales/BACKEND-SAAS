import { Request, Response } from 'express';
import { CashRegisterService } from './cash-register.service';

export class CashRegisterController {
    private service = new CashRegisterService();

    open = async (req: Request, res: Response) => {
        const businessId = req.user.businessId;

        const membershipId = req.user.membershipId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
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
        const { status, data, message } = await this.service.open(businessId, membershipId, req.body);

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

        const { status, data, message } = await this.service.findAll(businessId);

        res.status(status).json({
            message,
            data
        });
    };

    // Este es el endpoint que llama el Frontend al cargar el POS
    findMyStatus = async (req: Request, res: Response) => {

        const businessId = req.user.businessId;
        const memberId = req.user.membershipId;

        const { status, data, message } = await this.service.findMyOpenRegister(businessId, memberId);

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

    close = async (req: Request, res: Response) => {
        const { id } = req.params;
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'ID de negocio requerido',
                data: null
            });
        }

        const { status, data, message } = await this.service.close(businessId, +id, req.body);

        res.status(status).json({
            message,
            data
        });
    };
}
