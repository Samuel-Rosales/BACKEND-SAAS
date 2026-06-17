import { FinancialReportService } from './financial-report.service';
import { Request, Response } from 'express';

const financialService = new FinancialReportService();

export class FinancialReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const overview = await financialService.getFinancialOverview(businessId, { fromDate, toDate, tzOffset });
            
            if (overview.status !== 200) {
                return res.status(overview.status).json({ error: overview.message });
            }

            return res.status(200).json({
                message: 'Overview financiero calculado exitosamente',
                data: overview.data
            });

        } catch (error) {
            console.error('Error en FinancialReportController.getOverview:', error);
            return res.status(500).json({ error: 'Error interno al calcular overview financiero' });
        }
    };

    getProductMargins = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);
        const page = req.query.page as string | undefined;
        const limit = req.query.limit as string | undefined;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const marginReport = await financialService.getProductMarginReport(
                businessId,
                { fromDate, toDate, tzOffset },
                { page, limit }
            );

            if (marginReport.status !== 200) {
                return res.status(marginReport.status).json({ error: marginReport.message });
            }

            return res.status(200).json({
                message: 'Reporte de margen por producto calculado exitosamente',
                data: marginReport.data
            });

        } catch (error) {
            console.error('Error en FinancialReportController.getProductMargins:', error);
            return res.status(500).json({ error: 'Error interno al calcular reporte de margen por producto' });
        }
    };
}
