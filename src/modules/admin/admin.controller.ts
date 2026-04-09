import { Request, Response } from 'express';
import { AdminService } from './admin.service';

const adminService = new AdminService();

export class AdminController {

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
}
