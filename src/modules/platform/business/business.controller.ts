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
        const { businessId } = req.user;
        const { id: userId } = req.user;
        if (!businessId) {
            return res.status(400).json({ message: 'Business ID is required' });
        }

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.findOne(businessId, userId);

        res.status(status).json({ message, data });
    };

    // 4. OBTENER CONFIGURACIÓN COMPLETA (Para el formulario React)
    // Este endpoint devuelve el DTO estructurado (general, rates, policies)
    getSettings = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.findOneForSettings(businessId, userId);
        
        res.status(status).json({ message, data });
    };

    // 5. ACTUALIZAR INFORMACIÓN GENERAL (Nombre, Logo, Dirección)
    updateGeneral = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.updateGeneralInfo(businessId, userId, req.body);
        
        res.status(status).json({ message, data });
    };

    // 6. ACTUALIZAR POLÍTICAS (Créditos, Switches Globales)
    updatePolicies = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.updatePolicies(businessId, userId, req.body);
        
        res.status(status).json({ message, data });
    };

    // 7. ACTUALIZAR TASAS (Moneda y Estrategias)
    updateExchangeRateConfig = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        const { id: userId } = req.user;

        if (!userId) {
            return res.status(400).json({ message: 'User ID is required' });
        }

        const { status, data, message } = await this.service.updateExchangeRateConfig(businessId, userId, req.body);

        res.status(status).json({ message, data });
    };
}
