import { Request, Response } from 'express';
import { CollectionsReportService } from './collections-report.service';

const service = new CollectionsReportService();

export class CollectionsReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await service.getOverview(Number(businessId), {
                fromDate,
                toDate,
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
            console.error('Error in CollectionsReportController.getOverview:', error);
            return res.status(500).json({ error: 'Error interno al obtener métricas de cobranza' });
        }
    };

    getDebtors = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const search = req.query.search as string | undefined;
        const page = req.query.page === undefined ? undefined : Number(req.query.page);
        const limit = req.query.limit === undefined ? undefined : Number(req.query.limit);
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await service.getDebtors(Number(businessId), {
                fromDate,
                toDate,
                search,
                page,
                limit,
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
            console.error('Error in CollectionsReportController.getDebtors:', error);
            return res.status(500).json({ error: 'Error interno al obtener listado de deudores' });
        }
    };
}
