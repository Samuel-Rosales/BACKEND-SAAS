import React from 'react';
import { Request, Response } from 'express';
import { CashRegisterReportService } from './cash-register-report.service';
import { renderToStream } from '@react-pdf/renderer';
import { Readable } from 'stream';
import CashRegisterReport from '@/templates/CashRegisterReport';

const reportService = new CashRegisterReportService();

export class CashRegisterReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const sellerId = req.query.sellerId as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await reportService.getOverview(businessId, {
                fromDate,
                toDate,
                sellerId,
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
            console.error('Error in controller getOverview:', error);
            return res.status(500).json({ error: 'Error interno al obtener métricas de caja' });
        }
    };

    getSellersReport = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const sellerId = req.query.sellerId as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await reportService.getSellersReport(businessId, {
                fromDate,
                toDate,
                sellerId,
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
            console.error('Error in controller getSellersReport:', error);
            return res.status(500).json({ error: 'Error interno al obtener reporte de vendedores' });
        }
    };

    generateReportPDF = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const sellerId = req.query.sellerId as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const report = await reportService.generateCashRegisterPDF(businessId, {
                fromDate,
                toDate,
                sellerId,
                tzOffset
            });

            if (report.status !== 200 || !report.data) {
                return res.status(report.status).json({ error: report.message });
            }

            const pdfStream = await renderToStream(
                React.createElement(CashRegisterReport, {
                    businessName: report.data.businessName,
                    logoUrl: report.data.logoUrl,
                    dateRange: report.data.dateRange,
                    sellerFilter: report.data.sellerFilter,
                    overview: report.data.overview,
                    sellers: report.data.sellers,
                }) as any
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="reporte-caja.pdf"');

            req.on('close', () => {
                if (!res.writableFinished) {
                    (pdfStream as Readable).destroy();
                }
            });

            pdfStream.on('error', (err) => {
                console.error('Error en stream del PDF de caja:', err);
                if (!res.headersSent) {
                    res.status(500).json({ error: 'Error al compilar el documento PDF' });
                }
            });

            pdfStream.pipe(res);

        } catch (error) {
            console.error('Error generando PDF de caja:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF de caja' });
        }
    };
}
