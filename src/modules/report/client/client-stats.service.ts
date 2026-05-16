import { prisma } from '@/configs';
import { startOfMonth, eachDayOfInterval, isSameDay } from 'date-fns';

export class ClientStatsService {

    async getClientDashboardMetrics(businessId: number) {
        try {
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);

            const [totalActive, newClientsThisMonth] = await Promise.all([
                
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

            const trend = daysInMonth.map(day => {
                // Contamos cuántos se registraron en este día específico
                return newClientsThisMonth.filter(client => 
                    isSameDay(client.createdAt, day)
                ).length;
            });

            return {
                status: 200,
                message: 'Métricas de clientes obtenidas exitosamente',
                data: {
                    totalActive,       // 842
                    status,            // "Good"
                    trend,             // [0, 2, 1, 0, 5...] (Clientes nuevos por día)
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