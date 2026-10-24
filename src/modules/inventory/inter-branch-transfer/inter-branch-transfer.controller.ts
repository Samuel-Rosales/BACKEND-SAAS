import { Request, Response } from 'express';
import { InterBranchTransferService } from './inter-branch-transfer.service';

export class InterBranchTransferController {
    private service = new InterBranchTransferService();

    createDispatch = async (req: Request, res: Response) => {
        const businessId = Number(req.user?.businessId);
        const memberId = Number(req.user?.membershipId);

        if (!businessId || !memberId) {
            return res.status(403).json({ message: 'No tienes una membresía activa en este negocio' });
        }

        const result = await this.service.createDispatch(businessId, memberId, req.body);
        return res.status(result.status).json(result);
    };

    getPendingTransfers = async (req: Request, res: Response) => {
        const businessId = Number(req.user?.businessId);
        if (!businessId) {
            return res.status(403).json({ message: 'Negocio no especificado' });
        }

        const result = await this.service.getPendingTransfers(businessId);
        return res.status(result.status).json(result);
    };

    getSentTransfers = async (req: Request, res: Response) => {
        const businessId = Number(req.user?.businessId);
        if (!businessId) {
            return res.status(403).json({ message: 'Negocio no especificado' });
        }

        const result = await this.service.getSentTransfers(businessId);
        return res.status(result.status).json(result);
    };

    getTransferById = async (req: Request, res: Response) => {
        const transferId = Number(req.params.id);
        if (!transferId) {
            return res.status(400).json({ message: 'ID de transferencia inválido' });
        }

        const result = await this.service.getTransferById(transferId);
        return res.status(result.status).json(result);
    };

    receiveTransfer = async (req: Request, res: Response) => {
        const businessId = Number(req.user?.businessId);
        const memberId = Number(req.user?.membershipId);
        const transferId = Number(req.params.id);

        if (!businessId || !memberId) {
            return res.status(403).json({ message: 'No tienes una membresía activa en este negocio' });
        }

        if (!transferId) {
            return res.status(400).json({ message: 'ID de transferencia inválido' });
        }

        const result = await this.service.receiveTransfer(businessId, memberId, transferId, req.body);
        return res.status(result.status).json(result);
    };
}
