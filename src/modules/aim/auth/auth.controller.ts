import { Request, Response } from 'express';
import { AuthService } from './auth.service';

export class AuthController {
    private service = new AuthService();

    login = async (req: Request, res: Response) => {

        const { status, message, data } = await this.service.login(req.body);

        return res.status(status).json({
            data,
            message
        });
    };
}