import { prisma } from '@/configs';
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, subMonths } from 'date-fns';

export class ClientStatsService {

    async getClientDashboardMetrics(businessId: number) {
        try {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);
            const startOfPrevMonth = startOfMonth(subMonths(now, 1));
            const endOfPrevMonth = endOfMonth(subMonths(now, 1));

            const [totalActive, newClientsThisMonth, previousNewClients] = await Promise.all([
                
                // A. KPI Principal: Total de Clientes en la Base de Datos
                prisma.client.count({
                    where: {
                        businessId,
                        // Asumo que tienes un campo para "borrado lógico" o "activo"
                        // Si no tienes 'isActive', usa deletedAt: null
                        isActive: true 
                    }
                }),

                // B. Tendencia: Clientes NUEVOS registrados este mes
                // Esto es lo que alimentará el gráfico (Ritmo de crecimiento)
                prisma.client.findMany({
                    select: { createdAt: true },
                    where: {
                        businessId,
                        createdAt: { gte: startOfCurrentMonth }
                    }
                }),

                // C. Clientes nuevos del mes anterior (para gráfico extendido a inicio de mes)
                prisma.client.findMany({
                    select: { createdAt: true },
                    where: {
                        businessId,
                        createdAt: { gte: startOfPrevMonth, lte: endOfPrevMonth }
                    }
                })
            ]);

            // 2. Lógica de Status
            // Si hay clientes nuevos este mes (> 0), el negocio está creciendo -> 'Good'
            // Si no ha llegado nadie nuevo -> 'Neutral'
            const status = newClientsThisMonth.length > 0 ? 'Good' : 'Neutral';

            // 3. Generar Gráfico (Sparkline: Nuevos clientes por día)
            const daysInMonth = eachDayOfInterval({
                start: startOfCurrentMonth,
                end: now
            });

            let trend = daysInMonth.map(day => {
                return newClientsThisMonth.filter(client => 
                    isSameDay(client.createdAt, day)
                ).length;
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
                    return previousNewClients.filter(client =>
                        isSameDay(client.createdAt, day)
                    ).length;
                });

                trend = [...prevTrend, ...trend];
                previousMonthDays = prevDays.length;
            }

            return {
                status: 200,
                message: 'Métricas de clientes obtenidas exitosamente',
                data: {
                    totalActive,       // 842
                    status,            // "Good"
                    trend,             // [0, 2, 1, 0, 5...] (Clientes nuevos por día)
                    previousMonthDays,
                    label: "Activos Totales"
                }
            };

        } catch (error) {
            console.error('Error en ClientStatsService:', error);

            return { 
                status: 500,
                message: 'Error al obtener métricas de clientes',
                data : {
                    totalActive: 0, status: 'Neutral', trend: [] 
                }
            };
        }
    }
}