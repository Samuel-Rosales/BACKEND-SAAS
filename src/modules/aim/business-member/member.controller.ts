import { Request, Response } from 'express';
import { MemberService } from './member.service';

export class MemberController {
    private service = new MemberService();

    addMember = async (req: Request, res: Response) => {
        const businessId = req.user.businessId; 

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es obligatorio',
                data: null
            });
        }
        
        const { status, message, data } = await this.service.addMember(businessId, req.body);

        return res.status(status).json({
            data,
            message
        });
    };

    findAll = async (req: Request, res: Response) => {

        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es obligatorio',
                data: null
            });
        }

        const { status, message, data } = await this.service.findAll(businessId);
        
        return res.status(status).json({
            data,
            message
        });
    };

    findOne = async (req: Request, res: Response) => {
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es obligatorio',
                data: null
            });
        }

        const { id } = req.params;

        const { status, message, data } = await this.service.findOne(businessId, +id);

        return res.status(status).json({
            data,
            message
        });
    };

    update = async (req: Request, res: Response) => {
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es obligatorio',
                data: null
            });
        }

        const { id } = req.params;

        const { status, message, data } = await this.service.update(businessId, +id, req.body);

        return res.status(status).json({
            data,
            message
        });
    };

    remove = async (req: Request, res: Response) => {
        const businessId = req.user.businessId;

        if (!businessId) {
            return res.status(400).json({
                message: 'El ID del negocio es obligatorio',
                data: null
            });
        }

        const { id } = req.params;
        
        const { status, message, data } = await this.service.remove(businessId, +id);
        
        return res.status(status).json({
            data,
            message
        });
    };
}