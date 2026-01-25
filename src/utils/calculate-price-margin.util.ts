import { Decimal } from '@prisma/client/runtime/client';
import { BusinessError } from "./catch-errors.util";

/**
 * Calcula el precio de venta basado en Markup (Ganancia sobre Costo).
 * Utiliza Decimal.js internamente para evitar errores de punto flotante.
 * * @param profitPercentage - El porcentaje (ej: 0.30 para 30%). Puede ser number o Decimal.
 * @param cost - El costo del producto. Puede ser number o Decimal.
 * @returns number - El precio final redondeado a 2 decimales.
 */
export const calculatePriceWithMarkup = (
    profitPercentage: number | Decimal, 
    cost: number | Decimal
): number => {
    
    // 1. Conversión a Decimal (Blindaje)
    // Aceptamos cualquier cosa y la convertimos a un objeto matemático preciso.
    const costDecimal = new Decimal(cost);
    const profitDecimal = new Decimal(profitPercentage);

    // 2. Validaciones (Usando métodos de la librería)
    if (costDecimal.isNegative()) {
        throw new BusinessError("El costo no puede ser negativo.", 400);
    }

    if (profitDecimal.isNegative()) {
        throw new BusinessError("El porcentaje de ganancia no puede ser negativo.", 400);
    }
    
    // Optimización rápida: Si el margen es 0, devolvemos el costo redondeado
    if (profitDecimal.isZero()) {
        return costDecimal.toDecimalPlaces(2).toNumber(); 
    }

    // 3. Cálculo Preciso
    // Fórmula: Costo * (1 + Porcentaje)
    const factor = new Decimal(1).add(profitDecimal); // (1 + 0.30) = 1.30
    const price = costDecimal.mul(factor);            // 100 * 1.30 = 130.00
    
    // 4. Redondeo Financiero
    // Reemplazamos el hack de Math.round((n + EPSILON) * 100) / 100
    // por el método nativo robusto.
    // ROUND_HALF_UP es el estándar comercial (0.5 sube).
    return price.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
};