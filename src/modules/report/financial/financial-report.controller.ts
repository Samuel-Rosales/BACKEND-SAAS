import React from 'react';
import { FinancialReportService } from './financial-report.service';
import { Request, Response } from 'express';
import { renderToStream } from '@react-pdf/renderer';
import { Readable } from 'stream';
import FinancialReport from '@/templates/FinancialReport';

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

    generateReportPDF = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const report = await financialService.generateFinancialPDF(businessId, {
                fromDate,
                toDate,
                tzOffset
            });

            if (report.status !== 200 || !report.data) {
                return res.status(report.status).json({ error: report.message });
            }

            const pdfStream = await renderToStream(
                React.createElement(FinancialReport, {
                    businessName: report.data.businessName,
                    logoUrl: report.data.logoUrl,
                    dateRange: report.data.dateRange,
                    overview: report.data.overview,
                    products: report.data.products,
                }) as any
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="reporte-financiero.pdf"');

            req.on('close', () => {
                if (!res.writableFinished) {
                    (pdfStream as Readable).destroy();
                }
            });

            pdfStream.on('error', (err) => {
                console.error('Error en stream del PDF financiero:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al compilar el documento PDF' });
                }
            });

            pdfStream.pipe(res);

        } catch (error) {
            console.error('Error generando PDF financiero:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF financiero' });
        }
    };
}

