import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';
import { Prisma } from '@prisma/client';
import { format, subDays } from 'date-fns';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
    /** Client timezone offset in minutes (Date.getTimezoneOffset()). */
    tzOffset?: number | string;
};

export type PurchaseGroupedReportGroupBy = 'category' | 'supplier';

type PurchaseGroupedReportQuery = DateRangeQuery & {
    groupBy?: PurchaseGroupedReportGroupBy;
    groupId?: number | string;
};

type PurchaseGroupedReportRow = {
    groupId: number;
    groupName: string;
    productId: number;
    productName: string;
    totalQuantity: string | number | Decimal;
    totalCost: string | number | Decimal;
};

type PurchaseGroupedReportGroup = {
    groupId: number;
    groupName: string;
    items: Array<{
        productId: number;
        productName: string;
        totalQuantity: number;
        totalCost: number;
    }>;
    subtotalQuantity: number;
    subtotalCost: number;
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
    // Represent "local" time using UTC getters by shifting by tzOffset.
    const local = new Date(baseDateUtc.getTime() - (tzOffsetMinutes * 60_000));
    const year = local.getUTCFullYear();
    const monthIndex = local.getUTCMonth() + monthDelta;

    const startUtcMs = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000);
    const endUtcMs = Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000) - 1;

    return {
        start: new Date(startUtcMs),
        end: new Date(endUtcMs)
    };
};

export class PurchaseStatsService {
    async getDetailedPurchaseReport(businessId: number, range?: DateRangeQuery) {
        const now = new Date();

        // Timezone offset (minutes) for correct date-only filtering.
        // If not provided, we fall back to server timezone (keeps previous behavior).
        const tzOffsetMinutes = (() => {
            if (!range || range.tzOffset === null || range.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(range.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        let currentStart = defaultMonthRange.start;
        let currentEnd = defaultMonthRange.end;

        let prevStart = getLocalMonthRangeUtc(now, tzOffsetMinutes, -1).start;
        let prevEnd = getLocalMonthRangeUtc(now, tzOffsetMinutes, -1).end;

        // Si se envía rango, usamos ese período y comparamos con el período anterior equivalente
        if (range?.fromDate && range?.toDate) {
            currentStart = parseDateOnlyStart(range.fromDate, tzOffsetMinutes);
            currentEnd = parseDateOnlyEnd(range.toDate, tzOffsetMinutes);

            const spanDays = Math.max(
                1,
                Math.floor((currentEnd.getTime() - currentStart.getTime()) / 86_400_000) + 1
            );
            prevEnd = subDays(currentStart, 1);
            prevStart = subDays(currentStart, spanDays);
        } else if (range?.fromDate && !range?.toDate) {
            currentStart = parseDateOnlyStart(range.fromDate, tzOffsetMinutes);
            currentEnd = now;
        } else if (!range?.fromDate && range?.toDate) {
            const base = parseDateOnlyStart(range.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            currentStart = monthRange.start;
            currentEnd = parseDateOnlyEnd(range.toDate, tzOffsetMinutes);
        }

        try {
            const [currentStats, prevStats, activeSuppliers] = await Promise.all([
                // 1. Métricas del Mes Actual
                prisma.purchase.aggregate({
                    where: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        createdAt: { gte: currentStart, lte: currentEnd },
                        // deletedAt: null // Agrégalo si implementaste Soft Delete en este modelo tmb
                    },
                    _sum: { 
                        totalCost: true,        // <-- Corregido: Según tu modelo
                        remainingBalance: true  // <-- Corregido: Según tu modelo
                    },
                    _count: { id: true }
                }),

                // 2. Métricas del Mes Anterior para comparar
                prisma.purchase.aggregate({
                    where: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        createdAt: { gte: prevStart, lte: prevEnd }
                    },
                    _sum: { totalCost: true }
                }),

                // 3. Conteo de proveedores distintos que nos vendieron este mes
                prisma.purchase.groupBy({
                    by: ['supplierId'],
                    where: {
                        businessId,
                        createdAt: { gte: currentStart, lte: currentEnd },
                        status: { not: 'CANCELLED' }
                    }
                })
            ]);

            // Lógica de Negocio
            const currentTotal = new Decimal(currentStats._sum.totalCost || 0);
            const prevTotal = new Decimal(prevStats._sum.totalCost || 0);
            const totalDebt = new Decimal(currentStats._sum.remainingBalance || 0);

            // Variación % (Fórmula: ((Actual - Anterior) / Anterior) * 100)
            const variation = prevTotal.isZero() 
                ? 100 
                : currentTotal.minus(prevTotal).div(prevTotal).mul(100).toNumber();

            return {
                status: 200,
                data: {
                    totalPurchases: currentTotal.toNumber(),
                    pendingDebt: totalDebt.toNumber(),
                    activeSuppliers: activeSuppliers.length,
                    variation: parseFloat(variation.toFixed(2)),
                    orderCount: currentStats._count.id
                }
            };

        } catch (error) {
            console.error("Error en reporte de compras:", error);
            return {
                status: 500,
                message: 'Error al calcular reporte de compras',
                data: { totalPurchases: 0, pendingDebt: 0, activeSuppliers: 0, variation: 0 }
            };
        }
    }

    async generateGroupedPurchaseReportPDF(businessId: number, params: PurchaseGroupedReportQuery = {}) {
        const tzOffsetMinutes = (() => {
            if (params.tzOffset === null || params.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(params.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const now = new Date();
        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);

        let currentStart = defaultMonthRange.start;
        let currentEnd = defaultMonthRange.end;

        if (params.fromDate && params.toDate) {
            currentStart = parseDateOnlyStart(params.fromDate, tzOffsetMinutes);
            currentEnd = parseDateOnlyEnd(params.toDate, tzOffsetMinutes);
        } else if (params.fromDate && !params.toDate) {
            currentStart = parseDateOnlyStart(params.fromDate, tzOffsetMinutes);
            currentEnd = now;
        } else if (!params.fromDate && params.toDate) {
            const base = parseDateOnlyStart(params.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            currentStart = monthRange.start;
            currentEnd = parseDateOnlyEnd(params.toDate, tzOffsetMinutes);
        }

        try {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true }
            });

            if (!business) {
                return {
                    status: 404,
                    message: 'Negocio no encontrado'
                };
            }

            const groupBy = params.groupBy === 'supplier' ? 'supplier' : 'category';
            const selectedGroupId = params.groupId !== undefined && params.groupId !== null && String(params.groupId).trim() !== ''
                ? Number(params.groupId)
                : undefined;

            const rows = groupBy === 'supplier'
                ? await prisma.$queryRaw<PurchaseGroupedReportRow[]>(Prisma.sql`
                    SELECT
                        s.id as "groupId",
                        s."nameCompany" as "groupName",
                        p.id as "productId",
                        p.name as "productName",
                        COALESCE(SUM(pi.quantity), 0)::numeric as "totalQuantity",
                        COALESCE(SUM(pi.quantity * pi."unitCost"), 0)::numeric as "totalCost"
                    FROM "PurchaseItem" pi
                    INNER JOIN "Purchase" pu ON pi."purchaseId" = pu.id
                    INNER JOIN "Product" p ON pi."productId" = p.id
                    INNER JOIN "Supplier" s ON pu."supplierId" = s.id
                    WHERE pu."businessId" = ${businessId}
                    AND pu."status" <> 'CANCELLED'
                    AND pu."createdAt" >= ${currentStart}
                    AND pu."createdAt" <= ${currentEnd}
                    ${selectedGroupId ? Prisma.sql`AND s.id = ${selectedGroupId}` : Prisma.empty}
                    GROUP BY s.id, s."nameCompany", p.id, p.name
                    ORDER BY s."nameCompany" ASC, p.name ASC
                `)
                : await prisma.$queryRaw<PurchaseGroupedReportRow[]>(Prisma.sql`
                    SELECT
                        c.id as "groupId",
                        c.name as "groupName",
                        p.id as "productId",
                        p.name as "productName",
                        COALESCE(SUM(pi.quantity), 0)::numeric as "totalQuantity",
                        COALESCE(SUM(pi.quantity * pi."unitCost"), 0)::numeric as "totalCost"
                    FROM "PurchaseItem" pi
                    INNER JOIN "Purchase" pu ON pi."purchaseId" = pu.id
                    INNER JOIN "Product" p ON pi."productId" = p.id
                    INNER JOIN "Category" c ON p."categoryId" = c.id
                    WHERE pu."businessId" = ${businessId}
                    AND pu."status" <> 'CANCELLED'
                    AND pu."createdAt" >= ${currentStart}
                    AND pu."createdAt" <= ${currentEnd}
                    ${selectedGroupId ? Prisma.sql`AND c.id = ${selectedGroupId}` : Prisma.empty}
                    GROUP BY c.id, c.name, p.id, p.name
                    ORDER BY c.name ASC, p.name ASC
                `);

            const groupsMap = new Map<number, PurchaseGroupedReportGroup>();
            let grandTotalQuantity = 0;
            let grandTotalCost = 0;

            for (const row of rows) {
                const group = groupsMap.get(row.groupId) ?? {
                    groupId: row.groupId,
                    groupName: row.groupName,
                    items: [],
                    subtotalQuantity: 0,
                    subtotalCost: 0,
                };

                const totalQuantity = Number(row.totalQuantity || 0);
                const totalCost = Number(row.totalCost || 0);

                group.items.push({
                    productId: row.productId,
                    productName: row.productName,
                    totalQuantity,
                    totalCost,
                });

                group.subtotalQuantity += totalQuantity;
                group.subtotalCost += totalCost;

                groupsMap.set(row.groupId, group);

                grandTotalQuantity += totalQuantity;
                grandTotalCost += totalCost;
            }

            return {
                status: 200,
                message: 'PDF de compras agrupado generado exitosamente',
                data: {
                    businessName: business.name,
                    dateRange: {
                        from: format(currentStart, 'dd/MM/yyyy'),
                        to: format(currentEnd, 'dd/MM/yyyy'),
                    },
                    groupBy,
                    groupByLabel: groupBy === 'supplier' ? 'Proveedor' : 'Categoría',
                    groups: Array.from(groupsMap.values()),
                    grandTotals: {
                        totalQuantity: grandTotalQuantity,
                        totalCost: grandTotalCost,
                    },
                }
            };

        } catch (error) {
            console.error('Error generando PDF agrupado de compras:', error);
            return {
                status: 500,
                message: 'Error interno generando PDF agrupado de compras'
            };
        }
    }
}
