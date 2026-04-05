import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';
import { subDays } from 'date-fns';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
    /** Client timezone offset in minutes (Date.getTimezoneOffset()). */
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
}