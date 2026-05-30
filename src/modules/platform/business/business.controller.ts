import { Request, Response } from 'express';
import { BusinessService } from './business.service';
import { v2 as cloudinary } from 'cloudinary';

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

    // 8. OBTENER FIRMA CLOUDINARY PARA SUBIDA DE LOGO
    getCloudinarySignature = async (req: Request, res: Response) => {
        try {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (!cloudName || !apiKey || !apiSecret) {
                return res.status(500).json({
                    status: 500,
                    message: 'Cloudinary no está configurado...',
                    data: null
                });
            }

            const folder = (typeof req.query.folder === 'string' && req.query.folder.trim().length)
                ? req.query.folder.trim()
                : 'guardian/business/logos';

            const timestamp = Math.round(Date.now() / 1000);
            const signature = cloudinary.utils.api_sign_request(
                { timestamp, folder },
                apiSecret
            );

            return res.status(200).json({
                status: 200,
                message: 'OK',
                data: { cloudName, apiKey, timestamp, folder, signature },
            });
        } catch (error) {
            return res.status(500).json({ message: 'Error interno del servidor', status: 500, data: null });
        }
    };
}
