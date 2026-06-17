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

    getMe = async (req: Request, res: Response) => {
        const userId = req.user!.id; 
        const { status, message, data } = await this.service.getMe(userId);
        res.status(status).json({ message, data });
    };

    refresh = async (req: Request, res: Response) => {
        const authHeader = req.headers.authorization;
        const token = authHeader?.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Token faltante', data: null });
        }

        const { status, message, data } = await this.service.refreshToken(token);
        res.status(status).json({ message, data });
    };
}