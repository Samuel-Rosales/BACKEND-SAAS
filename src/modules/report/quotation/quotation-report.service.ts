import { prisma } from '@/configs';
import { QuotationStatus, Prisma } from '@prisma/client';
import { resolveBusinessExchangeRate } from '@/utils';

export interface QuotationReportQuery {
    fromDate?: string;
    toDate?: string;
    clientId?: number;
}

export class QuotationReportService {
    async getOverview(businessId: number, query: QuotationReportQuery = {}) {
        try {
            const where: Prisma.QuotationWhereInput = {
                businessId,
                deletedAt: null
            };

            if (query.clientId) {
                where.clientId = Number(query.clientId);
            }

            if (query.fromDate || query.toDate) {
                where.createdAt = {};
                if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
                if (query.toDate) {
                    const to = new Date(query.toDate);
                    to.setHours(23, 59, 59, 999);
                    where.createdAt.lte = to;
                }
            }

            // Resolver tasa de cambio para cálculos bimonetarios
            const exchangeRateRecord = await resolveBusinessExchangeRate(businessId, prisma);
            const rate = Number(exchangeRateRecord?.rate || 1);

            // Obtener todas las cotizaciones del periodo
            const quotations = await prisma.quotation.findMany({
                where,
                include: {
                    client: { select: { id: true, name: true, ci: true, phone: true } },
                    member: { select: { user: { select: { name: true } } } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true } }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            const totalCount = quotations.length;
            let totalQuotedUsd = 0;
            let approvedCount = 0;
            let approvedAmountUsd = 0;
            let rejectedCount = 0;
            let rejectedAmountUsd = 0;
            let pendingCount = 0;
            let pendingAmountUsd = 0;
            let convertedCount = 0;

            const clientMap: Record<number, { clientId: number; clientName: string; count: number; totalUsd: number }> = {};

            for (const q of quotations) {
                const amount = Number(q.totalAmount);
                totalQuotedUsd += amount;

                if (q.status === QuotationStatus.APPROVED) {
                    approvedCount++;
                    approvedAmountUsd += amount;
                } else if (q.status === QuotationStatus.CONVERTED) {
                    convertedCount++;
                    approvedCount++;
                    approvedAmountUsd += amount;
                } else if (q.status === QuotationStatus.REJECTED) {
                    rejectedCount++;
                    rejectedAmountUsd += amount;
                } else if (q.status === QuotationStatus.PENDING) {
                    pendingCount++;
                    pendingAmountUsd += amount;
                }

                if (q.client) {
                    if (!clientMap[q.client.id]) {
                        clientMap[q.client.id] = {
                            clientId: q.client.id,
                            clientName: q.client.name,
                            count: 0,
                            totalUsd: 0
                        };
                    }
                    clientMap[q.client.id].count++;
                    clientMap[q.client.id].totalUsd += amount;
                }
            }

            const conversionRate = totalCount > 0 ? Number(((approvedCount / totalCount) * 100).toFixed(1)) : 0;
            const topClients = Object.values(clientMap)
                .sort((a, b) => b.totalUsd - a.totalUsd)
                .slice(0, 5)
                .map((c) => ({
                    ...c,
                    totalUsd: Number(c.totalUsd.toFixed(2)),
                    totalVes: Number((c.totalUsd * rate).toFixed(2))
                }));

            return {
                status: 200,
                message: 'Reporte de cotizaciones generado exitosamente.',
                data: {
                    rate,
                    metrics: {
                        totalCount,
                        totalQuotedUsd: Number(totalQuotedUsd.toFixed(2)),
                        totalQuotedVes: Number((totalQuotedUsd * rate).toFixed(2)),
                        approvedCount,
                        approvedAmountUsd: Number(approvedAmountUsd.toFixed(2)),
                        approvedAmountVes: Number((approvedAmountUsd * rate).toFixed(2)),
                        convertedCount,
                        rejectedCount,
                        rejectedAmountUsd: Number(rejectedAmountUsd.toFixed(2)),
                        rejectedAmountVes: Number((rejectedAmountUsd * rate).toFixed(2)),
                        pendingCount,
                        pendingAmountUsd: Number(pendingAmountUsd.toFixed(2)),
                        pendingAmountVes: Number((pendingAmountUsd * rate).toFixed(2)),
                        conversionRate
                    },
                    topClients,
                    recentQuotations: quotations.slice(0, 15).map((q) => {
                        const totalUsd = Number(q.totalAmount);
                        return {
                            id: q.id,
                            receiptNumber: q.receiptNumber,
                            clientName: q.client.name,
                            clientCi: q.client.ci,
                            itemsCount: q.items.length,
                            totalUsd,
                            totalVes: Number((totalUsd * rate).toFixed(2)),
                            status: q.status,
                            createdAt: q.createdAt
                        };
                    })
                }
            };
        } catch (error) {
            console.error('Error generando reporte de cotizaciones:', error);
            return {
                status: 500,
                message: 'Error al generar el reporte de cotizaciones.',
                data: null
            };
        }
    }
}
