import { Request, Response } from 'express';
import { CashRegisterReportService } from './cash-register-report.service';

const reportService = new CashRegisterReportService();

export class CashRegisterReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const sellerId = req.query.sellerId as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await reportService.getOverview(businessId, {
                fromDate,
                toDate,
                sellerId,
                tzOffset
            });

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Error in controller getOverview:', error);
            return res.status(500).json({ error: 'Error interno al obtener métricas de caja' });
        }
    };

    getSellersReport = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const sellerId = req.query.sellerId as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await reportService.getSellersReport(businessId, {
                fromDate,
                toDate,
                sellerId,
                tzOffset
            });

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            return res.status(200).json({
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Error in controller getSellersReport:', error);
            return res.status(500).json({ error: 'Error interno al obtener reporte de vendedores' });
        }
    };
}
