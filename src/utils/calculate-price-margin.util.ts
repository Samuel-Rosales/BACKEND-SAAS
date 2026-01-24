import { BusinessError } from "./catch-errors.util";

/**
 * Calcula el precio de venta basado en el Margen Bruto (Gross Margin).
 * @param marginPercentage - El margen deseado en formato decimal (ej. 0.30 para 30%).
 * @param cost - El costo del producto.
 */
export const calculatePriceWithMargin = (marginPercentage: number, cost: number): number => {
    // 1. Validación de costo
    if (cost < 0) throw new BusinessError("El costo no puede ser negativo.", 400);

    // 2. Validación de margen (Safety check)
    // Nota: Si pasas 30 en lugar de 0.30, esto lanzará error, lo cual es correcto para evitar precios negativos.
    if (marginPercentage >= 1) {
        throw new BusinessError("El margen debe ser menor a 1 (100%). Para 30%, usa 0.30.", 400);
    }
    
    if (marginPercentage <= 0) {
        return cost; 
    }

    // 3. Cálculo
    const price = cost / (1 - marginPercentage);
    
    // 4. Redondeo bancario seguro
    return Math.round((price + Number.EPSILON) * 100) / 100;
};