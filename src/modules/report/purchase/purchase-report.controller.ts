import React from 'react';
import { PurchaseStatsService } from './purchase-stats.service';
import { Request, Response } from 'express';
import { renderToStream } from '@react-pdf/renderer';
import { Readable } from 'stream';
import PurchaseGroupedReport from '@/templates/PurchaseGroupedReport';

const purchaseStats = new PurchaseStatsService();

export class PurchaseReportController {
    PurchaseMetrics = async (req: Request, res: Response) => {
        const { businessId } = req.user;
    const fromDate = req.query.fromDate as string | undefined;
    const toDate = req.query.toDate as string | undefined;
    const tzOffset = req.query.tzOffset as string | undefined;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }
        try {
            const purchaseMetrics = await purchaseStats.getDetailedPurchaseReport(businessId, { fromDate, toDate, tzOffset });
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

    generateGroupedReportPDF = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset as string | undefined;
        const groupBy = req.query.groupBy as 'category' | 'supplier' | undefined;
        const groupId = req.query.groupId as string | undefined;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const report = await purchaseStats.generateGroupedPurchaseReportPDF(businessId, {
                fromDate,
                toDate,
                tzOffset,
                groupBy,
                groupId
            });

            if (report.status !== 200 || !report.data) {
                return res.status(report.status).json({ error: report.message });
            }

            const pdfStream = await renderToStream(
                React.createElement(PurchaseGroupedReport, {
                    businessName: report.data.businessName,
                    logoUrl: report.data.logoUrl,
                    dateRange: report.data.dateRange,
                    groupByLabel: report.data.groupByLabel,
                    groups: report.data.groups,
                    grandTotals: report.data.grandTotals
                }) as any
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="reporte-compras.pdf"');

            req.on('close', () => {
                if (!res.writableFinished) {
                    (pdfStream as Readable).destroy();
                }
            });

            pdfStream.on('error', (err) => {
                console.error('Error interno en el stream del PDF:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al compilar el documento PDF' });
                }
            });

            pdfStream.pipe(res);
        } catch (error) {
            console.error('Error generando PDF de compras agrupado:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF de compras agrupado' });
        }
    }
}
