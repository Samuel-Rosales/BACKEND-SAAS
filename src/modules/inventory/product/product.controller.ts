import { Request, Response } from 'express';
import { ProductService } from './product.service';

const service = new ProductService();

export class ProductController {

    // 1. CREAR
    async create(req: Request, res: Response) {
        try {
            
            const { businessId, membershipId } = req.user;

            if (!businessId) {
                return res.status(400).json({
                    message: 'El ID del negocio es obligatorio',
                    status: 400,
                    data: null
                });
            }

            if (!membershipId) {
                return res.status(400).json({
                    status: 400,
                    message: 'Falta el ID de la membresía en el header.',
                    data: null
                });
            }

            const result = await service.create(businessId, membershipId, req.body);

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
                categoryId: req.query.categoryId ? Number(req.query.categoryId) : undefined
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
            const { businessId, id: userId } = (req as any).user;
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