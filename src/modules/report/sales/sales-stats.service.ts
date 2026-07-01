import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';

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

    // End of the local day = start of next local day - 1ms
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

    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const localTodayDayOfMonth = local.getUTCDate();

    return {
        start: new Date(startUtcMs),
        end: new Date(endUtcMs),
        daysInMonth,
        localTodayDayOfMonth
    };
};

const getLocalDayOfMonth = (dateUtc: Date, tzOffsetMinutes: number) => {
    const local = new Date(dateUtc.getTime() - (tzOffsetMinutes * 60_000));
    return local.getUTCDate();
};



export class SalesStatsService {

    async getSalesDashboardMetrics(businessId: number, tzOffset?: number | string) {
        const now = new Date();

        // Timezone offset (minutes) for correct month bucketing.
        // If not provided, we fall back to server timezone (keeps previous behavior).
        const tzOffsetMinutes = (() => {
            if (tzOffset === null || tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        // 1. Definir rangos de tiempo (Mes Actual vs Mes Anterior) en timezone del cliente
        const currentRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        const previousRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, -1);

        const currentStart = currentRange.start;
        const currentEnd = currentRange.end;
        const previousStart = previousRange.start;
        const previousEnd = previousRange.end;

        try {
            // 2. Ejecutar consultas en Paralelo (Promise.all)
            const [currentMonthStats, previousMonthStats, dailyMovements, previousDailyMovements] = await Promise.all([
                
                // A. Suma total del Mes Actual
                prisma.sale.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        businessId,
                        status: 'COMPLETED', // O 'PAID', asegúrate de filtrar solo ventas reales
                        createdAt: { gte: currentStart, lte: currentEnd }
                    }
                }),

                // B. Suma total del Mes Anterior (Para comparar y definir el status)
                prisma.sale.aggregate({
                    _sum: { totalAmount: true },
                    where: {
                        businessId,
                        status: 'COMPLETED',
                        createdAt: { gte: previousStart, lte: previousEnd }
                    }
                }),

                // C. Datos para el Gráfico (Trend)
                // Traemos solo fecha y total de las ventas de este mes
                prisma.sale.findMany({
                    select: {
                        createdAt: true,
                        totalAmount: true
                    },
                    where: {
                        businessId,
                        status: 'COMPLETED',
                        createdAt: { gte: currentStart, lte: currentEnd }
                    },
                    orderBy: { createdAt: 'asc' }
                }),

                // D. Datos diarios del Mes Anterior (para gráfico extendido a inicio de mes)
                prisma.sale.findMany({
                    select: {
                        createdAt: true,
                        totalAmount: true
                    },
                    where: {
                        businessId,
                        status: 'COMPLETED',
                        createdAt: { gte: previousStart, lte: previousEnd }
                    },
                    orderBy: { createdAt: 'asc' }
                })
            ]);

            // 3. Procesar los datos (Logica de Negocio)
            
            const currentTotal = new Decimal(currentMonthStats._sum.totalAmount || 0); // Si no hay ventas, aseguramos que sea 0
            const previousTotal = new Decimal(previousMonthStats._sum.totalAmount || 0);

            // Calcular Status: Si vendimos más o igual que el mes pasado a estas alturas (o en total) es 'Good'
            // Puedes ajustar esta lógica. Ej: Si currentTotal > previousTotal
            const status = currentTotal?.gte(previousTotal) ? 'Good' : 'Warning';

            // 4. Generar el Array para el Gráfico (Sparkline)
            const daysInCurrentMonth = currentRange.daysInMonth;
            const chartData = new Array(daysInCurrentMonth).fill(0);

            dailyMovements.forEach(sale => {
                const dayOfMonth = getLocalDayOfMonth(sale.createdAt, tzOffsetMinutes);
                if (dayOfMonth >= 1 && dayOfMonth <= daysInCurrentMonth) {
                    chartData[dayOfMonth - 1] += Number(sale.totalAmount);
                }
            });

            // Cortamos hasta el día actual para no mostrar ceros futuros
            const today = currentRange.localTodayDayOfMonth;
            let trend = chartData.slice(0, today);
            let previousMonthDays = 0;

            // Si estamos en los primeros días del mes, incluimos el mes anterior
            // para que la gráfica tenga suficientes puntos y se vea correctamente.
            const MIN_TREND_POINTS = 7;
            if (today < MIN_TREND_POINTS) {
                const prevDaysInMonth = previousRange.daysInMonth;
                const prevChartData = new Array(prevDaysInMonth).fill(0);

                previousDailyMovements.forEach(sale => {
                    const dayOfMonth = getLocalDayOfMonth(sale.createdAt, tzOffsetMinutes);
                    if (dayOfMonth >= 1 && dayOfMonth <= prevDaysInMonth) {
                        prevChartData[dayOfMonth - 1] += Number(sale.totalAmount);
                    }
                });

                trend = [...prevChartData, ...trend];
                previousMonthDays = prevDaysInMonth;
            }

            return {
                status: 200,
                message: 'Métricas de ventas calculadas exitosamente',
                data: {
                    currentMonthRevenue: currentTotal, // $45,200
                    status: status,                    // "Good" o "Warning"
                    trend: trend,                      // [120, 500, 0, 230...]
                    previousMonthDays: previousMonthDays
                }                       
            };

        } catch (error) {
            console.error('Error obteniendo métricas de ventas:', error);

            return { 
                status: 500,
                message: 'Error interno al calcular métricas de ventas',
                data: {
                    currentMonthRevenue: 0, status: 'Neutral', trend: [] 
                }
            };
        }
    }

    async getDetailedReport(businessId: number, range?: DateRangeQuery) {
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

        if (range?.fromDate && range?.toDate) {
            currentStart = parseDateOnlyStart(range.fromDate, tzOffsetMinutes);
            currentEnd = parseDateOnlyEnd(range.toDate, tzOffsetMinutes);
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
            // Ejecutamos consultas en paralelo para no bloquear el hilo
            const [salesStats, creditNotes] = await Promise.all([
                // 1. Estadísticas de Ventas (Brutas y Deuda)
                prisma.sale.aggregate({
                    where: {
                        businessId,
                        status: { not: 'CANCELLED' }, // Solo ventas válidas
                        createdAt: { gte: currentStart, lte: currentEnd },
                        deletedAt: null // Importante si usas Soft Delete
                    },
                    _sum: {
                        totalAmount: true,      // Venta Bruta
                        remainingBalance: true, // Lo que deben actualmente
                    },
                    _count: { id: true }
                }),

                // 2. Estadísticas de Notas de Crédito (Devoluciones)
                prisma.creditNote.aggregate({
                    where: {
                        businessId,
                        createdAt: { gte: currentStart, lte: currentEnd },
                        sale: { status: { not: 'CANCELLED' } } // Solo devoluciones de ventas válidas
                    },
                    _sum: { totalAmount: true }
                })
            ]);

            // --- LÓGICA DE NEGOCIO (SENIOR LEVEL) ---

            const grossSales = new Decimal(salesStats._sum.totalAmount || 0);
            const totalReturns = new Decimal(creditNotes._sum.totalAmount || 0);
            const totalDebt = new Decimal(salesStats._sum.remainingBalance || 0);

            // Ventas Totales (Netas): Es lo que realmente se vendió tras devoluciones
            const netSales = grossSales.minus(totalReturns);

            // Ingreso Real (Recaudado): 
            // Lo que se vendió (neto) menos lo que aún me deben
            const totalIncome = netSales.minus(totalDebt);

            // Ticket Promedio: Basado en la venta neta
            const averageTicket = salesStats._count.id > 0 
                ? netSales.div(salesStats._count.id) 
                : new Decimal(0);

            return {
                status: 200,
                data: {
                    totalSales: netSales.toNumber(),      // Ventas Netas
                    totalIncome: totalIncome.toNumber(),    // Dinero en mano
                    pendingDebt: totalDebt.toNumber(),      // Lo que te deben
                    averageTicket: averageTicket.toNumber(),
                    totalOrders: salesStats._count.id
                },
                message: 'Reporte de ventas calculado exitosamente'
            };

        } catch (error) {
            console.error("Error en reporte detallado:", error);
            
            return {
                status: 500,
                message: 'Error interno al calcular reporte detallado de ventas',
                data: {
                    totalSales: 0,
                    totalIncome: 0,
                    pendingDebt: 0,
                    averageTicket: 0,
                    totalOrders: 0
                }
            };
        }
    }
}