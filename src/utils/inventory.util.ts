import { prisma } from "@/configs";
import { Prisma } from "@prisma/client";
import { Decimal } from '@prisma/client/runtime/client';
import { calculatePriceWithMarkup } from "./calculate-price-margin.util";

type PrismaTx = Prisma.TransactionClient;

export async function updateRecursiveRecipeCosts(tx: PrismaTx = prisma, productId: number) {
    
    // 1. BUSCAR PADRES
    const parents = await tx.productComponent.findMany({
        where: { childProductId: productId },
        select: { parentProductId: true }
    });

    if (parents.length === 0) return;

    // 2. RECORRER PADRES
    for (const relation of parents) {
        const parentId = relation.parentProductId;

        const parentProduct = await tx.product.findUnique({
            where: { id: parentId },
            include: { 
                components: { 
                    include: { child: true } 
                } 
            }
        });

        if (!parentProduct || parentProduct.components.length === 0) continue;

        // B. Recálculo Matemático (USANDO DECIMAL) 🧮
        // Inicializamos en 0 modo Decimal
        let newTotalCost = new Decimal(0);
        
        for (const component of parentProduct.components) {
            // Prisma ya devuelve estos valores como Decimal, pero por seguridad instanciamos
            const cost = new Decimal(component.child.costPrice); 
            const qty = new Decimal(component.quantity);

            // Operación: Costo * Cantidad
            // .add() = Sumar
            // .mul() = Multiplicar
            newTotalCost = newTotalCost.add(cost.mul(qty));
        }

        // C. Verificar cambio (Diff > 0.001)
        // Usamos .sub() para restar y .abs() para valor absoluto
        const currentCost = new Decimal(parentProduct.costPrice);
        const difference = currentCost.sub(newTotalCost).abs();

        // Comparamos con un Decimal(0.001)
        if (difference.gt(new Decimal(0.001))) {
            
            //console.log(`[COSTOS] Actualizando ${parentProduct.name}: ${currentCost} -> ${newTotalCost}`);

            // NOTA: Para tu utilidad de precio de venta, convertimos a Number
            // porque esa función matemática simple trabaja con JS nativo.
            const newSalePrice = calculatePriceWithMarkup(
                Number(parentProduct.profitMargin), 
                newTotalCost.toNumber() // <--- Conversión segura solo para UI/Venta
            );

            await tx.product.update({
                where: { id: parentId },
                data: { 
                    costPrice: newTotalCost, // Prisma acepta el objeto Decimal directo
                    salePrice: newSalePrice
                }
            });

            // D. RECURSIVIDAD
            await updateRecursiveRecipeCosts(tx, parentId);
        }
    }
}