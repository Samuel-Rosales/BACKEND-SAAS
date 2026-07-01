import { prisma } from '@/configs';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay, subMonths } from 'date-fns';

export class CreditStatsService {

    async getCreditDashboardMetrics(businessId: number) {
        try {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            const startOfPrevMonth = startOfMonth(subMonths(now, 1));
            const endOfPrevMonth = endOfMonth(subMonths(now, 1));
            
            // 1. Ejecutar consultas en paralelo
            const [debtStats, uniqueDebtors, creditHistory, previousCreditHistory] = await Promise.all([
                
                // A. KPI Principal: ¿Cuánto me deben HOY? (Money in the street)
                prisma.sale.aggregate({
                    _sum: {
                        remainingBalance: true // <--- CORREGIDO: Antes era 'balance'
                    },
                    where: {
                        businessId,
                        // Solo sumamos si hay saldo pendiente mayor a 0
                        remainingBalance: { gt: 0 }, 
                        // Ignoramos ventas canceladas o borradores
                        status: 'COMPLETED',
                    }
                }),

                // B. Contexto: ¿Cuántos clientes distintos me deben?
                prisma.sale.groupBy({
                    by: ['clientId'],
                    where: {
                        businessId,
                        remainingBalance: { gt: 0 },
                        status: 'COMPLETED'
                    }
                }),

                // C. Tendencia: Créditos otorgados este mes
                prisma.sale.findMany({
                    select: {
                        createdAt: true,
                        totalAmount: true // <--- CORREGIDO: Antes era 'total'
                    },
                    where: {
                        businessId,
                        conditions: 'CREDIT', // <--- CORREGIDO: Antes era 'condition'
                        createdAt: { gte: startOfCurrentMonth },
                        status: 'COMPLETED'
                    },
                    orderBy: { createdAt: 'asc' }
                }),

                // D. Tendencia del mes anterior (para gráfico extendido a inicio de mes)
                prisma.sale.findMany({
                    select: {
                        createdAt: true,
                        totalAmount: true
                    },
                    where: {
                        businessId,
                        conditions: 'CREDIT',
                        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth },
                        status: 'COMPLETED'
                    },
                    orderBy: { createdAt: 'asc' }
                })
            ]);

            // 2. Procesamiento de Datos (Convertir Decimal a Number)
            
            // Prisma devuelve objetos Decimal, hay que convertirlos a Number de JS
            const totalDebt = Number(debtStats._sum.remainingBalance) || 0;
            const debtorsCount = uniqueDebtors.length;

            // Lógica de Status (Ejemplo: Si la deuda supera los $5,000 es Warning)
            const status = totalDebt > 5000 ? 'Warning' : 'Neutral';

            // 3. Generar Gráfico (Sparkline)
            const daysInMonth = eachDayOfInterval({
                start: startOfCurrentMonth,
                end: now
            });

            let trend = daysInMonth.map(day => {
                const salesThatDay = creditHistory.filter(sale => 
                    isSameDay(sale.createdAt, day)
                );
                return salesThatDay.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
            });

            // Si estamos a inicio de mes, incluimos el mes anterior
            let previousMonthDays = 0;
            const MIN_TREND_POINTS = 7;
            if (daysInMonth.length < MIN_TREND_POINTS) {
                const prevDays = eachDayOfInterval({
                    start: startOfPrevMonth,
                    end: endOfPrevMonth
                });

                const prevTrend = prevDays.map(day => {
                    const salesThatDay = previousCreditHistory.filter(sale =>
                        isSameDay(sale.createdAt, day)
                    );
                    return salesThatDay.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
                });

                trend = [...prevTrend, ...trend];
                previousMonthDays = prevDays.length;
            }

            return {
                status: 200,
                message: 'Métricas de crédito calculadas exitosamente',
                data: {
                    pendingAmount: totalDebt,      // $18,500
                    totalDebtors: debtorsCount,    // 84 clientes
                    status: status,                // "Warning"
                    trend: trend,                  // [0, 150, 0, 500...]
                    previousMonthDays: previousMonthDays,
                    label: "Pagos Pendientes"
                }
            };

        } catch (error) {
            console.error('Error en CreditStatsService:', error);
            return { 
                status: 500,
                message: 'Error interno al calcular métricas de crédito',
                data: {
                    pendingAmount: 0, totalDebtors: 0, status: 'Neutral', trend: [] 
                }
            };
        }
    }
}