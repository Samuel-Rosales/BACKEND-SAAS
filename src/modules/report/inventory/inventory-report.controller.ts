import { Request, Response } from 'express';
import { InventoryReportService } from './inventory-report.service';

const inventoryService = new InventoryReportService();

export class InventoryReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { search } = req.query;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await inventoryService.getOverview(businessId, {
                search: search as string | undefined
            });

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            res.status(200).json({
                message: result.message,
                data: result.data
            });

        } catch (error) {
            console.error('Error obteniendo overview de inventario:', error);
            res.status(500).json({ error: 'Error interno al calcular overview de inventario' });
        }
    };

    getByCost = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { page, limit, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await inventoryService.getByCost(businessId, {
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
                pagination: result.pagination
            });

        } catch (error) {
            console.error('Error obteniendo reporte de inventario por costo:', error);
            res.status(500).json({ error: 'Error interno al calcular reporte por costo' });
        }
    };

    getBySale = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { page, limit, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await inventoryService.getBySale(businessId, {
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
                pagination: result.pagination
            });

        } catch (error) {
            console.error('Error obteniendo reporte de inventario por venta:', error);
            res.status(500).json({ error: 'Error interno al calcular reporte por venta' });
        }
    };

    getByCategory = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { page, limit, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await inventoryService.getByCategory(businessId, {
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
                pagination: result.pagination
            });

        } catch (error) {
            console.error('Error obteniendo reporte de inventario por categoría:', error);
            res.status(500).json({ error: 'Error interno al calcular reporte por categoría' });
        }
    };
}