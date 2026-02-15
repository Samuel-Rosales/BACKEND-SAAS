import { PurchaseStatsService } from '../services/purchase-stats.service';
import { Request, Response } from 'express';

const purchaseStats = new PurchaseStatsService();

export class PurchaseReportController {
     PurchaseMetrics = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }
        try {
            const purchaseMetrics = await purchaseStats.getDetailedPurchaseReport(businessId);
            if (purchaseMetrics.status !== 200) {
                return res.status(purchaseMetrics.status).json({ error: purchaseMetrics.message });
            }
            res.status(200).json({
                message: 'Métricas de compras calculadas exitosamente',
                data: purchaseMetrics.data
            });

        } catch (error) {
            console.error('Error obteniendo métricas de compras:', error);
            res.status(500).json({ error: 'Error interno al calcular métricas de compras' });
        }
    }
}