import { Request, Response } from 'express';
import { CreditNoteService } from './credit-note.service';
import { CreateCreditNoteInterface } from './interfaces'; // Tu interfaz manual

export class CreditNoteController {
    private service = new CreditNoteService();

    create = async (req: Request, res: Response) => {
        const businessId = req.user.businessId;
        const memberId = req.user.membershipId;

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es requerido. Verifica el header x-business-id.',
                data: null
            });
        }

        if (!memberId) {
            return res.status(400).json({
                message: 'No se pudo resolver la membresía del usuario para este negocio. Verifica el header x-business-id y tus permisos.',
                data: null
            });
        }
        
        const data: CreateCreditNoteInterface = req.body; 

        const { status, message, data: result } = await this.service.create(
            businessId, 
            memberId, 
            data
        );

        res.status(status).json({ message, data: result });
    };

    findAll = async (req: Request, res: Response) => {
        const businessId = req.user.businessId;
        const query = req.query; // Express ya parsea el query string

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es requerido. Verifica el header x-business-id.',
                data: null
            });
        }

        const { status, message, data } = await this.service.findAll(businessId, query);
        res.status(status).json({ message, data });
    };
}