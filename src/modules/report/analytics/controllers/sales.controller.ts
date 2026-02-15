import { SalesStatsService } from '../services/sales-stats.service';
import { Request, Response } from 'express';

const salesStats = new SalesStatsService();

export class SalesReportController {
     SalesMetrics = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }
        try {
            const salesMetrics = await salesStats.getDetailedReport(businessId);
            if (salesMetrics.status !== 200) {
                return res.status(salesMetrics.status).json({ error: salesMetrics.message });
            }
            res.status(200).json({
                message: 'Métricas de ventas calculadas exitosamente',
                data: salesMetrics.data
            });

        } catch (error) {
            console.error('Error obteniendo métricas de ventas:', error);
            res.status(500).json({ error: 'Error interno al calcular métricas de ventas' });
        }
    }
}