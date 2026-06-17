import { Request, Response } from 'express';
import { DepositsReportService } from './deposits-report.service';

const depositsService = new DepositsReportService();

export class DepositsReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await depositsService.getOverview(businessId);

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            res.status(200).json({
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Error obteniendo overview de depósitos:', error);
            res.status(500).json({ error: 'Error interno al calcular overview de depósitos' });
        }
    };

    getAll = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { page, limit, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await depositsService.getAll(businessId, {
                page: page as string | undefined,
                limit: limit as string | undefined,
                search: search as string | undefined
            });

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            res.status(200).json({
                message: result.message,
                data: result.data,
                pagination: result.pagination,
                globalTotals: result.globalTotals
            });

        } catch (error) {
            console.error('Error obteniendo lista de depósitos:', error);
            res.status(500).json({ error: 'Error interno al obtener depósitos' });
        }
    };

    getById = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { id } = req.params;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await depositsService.getById(businessId, Number(id));

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            res.status(200).json({
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Error obteniendo detalle del depósito:', error);
            res.status(500).json({ error: 'Error interno al obtener detalle del depósito' });
        }
    };
}
