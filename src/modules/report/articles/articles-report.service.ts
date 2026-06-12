import { prisma } from '@/configs';
import { Prisma } from '@prisma/client';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
    tzOffset?: number | string;
};

type RankingParams = DateRangeQuery & {
    categoryId?: number | string;
    sortBy?: 'mostSold' | 'leastSold' | 'mostProfitable' | 'leastProfitable';
    page?: number | string;
    limit?: number | string;
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

export class ArticlesReportService {

    private getPagination(page?: number | string, limit?: number | string) {
        const pageNum = Math.max(1, Number(page) || 1);
        const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
        const skip = (pageNum - 1) * limitNum;
        return { page: pageNum, limit: limitNum, skip };
    }

    async getOverview(businessId: number, range?: DateRangeQuery) {
        try {
            const { start, end } = resolveDateRange(range);

            const [salesAgg, uniqueProducts] = await Promise.all([
                prisma.$queryRaw<[{ totalRevenue: number; totalCost: number; totalUnits: number; orderCount: number }]>`
                    SELECT
                        COALESCE(SUM(si."subTotal"), 0)::numeric as "totalRevenue",
                        COALESCE(SUM(si.quantity * p."costPrice"), 0)::numeric as "totalCost",
                        COALESCE(SUM(si.quantity), 0)::numeric as "totalUnits",
                        COUNT(DISTINCT s.id)::int as "orderCount"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
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
                `
            ]);

            const stats = salesAgg[0];
            const totalRevenue = Number(stats?.totalRevenue || 0);
            const totalCost = Number(stats?.totalCost || 0);
            const totalUnits = Number(stats?.totalUnits || 0);
            const orderCount = Number(stats?.orderCount || 0);
            const netProfit = totalRevenue - totalCost;
            const avgMargin = totalCost > 0 ? ((netProfit / totalCost) * 100) : 0;

            return {
                status: 200,
                message: 'Overview de artículos calculado exitosamente',
                data: {
                    totalProductsSold: Number(uniqueProducts[0]?.count || 0),
                    totalRevenue,
                    totalCost,
                    netProfit,
                    avgMargin: Math.round(avgMargin * 100) / 100,
                    totalUnits,
                    totalOrders: orderCount
                }
            };
        } catch (error) {
            console.error('Error en ArticlesReportService.getOverview:', error);
            return {
                status: 500,
                message: 'Error interno calculando overview de artículos',
                data: {
                    totalProductsSold: 0,
                    totalRevenue: 0,
                    totalCost: 0,
                    netProfit: 0,
                    avgMargin: 0,
                    totalUnits: 0,
                    totalOrders: 0
                }
            };
        }
    }

    async getRanking(businessId: number, params: RankingParams = {}) {
        try {
            const { page, limit, skip } = this.getPagination(params.page, params.limit);
            const { start, end } = resolveDateRange(params);

            const sortBy = params.sortBy || 'mostSold';
            const categoryId = params.categoryId ? Number(params.categoryId) : null;

            const orderClause = (() => {
                switch (sortBy) {
                    case 'leastSold': return Prisma.sql`"totalUnitsSold" ASC`;
                    case 'mostProfitable': return Prisma.sql`"netProfit" DESC`;
                    case 'leastProfitable': return Prisma.sql`"netProfit" ASC`;
                    default: return Prisma.sql`"totalUnitsSold" DESC`;
                }
            })();

            const categoryCondition = categoryId
                ? Prisma.sql`AND p."categoryId" = ${categoryId}`
                : Prisma.empty;

            const [products, totalResult, summaryResult] = await Promise.all([
                prisma.$queryRaw<any[]>`
                    SELECT
                        p.id,
                        p.name,
                        p.sku,
                        c.name as "categoryName",
                        u.symbol as "unitSymbol",
                        p."costPrice",
                        p."salePrice",
                        SUM(si.quantity)::numeric as "totalUnitsSold",
                        SUM(si."subTotal")::numeric as "totalRevenue",
                        (SUM(si.quantity) * p."costPrice")::numeric as "totalCost",
                        (SUM(si."subTotal") - (SUM(si.quantity) * p."costPrice"))::numeric as "netProfit",
                        CASE WHEN (SUM(si.quantity) * p."costPrice") > 0
                            THEN ROUND(((SUM(si."subTotal") - (SUM(si.quantity) * p."costPrice")) / (SUM(si.quantity) * p."costPrice") * 100)::numeric, 2)
                            ELSE 0
                        END as "profitMargin"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    INNER JOIN "Category" c ON p."categoryId" = c.id
                    INNER JOIN "MeasurementUnit" u ON p."unitId" = u.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
                      ${categoryCondition}
                    GROUP BY p.id, c.name, u.symbol
                    ORDER BY ${orderClause}
                    LIMIT ${limit} OFFSET ${skip}
                `,

                prisma.$queryRaw<[{ count: number }]>`
                    SELECT COUNT(*)::int as count
                    FROM (
                        SELECT p.id
                        FROM "SaleItem" si
                        INNER JOIN "Sale" s ON si."saleId" = s.id
                        INNER JOIN "Product" p ON si."productId" = p.id
                        WHERE s."businessId" = ${businessId}
                          AND s.status = 'COMPLETED'
                          AND s."deletedAt" IS NULL
                          AND s."createdAt" >= ${start}
                          AND s."createdAt" <= ${end}
                          ${categoryCondition}
                    ) sub
                `,

                prisma.$queryRaw<[{ totalRevenue: number; totalCost: number; totalUnits: number }]>`
                    SELECT
                        COALESCE(SUM(si."subTotal"), 0)::numeric as "totalRevenue",
                        COALESCE(SUM(si.quantity * p."costPrice"), 0)::numeric as "totalCost",
                        COALESCE(SUM(si.quantity), 0)::numeric as "totalUnits"
                    FROM "SaleItem" si
                    INNER JOIN "Sale" s ON si."saleId" = s.id
                    INNER JOIN "Product" p ON si."productId" = p.id
                    WHERE s."businessId" = ${businessId}
                      AND s.status = 'COMPLETED'
                      AND s."deletedAt" IS NULL
                      AND s."createdAt" >= ${start}
                      AND s."createdAt" <= ${end}
                      ${categoryCondition}
                `
            ]);

            const data = products.map((p: any) => ({
                id: Number(p.id),
                name: p.name,
                sku: p.sku,
                category: p.categoryName,
                unit: p.unitSymbol,
                costPrice: Number(p.costPrice),
                salePrice: Number(p.salePrice),
                totalUnitsSold: Number(p.totalUnitsSold),
                totalRevenue: Number(p.totalRevenue),
                totalCost: Number(p.totalCost),
                netProfit: Number(p.netProfit),
                profitMargin: Number(p.profitMargin)
            }));

            const summary = summaryResult[0];
            const totalRevenueAll = Number(summary?.totalRevenue || 0);

            return {
                status: 200,
                message: 'Ranking de artículos calculado exitosamente',
                data,
                pagination: {
                    page,
                    limit,
                    total: Number(totalResult[0]?.count || 0),
                    totalPages: Math.ceil(Number(totalResult[0]?.count || 0) / limit)
                },
                summary: {
                    totalRevenue: totalRevenueAll,
                    totalCost: Number(summary?.totalCost || 0),
                    totalUnits: Number(summary?.totalUnits || 0),
                    netProfit: totalRevenueAll - Number(summary?.totalCost || 0)
                }
            };
        } catch (error) {
            console.error('Error en ArticlesReportService.getRanking:', error);
            return {
                status: 500,
                message: 'Error interno calculando ranking de artículos',
                data: [],
                pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
                summary: { totalRevenue: 0, totalCost: 0, totalUnits: 0, netProfit: 0 }
            };
        }
    }

    async getPDFData(businessId: number, range?: DateRangeQuery) {
        try {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true, logoUrl: true }
            });

            if (!business) {
                return { status: 404, message: 'Negocio no encontrado' };
            }

            const { start, end } = resolveDateRange(range);

            const products = await prisma.$queryRaw<any[]>`
                SELECT
                    p.id,
                    p.name,
                    p.sku,
                    c.name as "categoryName",
                    u.symbol as "unitSymbol",
                    p."costPrice",
                    p."salePrice",
                    SUM(si.quantity)::numeric as "totalUnitsSold",
                    SUM(si."subTotal")::numeric as "totalRevenue",
                    (SUM(si.quantity) * p."costPrice")::numeric as "totalCost",
                    (SUM(si."subTotal") - (SUM(si.quantity) * p."costPrice"))::numeric as "netProfit",
                    CASE WHEN (SUM(si.quantity) * p."costPrice") > 0
                        THEN ROUND(((SUM(si."subTotal") - (SUM(si.quantity) * p."costPrice")) / (SUM(si.quantity) * p."costPrice") * 100)::numeric, 2)
                        ELSE 0
                    END as "profitMargin"
                FROM "SaleItem" si
                INNER JOIN "Sale" s ON si."saleId" = s.id
                INNER JOIN "Product" p ON si."productId" = p.id
                INNER JOIN "Category" c ON p."categoryId" = c.id
                INNER JOIN "MeasurementUnit" u ON p."unitId" = u.id
                WHERE s."businessId" = ${businessId}
                  AND s.status = 'COMPLETED'
                  AND s."deletedAt" IS NULL
                  AND s."createdAt" >= ${start}
                  AND s."createdAt" <= ${end}
                GROUP BY p.id, c.name, u.symbol
                ORDER BY "totalUnitsSold" DESC
            `;

            const totals = products.reduce(
                (acc, p: any) => ({
                    totalUnits: acc.totalUnits + Number(p.totalUnitsSold),
                    totalRevenue: acc.totalRevenue + Number(p.totalRevenue),
                    totalCost: acc.totalCost + Number(p.totalCost),
                    totalProfit: acc.totalProfit + Number(p.netProfit)
                }),
                { totalUnits: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 }
            );

            const fromDate = range?.fromDate || start.toISOString().slice(0, 10);
            const toDate = range?.toDate || end.toISOString().slice(0, 10);

            return {
                status: 200,
                message: 'Datos para PDF generados exitosamente',
                data: {
                    businessName: business.name,
                    logoUrl: business.logoUrl,
                    fromDate,
                    toDate,
                    products: products.map((p: any) => ({
                        id: Number(p.id),
                        name: p.name,
                        sku: p.sku,
                        category: p.categoryName,
                        unit: p.unitSymbol,
                        costPrice: Number(p.costPrice),
                        salePrice: Number(p.salePrice),
                        totalUnitsSold: Number(p.totalUnitsSold),
                        totalRevenue: Number(p.totalRevenue),
                        totalCost: Number(p.totalCost),
                        netProfit: Number(p.netProfit),
                        profitMargin: Number(p.profitMargin)
                    })),
                    totals
                }
            };
        } catch (error) {
            console.error('Error generando datos para PDF de artículos:', error);
            return { status: 500, message: 'Error interno generando datos para PDF' };
        }
    }
}
