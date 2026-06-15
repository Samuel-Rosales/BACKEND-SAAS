import { Request, Response } from 'express';
import { ArticlesReportService } from './articles-report.service';
import { renderToStream } from '@react-pdf/renderer';
import ArticlesReportPDF from '@/templates/ArticlesReport';
import { Readable } from 'stream';

const articlesService = new ArticlesReportService();

export class ArticlesReportController {

    getOverview = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const fromDate = req.query.fromDate as string | undefined;
        const toDate = req.query.toDate as string | undefined;
        const tzOffset = req.query.tzOffset === undefined ? undefined : Number(req.query.tzOffset);

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await articlesService.getOverview(businessId, { fromDate, toDate, tzOffset });

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            res.status(200).json({
                message: result.message,
                data: result.data
            });
        } catch (error) {
            console.error('Error obteniendo overview de artículos:', error);
            res.status(500).json({ error: 'Error interno al calcular overview de artículos' });
        }
    };

    getRanking = async (req: Request, res: Response) => {
        const { businessId } = req.user;
        const { page, limit, fromDate, toDate, tzOffset, categoryId, sortBy, search } = req.query;

        if (!businessId) {
            return res.status(400).json({ message: 'Falta el header x-business-id' });
        }

        try {
            const result = await articlesService.getRanking(businessId, {
                page: page as string | undefined,
                limit: limit as string | undefined,
                fromDate: fromDate as string | undefined,
                toDate: toDate as string | undefined,
                tzOffset: tzOffset === undefined ? undefined : Number(tzOffset),
                categoryId: categoryId as string | undefined,
                sortBy: sortBy as any,
                search: search as string | undefined
            });

            if (result.status !== 200) {
                return res.status(result.status).json({ error: result.message });
            }

            res.status(200).json({
                message: result.message,
                data: result.data,
                pagination: result.pagination,
                summary: result.summary
            });
        } catch (error) {
            console.error('Error obteniendo ranking de artículos:', error);
            res.status(500).json({ error: 'Error interno al calcular ranking de artículos' });
        }
    };

    generatePDF = async (req: Request, res: Response) => {
        try {
            const { businessId } = req.user;
            const { fromDate, toDate, tzOffset, sortBy, categoryId } = req.query;

            if (!businessId) {
                return res.status(400).json({ message: 'Falta el header x-business-id' });
            }

            const result = await articlesService.getPDFData(businessId, {
                fromDate: fromDate as string | undefined,
                toDate: toDate as string | undefined,
                tzOffset: tzOffset === undefined ? undefined : Number(tzOffset),
                sortBy: sortBy as string | undefined,
                categoryId: categoryId as string | undefined
            });

            if (!result.data) {
                return res.status(result.status).json({ error: result.message });
            }

            const pdfStream = await renderToStream(
                <ArticlesReportPDF
                    businessName={result.data.businessName}
                    logoUrl={result.data.logoUrl}
                    fromDate={result.data.fromDate}
                    toDate={result.data.toDate}
                    products={result.data.products}
                    totals={result.data.totals}
                    sortBy={result.data.sortBy}
                />
            );

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline; filename="reporte-articulos.pdf"');

            req.on('close', () => {
                if (!res.writableFinished) {
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

            pdfStream.pipe(res);
        } catch (error) {
            console.error('Error generando PDF de artículos:', error);
            return res.status(500).json({ error: 'Error interno al generar PDF de artículos' });
        }
    };
}
