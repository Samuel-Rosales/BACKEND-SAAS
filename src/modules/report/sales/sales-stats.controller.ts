import { SalesStatsService } from './sales-stats.service';
import { Request, Response } from 'express';
import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import SalesReportPDF from '@/templates/SalesReport';
import { Readable } from 'stream';

const salesStats = new SalesStatsService();

export class SalesReportController {

    SalesMetrics = async (req: Request, res: Response) => {

        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const salesMetrics = await salesStats.getDetailedReport(businessId, { fromDate, toDate, tzOffset });
            
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

    generatePDF = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);
        const search = req.query.search as string | undefined;
        const paymentStatus = req.query.paymentStatus as string | undefined;
        const paymentMethod = req.query.paymentMethod as string | undefined;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await salesStats.getSalesReportPDFData(businessId, {
                fromDate,
                toDate,
                tzOffset,
                search,
                paymentStatus,
                paymentMethod
            });

            if (result.status !== 200 || !result.data) {
                return res.status(result.status).json({ error: result.message });
            }

            const pdfStream = await renderToStream(
                React.createElement(SalesReportPDF, {
                    businessName: result.data.businessName,
                    logoUrl: result.data.logoUrl,
                    fromDate: result.data.fromDate,
                    toDate: result.data.toDate,
                    overview: result.data.overview,
                    sales: result.data.sales,
                    totals: result.data.totals
                }) as any
            );

            const filename = `reporte-ventas-${result.data.fromDate}_${result.data.toDate}.pdf`;

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `inline; filename="${filename}"`);

            req.on('close', () => {
                if (!res.writableFinished) {
                    (pdfStream as Readable).destroy();
                }
            });

            pdfStream.on('error', (err) => {
                console.error('Error en stream del PDF de ventas:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al compilar el documento PDF' });
                }
            });

            pdfStream.pipe(res);

        } catch (error) {
            console.error('Error generando PDF de reporte de ventas:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF de ventas' });
        }
    };
}