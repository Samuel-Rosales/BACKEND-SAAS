import { prisma } from '@/configs';
import { Prisma } from '@prisma/client';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
    tzOffset?: number | string;
};

const parseDateOnlyStart = (value: string, tzOffsetMinutes: number) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000);
    return new Date(utcMs);
};

const parseDateOnlyEnd = (value: string, tzOffsetMinutes: number) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    const utcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000) - 1;
    return new Date(utcMs);
};

const getLocalMonthRangeUtc = (baseDateUtc: Date, tzOffsetMinutes: number, monthDelta = 0) => {
    const local = new Date(baseDateUtc.getTime() - (tzOffsetMinutes * 60_000));
    const year = local.getUTCFullYear();
    const monthIndex = local.getUTCMonth() + monthDelta;
    const startUtcMs = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000);
    const endUtcMs = Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000) - 1;
    return { start: new Date(startUtcMs), end: new Date(endUtcMs) };
};

const resolveDateRange = (range?: DateRangeQuery) => {
    const now = new Date();
    const tzOffsetMinutes = (() => {
        if (!range || range.tzOffset === null || range.tzOffset === undefined) {
            return new Date().getTimezoneOffset();
        }
        const parsed = Number(range.tzOffset);
        return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
    })();

    const defaultRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
    let start = defaultRange.start;
    let end = defaultRange.end;

    if (range?.fromDate && range?.toDate) {
        start = parseDateOnlyStart(range.fromDate, tzOffsetMinutes);
        end = parseDateOnlyEnd(range.toDate, tzOffsetMinutes);
    } else if (range?.fromDate && !range?.toDate) {
        start = parseDateOnlyStart(range.fromDate, tzOffsetMinutes);
        end = now;
    } else if (!range?.fromDate && range?.toDate) {
        const base = parseDateOnlyStart(range.toDate, tzOffsetMinutes);
        const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
        start = monthRange.start;
        end = parseDateOnlyEnd(range.toDate, tzOffsetMinutes);
    }

    return { start, end };
};

const calcPctChange = (current: number, previous: number) => {
    if (previous === 0) {
        return current > 0 ? 100 : current < 0 ? -100 : 0;
    }
    return ((current - previous) / previous) * 100;
};

export class FinancialReportService {

    private getPagination(page?: number | string, limit?: number | string) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return { page: pageNum, limit: limitNum, skip };
    }

    async getFinancialOverview(businessId: number, range?: DateRangeQuery) {
        try {
            const { start, end } = resolveDateRange(range);

            const durationMs = end.getTime() - start.getTime() + 1;
            const prevStart = new Date(start.getTime() - durationMs);
            const prevEnd = new Date(end.getTime() - durationMs);

            // Fetch Current Period Data in parallel
            const [
                salesCurrent,
                creditNotesCurrent,
                purchasesCurrent,
                cogsCurrentResult,
                // Previous Period Data for comparison
                salesPrev,
                creditNotesPrev,
                purchasesPrev,
                cogsPrevResult
            ] = await Promise.all([
                // Sales
                prisma.sale.aggregate({
                    where: {
                        businessId,
                        status: 'COMPLETED',
                        createdAt: { gte: start, lte: end },
                        deletedAt: null
                    },
                    _sum: { totalAmount: true },
                    _count: { id: true }
                }),
                // Credit Notes (returns)
                prisma.creditNote.aggregate({
                    where: {
                        businessId,
                        createdAt: { gte: start, lte: end },
                        sale: { status: { not: 'CANCELLED' } }
                    },
                    _sum: { totalAmount: true }
                }),
                // Purchases
                prisma.purchase.aggregate({
                    where: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        createdAt: { gte: start, lte: end }
                    },
                    _sum: { totalCost: true },
                    _count: { id: true }
                }),
                // Cost of Goods Sold (Current)
                prisma.$queryRaw<[{ totalCost: number }]>`
                    SELECT COALESCE(SUM(si.quantity * p."costPrice"), 0)::numeric as "totalCost"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
                `,
                // Previous Sales
                prisma.sale.aggregate({
                    where: {
                        businessId,
                        status: 'COMPLETED',
                        createdAt: { gte: prevStart, lte: prevEnd },
                        deletedAt: null
                    },
                    _sum: { totalAmount: true }
                }),
                // Previous Credit Notes
                prisma.creditNote.aggregate({
                    where: {
                        businessId,
                        createdAt: { gte: prevStart, lte: prevEnd },
                        sale: { status: { not: 'CANCELLED' } }
                    },
                    _sum: { totalAmount: true }
                }),
                // Previous Purchases
                prisma.purchase.aggregate({
                    where: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        createdAt: { gte: prevStart, lte: prevEnd }
                    },
                    _sum: { totalCost: true }
                }),
                // Previous Cost of Goods Sold
                prisma.$queryRaw<[{ totalCost: number }]>`
                    SELECT COALESCE(SUM(si.quantity * p."costPrice"), 0)::numeric as "totalCost"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${prevStart}
                      AND s."createdAt" <= ${prevEnd}
                `
            ]);

            // Math for Current Period
            const grossRevenue = Number(salesCurrent._sum.totalAmount || 0);
            const salesCount = Number(salesCurrent._count.id || 0);
            const returns = Number(creditNotesCurrent._sum.totalAmount || 0);
            const netRevenue = grossRevenue - returns;
            
            const costOfGoodsSold = Number(cogsCurrentResult[0]?.totalCost || 0);
            const grossProfit = netRevenue - costOfGoodsSold;
            const grossMarginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

            const totalExpenses = Number(purchasesCurrent._sum.totalCost || 0);
            const purchasesCount = Number(purchasesCurrent._count.id || 0);

            const netProfit = grossProfit - totalExpenses;
            const netMarginPct = netRevenue > 0 ? (netProfit / netRevenue) * 100 : 0;

            const avgTicket = salesCount > 0 ? netRevenue / salesCount : 0;

            // Math for Previous Period
            const grossRevenuePrev = Number(salesPrev._sum.totalAmount || 0);
            const returnsPrev = Number(creditNotesPrev._sum.totalAmount || 0);
            const netRevenuePrev = grossRevenuePrev - returnsPrev;
            const costOfGoodsSoldPrev = Number(cogsPrevResult[0]?.totalCost || 0);
            const grossProfitPrev = netRevenuePrev - costOfGoodsSoldPrev;
            const totalExpensesPrev = Number(purchasesPrev._sum.totalCost || 0);
            const netProfitPrev = grossProfitPrev - totalExpensesPrev;

            // Variations
            const revenueVariation = calcPctChange(netRevenue, netRevenuePrev);
            const expensesVariation = calcPctChange(totalExpenses, totalExpensesPrev);
            const profitVariation = calcPctChange(netProfit, netProfitPrev);

            return {
                status: 200,
                message: 'Overview financiero general calculado exitosamente',
                data: {
                    grossRevenue,
                    returns,
                    netRevenue,
                    costOfGoodsSold,
                    grossProfit,
                    grossMarginPct,
                    totalExpenses,
                    netProfit,
                    netMarginPct,
                    salesCount,
                    purchasesCount,
                    avgTicket,
                    prevNetRevenue: netRevenuePrev,
                    prevTotalExpenses: totalExpensesPrev,
                    prevNetProfit: netProfitPrev,
                    revenueVariation,
                    expensesVariation,
                    profitVariation
                }
            };

        } catch (error) {
            console.error('Error en FinancialReportService.getFinancialOverview:', error);
            return {
                status: 500,
                message: 'Error interno al calcular overview financiero',
                data: null
            };
        }
    }

    async getProductMarginReport(
        businessId: number,
        range?: DateRangeQuery,
        pagination?: { page?: number | string; limit?: number | string }
    ) {
        try {
            const { start, end } = resolveDateRange(range);
            const { page, limit, skip } = this.getPagination(pagination?.page, pagination?.limit);

            // Query items sold in period grouped by product
            const [productsRaw, totalCountResult, summaryResult] = await Promise.all([
                prisma.$queryRaw<any[]>`
                    SELECT
                        p.id as "productId",
                        p.name as "productName",
                        c.name as "categoryName",
                        SUM(si.quantity)::numeric as "unitsSold",
                        SUM(si."subTotal")::numeric as "totalRevenue",
                        (SUM(si.quantity) * p."costPrice")::numeric as "totalCost",
                        p."profitMargin"::numeric as "configuredMargin"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    INNER JOIN "Category" c ON p."categoryId" = c.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
                    GROUP BY p.id, c.name
                    ORDER BY "unitsSold" DESC
                    LIMIT ${limit} OFFSET ${skip}
                `,
                prisma.$queryRaw<[{ count: number }]>`
                    SELECT COUNT(DISTINCT p.id)::int as count
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
                `,
                prisma.$queryRaw<[{ totalRevenue: number; totalCost: number; weightedConfiguredMargin: number }]>`
                    SELECT
                        COALESCE(SUM(si."subTotal"), 0)::numeric as "totalRevenue",
                        COALESCE(SUM(si.quantity * p."costPrice"), 0)::numeric as "totalCost",
                        COALESCE(SUM(si."subTotal" * p."profitMargin"), 0)::numeric as "weightedConfiguredMargin"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
                `
            ]);

            const products = productsRaw.map((p) => {
                const totalRevenue = Number(p.totalRevenue || 0);
                const totalCost = Number(p.totalCost || 0);
                const realProfit = totalRevenue - totalCost;
                
                const configuredMargin = Number(p.configuredMargin || 0) * 100; // stored as e.g. 0.3000
                const realMargin = totalRevenue > 0 ? (realProfit / totalRevenue) * 100 : 0;
                const marginDeviation = realMargin - configuredMargin;

                return {
                    productId: Number(p.productId),
                    productName: p.productName,
                    categoryName: p.categoryName,
                    unitsSold: Number(p.unitsSold || 0),
                    totalRevenue,
                    totalCost,
                    realProfit,
                    configuredMargin: Math.round(configuredMargin * 100) / 100,
                    realMargin: Math.round(realMargin * 100) / 100,
                    marginDeviation: Math.round(marginDeviation * 100) / 100
                };
            });

            const summaryStats = summaryResult[0];
            const summaryTotalRevenue = Number(summaryStats?.totalRevenue || 0);
            const summaryTotalCost = Number(summaryStats?.totalCost || 0);
            const summaryTotalProfit = summaryTotalRevenue - summaryTotalCost;
            
            const avgRealMargin = summaryTotalRevenue > 0 ? (summaryTotalProfit / summaryTotalRevenue) * 100 : 0;
            // Weighted configured margin percentage
            const avgConfiguredMargin = summaryTotalRevenue > 0 ? (Number(summaryStats?.weightedConfiguredMargin || 0) / summaryTotalRevenue) * 100 : 0;

            return {
                status: 200,
                message: 'Reporte de margen por producto calculado exitosamente',
                data: {
                    products,
                    pagination: {
                        page,
                        limit,
                        total: Number(totalCountResult[0]?.count || 0),
                        totalPages: Math.ceil(Number(totalCountResult[0]?.count || 0) / limit),
                        summary: {
                            totalRevenue: summaryTotalRevenue,
                            totalCost: summaryTotalCost,
                            totalProfit: summaryTotalProfit,
                            avgRealMargin: Math.round(avgRealMargin * 100) / 100,
                            avgConfiguredMargin: Math.round(avgConfiguredMargin * 100) / 100
                        }
                    }
                }
            };

        } catch (error) {
            console.error('Error en FinancialReportService.getProductMarginReport:', error);
            return {
                status: 500,
                message: 'Error interno al calcular reporte de márgenes por producto',
                data: {
                    products: [],
                    pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                    summary: { totalRevenue: 0, totalCost: 0, totalProfit: 0, avgRealMargin: 0, avgConfiguredMargin: 0 }
                }
            };
        }
    }
}
