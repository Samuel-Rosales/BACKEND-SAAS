import { Request, Response } from 'express';
import { InventoryReportService } from './inventory-report.service';
import { renderToStream } from '@react-pdf/renderer';
import  InventoryReport  from '@/templates/InventoryReport';
import InventoryValuedReport from '@/templates/InventoryValuedReport';
import { Readable } from 'stream';  

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

    generateControlStockPDF = async (req: Request, res: Response) => {
        try {
            const { businessId } = req.user;

            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id' });
            }

            const result = await inventoryService.generateControlStockPDF(businessId);

            if(!result.data) {
                return res.status(result.status).json({ error: result.message });
            }

            const pdfStream = await renderToStream(
                <InventoryReport businessName={result.data.businessName} logoUrl={result.data.logoUrl} date={result.data.date} productsWithStock={result.data.productsWithStock} />
            );

            // 3. Configuramos los Headers HTTP obligatorios
            // application/pdf le dice al navegador exactamente qué tipo de archivo está recibiendo
            res.setHeader('Content-Type', 'application/pdf');
            
            // inline: lo abre en una pestaña del navegador
            // attachment; filename=...: fuerza la descarga directa del archivo
            res.setHeader('Content-Disposition', 'inline; filename="inventario.pdf"');

            // 5. PROGRAMACIÓN DEFENSIVA (No omitas esto)
            //Evita que el servidor colapse si el usuario cierra la pestaña
            req.on('close', () => {
                if (!res.writableFinished) {
                    // Hacemos el Type Casting estricto a Readable
                    (pdfStream as Readable).destroy();
                    console.warn(`Descarga abortada por el cliente para businessId: ${businessId}`);
                }
            });

            pdfStream.on('error', (err) => {
                console.error('Error interno en el stream del PDF:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al compilar el documento PDF' });
                }
            });

            // 6. Ejecución del Stream. 
            // IMPORTANTE: Aquí muere la función. NO pongas ningún res.json() después de esto.
            pdfStream.pipe(res);

        } catch (error) {
            console.error('Error generando PDF de control de stock:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF de control de stock' });
        }
        
    }

    generateValuedStockPDF = async (req: Request, res: Response) => {
        try {
            const { businessId } = req.user;
            const { search } = req.query;

            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id' });
            }

            const result = await inventoryService.generateValuedStockPDF(businessId, {
                search: search as string | undefined
            });

            if (!result.data) {
                return res.status(result.status).json({ error: result.message });
            }

            const pdfStream = await renderToStream(
                <InventoryValuedReport
                    businessName={result.data.businessName}
                    logoUrl={result.data.logoUrl}
                    date={result.data.date}
                    search={result.data.search}
                    categories={result.data.categories}
                    grandTotals={result.data.grandTotals}
                />
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="stock-valorizado.pdf"');

            req.on('close', () => {
                if (!res.writableFinished) {
                    (pdfStream as Readable).destroy();
                    console.warn(`Descarga abortada por el cliente para businessId: ${businessId}`);
                }
            });

            pdfStream.on('error', (err) => {
                console.error('Error interno en el stream del PDF de stock valorizado:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al compilar el documento PDF' });
                }
            });

            pdfStream.pipe(res);
        } catch (error) {
            console.error('Error generando PDF de stock valorizado:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF de stock valorizado' });
        }
    }
}
