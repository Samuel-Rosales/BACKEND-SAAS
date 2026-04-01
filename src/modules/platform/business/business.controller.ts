import { Request, Response } from 'express';
import { BusinessService } from './business.service';

export class BusinessController {
    private service = new BusinessService();

    // 1. CREAR NEGOCIO
    create = async (req: Request, res: Response) => {
        const { id } = req.user;

        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.create(id, req.body);

        res.status(status).json({ message, data });
    };

    // 2. LISTAR MIS NEGOCIOS
    findAllByUser = async (req: Request, res: Response) => {
        const { id } = req.user;

        if (!id) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.findAllByUser(id);
        res.status(status).json({ message, data });
    };

    // 3. OBTENER UN NEGOCIO (General / Header)
    findOne = async (req: Request, res: Response) => {
        const { id } = req.params;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.findOne(Number(id), userId);

        res.status(status).json({ message, data });
    };

    // 4. OBTENER CONFIGURACIÓN COMPLETA (Para el formulario React)
    // Este endpoint devuelve el DTO estructurado (general, rates, policies)
    getSettings = async (req: Request, res: Response) => {
        const { id } = req.params;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        console.log('BusinessController getSettings - userId:', userId, 'businessId:', id);
        
        const { status, data, message } = await this.service.findOneForSettings(+id, userId);
        
        res.status(status).json({ message, data });
    };

    // 5. ACTUALIZAR INFORMACIÓN GENERAL (Nombre, Logo, Dirección)
    updateGeneral = async (req: Request, res: Response) => {
        const { id } = req.params;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.updateGeneralInfo(+id, userId, req.body);
        
        res.status(status).json({ message, data });
    };

    // 6. ACTUALIZAR POLÍTICAS (Créditos, Switches Globales)
    updatePolicies = async (req: Request, res: Response) => {
        const { id } = req.params;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.updatePolicies(+id, userId, req.body);
        
        res.status(status).json({ message, data });
    };

    // 7. ACTUALIZAR TASAS (Moneda y Estrategias)
    updateExchangeRateConfig = async (req: Request, res: Response) => {
        const { id } = req.params;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.updateExchangeRateConfig(+id, userId, req.body);

        res.status(status).json({ message, data });
    };
}