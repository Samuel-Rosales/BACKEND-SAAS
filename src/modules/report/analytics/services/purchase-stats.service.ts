import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';
import { differenceInCalendarDays, endOfMonth, startOfMonth, subDays, subMonths } from 'date-fns';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
};

const parseDateOnlyStart = (value: string) => new Date(`${value}T00:00:00.000`);
const parseDateOnlyEnd = (value: string) => new Date(`${value}T23:59:59.999`);

export class PurchaseStatsService {
    async getDetailedPurchaseReport(businessId: number, range?: DateRangeQuery) {
        const now = new Date();

        let currentStart = startOfMonth(now);
        let currentEnd = endOfMonth(now);

        let prevStart = startOfMonth(subMonths(now, 1));
        let prevEnd = endOfMonth(subMonths(now, 1));

        // Si se envía rango, usamos ese período y comparamos con el período anterior equivalente
        if (range?.fromDate && range?.toDate) {
            currentStart = parseDateOnlyStart(range.fromDate);
            currentEnd = parseDateOnlyEnd(range.toDate);

            const spanDays = Math.max(1, differenceInCalendarDays(currentEnd, currentStart) + 1);
            prevEnd = subDays(currentStart, 1);
            prevStart = subDays(currentStart, spanDays);
        } else if (range?.fromDate && !range?.toDate) {
            currentStart = parseDateOnlyStart(range.fromDate);
            currentEnd = now;
        } else if (!range?.fromDate && range?.toDate) {
            currentStart = startOfMonth(parseDateOnlyStart(range.toDate));
            currentEnd = parseDateOnlyEnd(range.toDate);
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