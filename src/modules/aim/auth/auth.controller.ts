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
        // El userId viene del token decodificado por el middleware
        // Asegúrate de que tu Request tenga tipado el usuario (ej. req.user?.id)
        const userId = req.user!.id; 

        const { status, message, data } = await this.service.getMe(userId);

        res.status(status).json({
            message,
            data
        });
    };
}