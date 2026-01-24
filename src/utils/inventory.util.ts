import { prisma } from "@/configs";
import { Prisma, PrismaClient } from "@prisma/client";
import { calculatePriceWithMargin } from "./calculate-price-margin.util";

type PrismaTx = Prisma.TransactionClient;
/**
 * Actualiza en cascada los costos de los productos compuestos (Recetas).
 * Se llama cuando cambia el costo de un insumo.
 * * @param tx - La transacción actual (OBLIGATORIO para consistencia de datos)
 * @param productId - El ID del producto que acaba de cambiar de precio (Hijo)
 */
export async function updateRecursiveRecipeCosts(tx: PrismaTx = prisma, productId: number) {
    
    // 1. BUSCAR PADRES: ¿Quién usa este producto como ingrediente?
    // Esto es lo primero que debemos hacer. Si nadie lo usa, terminamos.
    const parents = await tx.productComponent.findMany({
        where: { childProductId: productId },
        select: { parentProductId: true }
    });

    if (parents.length === 0) return; // Caso base: Nadie usa este producto

    // 2. RECORRER PADRES (Las Recetas que se vieron afectadas)
    for (const relation of parents) {
        const parentId = relation.parentProductId;

        // A. Traemos la receta completa del Padre para recalcularlo
        const parentProduct = await tx.product.findUnique({
            where: { id: parentId },
            include: { 
                components: { 
                    include: { child: true } // Necesitamos el costo actual de cada hijo
                } 
            }
        });

        if (!parentProduct || parentProduct.components.length === 0) continue;

        // B. Recálculo Matemático (Sumatoria de Costo * Cantidad)
        let newTotalCost = 0;
        
        for (const component of parentProduct.components) {
            // Formula: Costo Insumo * Cantidad en Receta
            const componentCost = Number(component.child.costPrice) * Number(component.quantity);
            newTotalCost += componentCost;
        }

        // C. Actualizar al Padre
        // Solo escribimos en BD si el costo cambió para evitar spam en los logs
        if (Math.abs(Number(parentProduct.costPrice) - newTotalCost) > 0.001) {
            
            console.log(`[COSTOS] Actualizando ${parentProduct.name}: ${parentProduct.costPrice} -> ${newTotalCost}`);

            await tx.product.update({
                where: { id: parentId },
                data: { 
                    costPrice: newTotalCost,
                    // Opcional: Si quieres actualizar precio de venta automáticamente manteniendo el margen
                    salePrice: calculatePriceWithMargin(Number(parentProduct.profitMargin), newTotalCost)
                }
            });

            // D. RECURSIVIDAD (Nivel Dios)
            // Ahora el Padre (ej: Salsa Boloñesa) ha cambiado de precio.
            // Debemos avisar a sus propios padres (ej: Pasticho) que actualicen.
            await updateRecursiveRecipeCosts(tx, parentId);
        }
    }
}