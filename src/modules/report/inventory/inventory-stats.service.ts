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
            const [stockTotals, productCount, criticalStock] = await Promise.all([
                
                // A. Total de items y valor del inventario (cantidad × costo unitario maestro)
                prisma.$queryRaw<[{ total_quantity: number; inventory_value: number }]>`
                    SELECT
                        COALESCE(SUM(sl.quantity), 0)::numeric as total_quantity,
                        COALESCE(SUM(sl.quantity * p."costPrice"), 0)::numeric as inventory_value
                    FROM "StockLot" sl
                    INNER JOIN "Product" p ON sl."productId" = p.id
                    WHERE p."businessId" = ${businessId}
                    AND p."type" = ${ProductType.SIMPLE}
                    AND p."isActive" = true
                    AND sl.quantity > 0
                `,

                // B. Contar productos únicos (SKUs)
                prisma.product.count({
                    where: {
                        businessId,
                        isActive: true,
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
                    totalItems: Number(stockTotals[0]?.total_quantity || 0),     // "1,234"
                    inventoryValue: Number(stockTotals[0]?.inventory_value || 0),  // "$ Valor"
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