import { prisma } from '@/configs';
import { ProductType } from '@prisma/client';
import { stat } from 'node:fs';

export class InventoryStatsService {

    /**
     * Obtiene los KPIs principales para el Dashboard.
     * Calcula: Total Items, Valor Monetario, Cantidad de Productos y Stock Crítico.
     */
    async getDashboardKPIs(businessId: number) {
        try {
            // 1. Ejecutamos las agregaciones en paralelo para máxima velocidad
            const [stockAggregates, productCount, criticalStock] = await Promise.all([
                
                // A. Sumar cantidades y costos de todos los lotes
                prisma.stockLot.aggregate({
                    _sum: {
                        quantity: true,
                        lotCost: true // Asumiendo que guardas el costo total del lote
                    },
                    where: {
                        product: { 
                            businessId,
                            type: ProductType.SIMPLE,  // Ignoramos servicios y combos
                            isActive: true
                        },
                        // Opcional: Solo contar lotes activos/con stock
                        quantity: { gt: 0 } 
                    }
                }),

                // B. Contar productos únicos (SKUs)
                prisma.product.count({
                    where: {
                        businessId,
                        isActive: true,
                        type: ProductType.SIMPLE // Solo productos, no servicios
                    }
                }),

                // C. Calcular Stock Crítico (La Query "Senior" optimizada)
                // Cuenta cuántos productos tienen (suma de lotes) <= (minStock)
                prisma.$queryRaw<[{ count: number }]>`
                    SELECT COUNT(*)::int as count
                    FROM "Product" p
                    LEFT JOIN (
                        SELECT "productId", SUM(quantity) as total_qty
                        FROM "StockLot"
                        GROUP BY "productId"
                    ) sl ON p.id = sl."productId"
                    WHERE p."businessId" = ${businessId}
                    AND p."type" = ${ProductType.SIMPLE}
                    AND p."isActive" = true
                    AND COALESCE(sl.total_qty, 0) <= p."minStock"
                `
            ]);

            // 2. Formateamos la respuesta limpia para el frontend
            return {
                status: 200,
                message: 'KPIs de inventario calculados exitosamente',
                data: {
                    totalItems: stockAggregates._sum.quantity || 0,     // "1,234"
                    inventoryValue: stockAggregates._sum.lotCost || 0,  // "$ Valor"
                    uniqueProducts: productCount,                       // "450"
                    criticalStock: criticalStock[0]?.count || 0         // "5"
                }
            };

        } catch (error) {
            console.error('Error en InventoryStatsService.getDashboardKPIs:', error);

            return {
                status: 500,
                message: 'Error interno en el servidor calculando KPIs de inventario',
                data:{
                    totalItems: 0, inventoryValue: 0, uniqueProducts: 0, criticalStock: 0 
                }
            };
        }
    }
}