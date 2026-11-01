import { prisma } from "@/configs";
import { Prisma, PrismaClient } from "@prisma/client";

// Definimos un tipo unión para aceptar tanto el cliente normal como una transacción
type PrismaTx = PrismaClient | Prisma.TransactionClient;

/**
 * Resuelve la tasa de cambio para un negocio basado en su estrategia.
 * Si se especifica targetDate, busca la tasa histórica efectiva para esa fecha (createdAt <= fin del día).
 * Si no se especifica targetDate, devuelve la tasa activa actual.
 * Soporta inyección de transacción para mantener consistencia ACID.
 */
export async function resolveBusinessExchangeRate(
    businessId: number, 
    // Por defecto usa la instancia global, pero permite recibir una transacción
    tx: PrismaTx = prisma,
    targetDate?: Date | string | null
) {

    // 1. Buscamos la configuración del negocio
    const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { rateStrategy: true }
    });

    if (!business) {
        throw new Error(`Negocio con ID ${businessId} no encontrado al resolver tasa.`);
    }

    // 2. Determinamos los filtros según la estrategia
    const isManual = business.rateStrategy === 'MANUAL';
    const targetBusinessId = isManual ? businessId : null;
    const targetSource = isManual ? 'MANUAL' : business.rateStrategy;

    // 3. Si se solicita una fecha histórica específica
    if (targetDate) {
        const dateObj = typeof targetDate === 'string' ? new Date(targetDate) : new Date(targetDate);
        if (!isNaN(dateObj.getTime())) {
            const endOfDay = new Date(dateObj);
            endOfDay.setHours(23, 59, 59, 999);

            // Buscar la tasa más reciente registrada en o antes de targetDate para la estrategia del negocio
            const historicalRate = await tx.exchangeRate.findFirst({
                where: {
                    businessId: targetBusinessId,
                    source: targetSource,
                    createdAt: { lte: endOfDay }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (historicalRate) {
                return historicalRate;
            }

            // Si la fecha solicitada es anterior a la primera tasa registrada para esa estrategia,
            // tomamos la más antigua disponible como mejor aproximación
            const earliestRate = await tx.exchangeRate.findFirst({
                where: {
                    businessId: targetBusinessId,
                    source: targetSource
                },
                orderBy: { createdAt: 'asc' }
            });

            if (earliestRate) {
                return earliestRate;
            }

            // Fallback general por si no hay tasa registrada con ese source específico
            const fallbackHistorical = await tx.exchangeRate.findFirst({
                where: {
                    OR: [
                        { businessId: targetBusinessId },
                        { businessId: null }
                    ],
                    createdAt: { lte: endOfDay }
                },
                orderBy: { createdAt: 'desc' }
            });

            if (fallbackHistorical) {
                return fallbackHistorical;
            }
        }
    }

    // 4. Comportamiento por defecto: buscamos la tasa activa más reciente
    const activeRate = await tx.exchangeRate.findFirst({
        where: {
            businessId: targetBusinessId,
            source: targetSource,
            isActive: true
        },
        orderBy: { createdAt: 'desc' }
    });

    if (activeRate) {
        return activeRate;
    }

    // Respaldo de emergencia si no hay tasa marcada como isActive
    const fallbackRate = await tx.exchangeRate.findFirst({
        where: {
            OR: [
                { businessId: targetBusinessId },
                { businessId: null }
            ]
        },
        orderBy: { createdAt: 'desc' }
    });

    if (!fallbackRate) {
        const strategyName = isManual ? 'Manual' : 'Automática (API)';
        throw new Error(`CRÍTICO: El negocio está configurado en estrategia ${strategyName} pero no se encontró ninguna tasa registrada.`);
    }

    return fallbackRate;
}
