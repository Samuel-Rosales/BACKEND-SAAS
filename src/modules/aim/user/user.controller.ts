import { Request, Response } from 'express';
import { UserService } from './user.service';
import { start } from 'node:repl';
import { remove } from 'winston';

export class UserController {
    private service = new UserService();

    create = async (req: Request, res: Response) => {
        const { message, status, data } = await this.service.create(req.body);

        return res.status(status).json({
            message,
            data
        });
    };

    findAll = async (req: Request, res: Response) => {

        const { message, status, data } = await this.service.findAll();

        return res.status(status).json({
            data,
            message
        });
    };

    findOne = async (req: Request, res: Response) => {

        const { id } = req.params;

        const { message, status, data } = await this.service.findOne(+id);
        
        return res.status(status).json({
            message,
            data
        });
    };

    update = async (req: Request, res: Response) => {

        const { id } = req.params;

        const { message, status, data } = await this.service.update(+id, req.body);
        
        return res.status(status).json({
            message,
            data
        });
    };

    remove = async (req: Request, res: Response) => {

        const { id } = req.params;

        const { status, message, data } = await this.service.remove(+id);
        
        return res.status(status).json({
            message,
            data
        });
    };
}