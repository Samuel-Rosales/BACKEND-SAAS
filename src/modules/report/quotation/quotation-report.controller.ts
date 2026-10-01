import { Request, Response } from 'express';
import { QuotationReportService } from './quotation-report.service';

const service = new QuotationReportService();

export class QuotationReportController {
    async getOverview(req: Request, res: Response) {
        try {
            const { businessId } = req.user;
            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id.' });
            }

            const result = await service.getOverview(Number(businessId), req.query);
            return res.status(result.status).json(result);
        } catch (error) {
            console.error('Error in QuotationReportController.getOverview:', error);
            return res.status(500).json({ message: 'Error interno al generar el reporte.' });
        }
    }
}
