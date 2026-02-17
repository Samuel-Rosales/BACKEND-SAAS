import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';
import { startOfMonth, endOfMonth, subMonths, getDaysInMonth, getDate } from 'date-fns';

export class SalesStatsService {

    async getSalesDashboardMetrics(businessId: number) {
        const now = new Date();
        
        // 1. Definir rangos de tiempo (Mes Actual vs Mes Anterior)
        const currentStart = startOfMonth(now);
        const currentEnd = endOfMonth(now);
        const previousStart = startOfMonth(subMonths(now, 1));
        const previousEnd = endOfMonth(subMonths(now, 1));

        try {
            // 2. Ejecutar consultas en Paralelo (Promise.all)
            const [currentMonthStats, previousMonthStats, dailyMovements] = await Promise.all([
                
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
                })
            ]);

            // 3. Procesar los datos (Logica de Negocio)
            
            const currentTotal = new Decimal(currentMonthStats._sum.totalAmount || 0); // Si no hay ventas, aseguramos que sea 0
            const previousTotal = new Decimal(previousMonthStats._sum.totalAmount || 0);

            // Calcular Status: Si vendimos más o igual que el mes pasado a estas alturas (o en total) es 'Good'
            // Puedes ajustar esta lógica. Ej: Si currentTotal > previousTotal
            const status = currentTotal?.gte(previousTotal) ? 'Good' : 'Warning';

            // 4. Generar el Array para el Gráfico (Sparkline)
            // El reto: La DB devuelve ventas sueltas, el gráfico necesita un array de 30/31 puntos (uno por día)
            const daysInCurrentMonth = getDaysInMonth(now);
            
            // Creamos un array lleno de ceros: [0, 0, 0, ... 30 veces]
            const chartData = new Array(daysInCurrentMonth).fill(0);

            // Rellenamos con las ventas reales
            dailyMovements.forEach(sale => {
                const dayOfMonth = getDate(sale.createdAt); // Devuelve 1, 2, ... 31
                // Sumamos al índice correspondiente (dayOfMonth - 1 porque los arrays empiezan en 0)
                // Usamos += porque puede haber varias ventas el mismo día
                chartData[dayOfMonth - 1] += Number(sale.totalAmount);
            });

            // Si estamos a mitad de mes (ej. día 15), es mejor cortar el gráfico hasta hoy
            // para que no se vea una línea plana de ceros hasta el día 31.
            const today = getDate(now);
            const trend = chartData.slice(0, today); 

            return {
                status: 200,
                message: 'Métricas de ventas calculadas exitosamente',
                data: {
                    currentMonthRevenue: currentTotal, // $45,200
                    status: status,                    // "Good" o "Warning"
                    trend: trend                       // [120, 500, 0, 230...]
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

    async getDetailedReport(businessId: number) {
        const now = new Date();
        const currentStart = startOfMonth(now);
        const currentEnd = endOfMonth(now);

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