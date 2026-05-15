import { Request, Response } from 'express';
import { ProductService } from './product.service';
import { v2 as cloudinary } from 'cloudinary';

const service = new ProductService();

export class ProductController {

    // Cloudinary: firma para subida directa desde el cliente (sin exponer api_secret)
    async getCloudinarySignature(req: Request, res: Response) {
        try {
            const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
            const apiKey = process.env.CLOUDINARY_API_KEY;
            const apiSecret = process.env.CLOUDINARY_API_SECRET;

            if (!cloudName || !apiKey || !apiSecret) {
                return res.status(500).json({
                    status: 500,
                    message: 'Cloudinary no está configurado. Define CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY y CLOUDINARY_API_SECRET',
                    data: null
                });
            }

            const folder = (typeof req.query.folder === 'string' && req.query.folder.trim().length)
                ? req.query.folder.trim()
                : 'guardian/products';

            const timestamp = Math.round(Date.now() / 1000);

            const signature = cloudinary.utils.api_sign_request(
                { timestamp, folder },
                apiSecret
            );

            return res.status(200).json({
                status: 200,
                message: 'OK',
                data: {
                    cloudName,
                    apiKey,
                    timestamp,
                    folder,
                    signature,
                }
            });
        } catch (error) {
            console.error('Error en ProductController.getCloudinarySignature:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    // Cloudinary: borrar imagen por public_id (cleanup si falla create/update)
    async deleteCloudinaryImage(req: Request, res: Response) {
        try {
            const { businessId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID del negocio es obligatorio',
                    data: null
                });
            }

            const publicId = req.body?.publicId;
            if (!publicId || typeof publicId !== 'string') {
                return res.status(400).json({
                    status: 400,
                    message: 'publicId es obligatorio',
                    data: null
                });
            }

            const allowedPrefix = `guardian/products/${businessId}`;
            if (!publicId.startsWith(allowedPrefix)) {
                return res.status(403).json({
                    status: 403,
                    message: 'No autorizado para borrar esta imagen',
                    data: null
                });
            }

            const result = await service.deleteCloudinaryImage(publicId);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error en ProductController.deleteCloudinaryImage:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    // 1. CREAR
    async create(req: Request, res: Response) {
        try {
            
            const { businessId, id: userId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    message: 'El ID del negocio es obligatorio',
                    status: 400,
                    data: null
                });
            }

            if (!userId) {
                return res.status(400).json({
                    status: 400,
                    message: 'El ID del usuario es obligatorio',
                    data: null
                });
            }

            const result = await service.create(businessId, userId, req.body);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en ProductController.create:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    // 2. LISTAR (Con Paginación)
    async findAll(req: Request, res: Response) {
        try {
            const { businessId } = req.user;

            // Extraer query params
            const query = {
                page: req.query.page ? Number(req.query.page) : undefined,
                limit: req.query.limit ? Number(req.query.limit) : undefined,
                search: req.query.search ? String(req.query.search) : undefined,
                categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined,
                type: req.query.type as string,
                withPresentations: req.query.withPresentations ? Number(req.query.withPresentations) : undefined
                };

            const result = await service.findAll(businessId, query);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en ProductController.findAll:', error);
            return res.status(500).json({
                message: 'Error interno al obtener productos',
                status: 500,
                data: null
            });
        }
    }

    // 3. OBTENER UNO
    async findOne(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const id = Number(req.params.id);

            if (!businessId) {
                return res.status(400).json({
                    message: 'El ID del negocio es obligatorio',
                    status: 400,
                    data: null
                });
            }

            const result = await service.findOne(businessId, id);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en ProductController.findOne:', error);
            return res.status(500).json({
                message: 'Error interno al buscar producto',
                status: 500,
                data: null
            });
        }
    }

    // 4. ACTUALIZAR
    async update(req: Request, res: Response) {
        try {
            const { businessId, id: userId } = req.user;
            const id = Number(req.params.id);

            if (!businessId) {
                return res.status(400).json({
                    message: 'El ID del negocio es obligatorio',
                    status: 400,
                    data: null
                });
            }

            const result = await service.update(businessId, userId, id, req.body);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en ProductController.update:', error);
            return res.status(500).json({
                message: 'Error interno al actualizar',
                status: 500,
                data: null
            });
        }
    }

    // 5. ELIMINAR
    async remove(req: Request, res: Response) {
        try {
            const { businessId } = (req as any).user;
            const id = Number(req.params.id);

            if (!businessId) {
                return res.status(400).json({
                    message: 'El ID del negocio es obligatorio',
                    status: 400,
                    data: null
                });
            }

            const result = await service.remove(businessId, id);

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('Error en ProductController.remove:', error);
            return res.status(500).json({
                message: 'Error interno al eliminar',
                status: 500,
                data: null
            });
        }
    }
}