import { Request, Response } from 'express';
import { AdminService } from './admin.service';

const adminService = new AdminService();

export class AdminController {

    /**
     * GET /api/v1/admin/businesses
     * Listar todos los negocios del sistema
     */
    async findAllBusinesses(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;

            const result = await adminService.findAllBusinesses(page, limit);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('AdminController.findAllBusinesses error:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    /**
     * PATCH /api/v1/admin/businesses/:id/status
     * Activar o desactivar un negocio (cambia estado de suscripción)
     */
    async toggleBusinessStatus(req: Request, res: Response) {
        try {
            const businessId = parseInt(req.params.id);
            const { status } = req.body;

            // Validar que el status sea válido
            const validStatuses = ['ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELLED'];
            if (!validStatuses.includes(status)) {
                return res.status(400).json({
                    message: 'Estado de suscripción inválido',
                    status: 400,
                    data: null
                });
            }

            const result = await adminService.toggleBusinessStatus(businessId, status);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('AdminController.toggleBusinessStatus error:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    /**
     * PATCH /api/v1/admin/businesses/:id/subscription
     * Actualizar suscripción de un negocio
     */
    async updateBusinessSubscription(req: Request, res: Response) {
        try {
            const businessId = parseInt(req.params.id);
            const { planType, status, endDate } = req.body;

            // Validar status si se proporciona
            if (status) {
                const validStatuses = ['ACTIVE', 'INACTIVE', 'PAST_DUE', 'CANCELLED'];
                if (!validStatuses.includes(status)) {
                    return res.status(400).json({
                        message: 'Estado de suscripción inválido',
                        status: 400,
                        data: null
                    });
                }
            }

            const result = await adminService.updateBusinessSubscription(businessId, {
                planType,
                status: status as any,
                endDate: endDate ? new Date(endDate) : undefined
            });

            return res.status(result.status).json(result);

        } catch (error) {
            console.error('AdminController.updateBusinessSubscription error:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    /**
     * GET /api/v1/admin/stats
     * Obtener estadísticas del sistema
     */
    async getStats(req: Request, res: Response) {
        try {
            const result = await adminService.getSystemStats();
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('AdminController.getStats error:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    /**
     * GET /api/v1/admin/subscription-payments
     */
    async listSubscriptionPayments(req: Request, res: Response) {
        try {
            const page = parseInt(req.query.page as string) || 1;
            const limit = parseInt(req.query.limit as string) || 50;
            const status = req.query.status as string | undefined;

            const result = await adminService.listSubscriptionPayments(page, limit, status);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('AdminController.listSubscriptionPayments error:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }

    /**
     * PATCH /api/v1/admin/subscription-payments/:id/review
     * body: { status: 'APPROVED' | 'REJECTED', note?: string }
     */
    async reviewSubscriptionPayment(req: Request, res: Response) {
        try {
            const id = parseInt(req.params.id);
            const { status, note } = req.body;

            const valid = ['APPROVED', 'REJECTED'];
            if (!valid.includes(status)) {
                return res.status(400).json({
                    message: 'Estado inválido. Use APPROVED o REJECTED',
                    status: 400,
                    data: null
                });
            }

            const reviewerUserId = req.user?.id;
            if (!reviewerUserId) {
                return res.status(401).json({
                    message: 'No autorizado',
                    status: 401,
                    data: null
                });
            }

            const result = await adminService.reviewSubscriptionPayment(id, status, reviewerUserId, note);
            return res.status(result.status).json(result);

        } catch (error) {
            console.error('AdminController.reviewSubscriptionPayment error:', error);
            return res.status(500).json({
                message: 'Error interno del servidor',
                status: 500,
                data: null
            });
        }
    }
}
