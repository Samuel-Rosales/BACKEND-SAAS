import { prisma } from '@/configs';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';

export class CreditStatsService {

    async getCreditDashboardMetrics(businessId: number) {
        try {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            
            // 1. Ejecutar consultas en paralelo
            const [debtStats, uniqueDebtors, creditHistory] = await Promise.all([
                
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

            // Mapeamos día por día sumando los créditos otorgados
            const trend = daysInMonth.map(day => {
                const salesThatDay = creditHistory.filter(sale => 
                    isSameDay(sale.createdAt, day)
                );
                
                // Sumamos el totalAmount de las ventas a crédito del día
                const dayTotal = salesThatDay.reduce((acc, curr) => acc + Number(curr.totalAmount), 0);
                return dayTotal;
            });

            return {
                status: 200,
                message: 'Métricas de crédito calculadas exitosamente',
                data: {
                    pendingAmount: totalDebt,      // $18,500
                    totalDebtors: debtorsCount,    // 84 clientes
                    status: status,                // "Warning"
                    trend: trend,                  // [0, 150, 0, 500...]
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