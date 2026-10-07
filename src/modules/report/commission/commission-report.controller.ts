import { Request, Response } from 'express';
import { CommissionReportService } from './commission-report.service';

const commissionService = new CommissionReportService();

export class CommissionReportController {

    getCommissions = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        const memberId = req.query.memberId ? Number(req.query.memberId) : undefined;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const page = req.query.page ? Number(req.query.page) : 1;
        const limit = req.query.limit ? Number(req.query.limit) : 20;

        try {
            const result = await commissionService.getCommissionReport(businessId, {
                memberId,
                fromDate,
                toDate,
                page,
                limit
            });

            if (result.status !== 200) {
                return res.status(result.status).json({
                    message: result.message,
                    data: null
                });
            }

            return res.status(200).json({
                message: result.message,
                data: result.data
            });
        } catch (error) {
            console.error('Error en controller de comisiones:', error);
            return res.status(500).json({ message: 'Error interno en reporte de comisiones' });
        }
    };
}
