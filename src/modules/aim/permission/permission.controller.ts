import { Request, Response } from 'express';
import { PermissionService } from './permission.service';
import type { PermissionModule } from '@prisma/client';

export class PermissionController {
    private service = new PermissionService();

    findAll = async (req: Request, res: Response) => {
        const { status, data, message } = await this.service.findAll();

        res.status(status).json({
            message,
            data
        });
    };
}