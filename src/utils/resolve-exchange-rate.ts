import { prisma } from "@/configs";
import { Prisma, PrismaClient } from "@prisma/client";

// Definimos un tipo unión para aceptar tanto el cliente normal como una transacción
type PrismaTx = PrismaClient | Prisma.TransactionClient;

/**
 * Resuelve la tasa de cambio activa para un negocio basado en su estrategia.
 * Soporta inyección de transacción para mantener consistencia ACID.
 */
export async function resolveBusinessExchangeRate(
    businessId: number, 
    // Por defecto usa la instancia global, pero permite recibir una transacción
    tx: PrismaTx = prisma 
) {

    const dateToday = new Date();
    dateToday.setHours(0, 0, 0, 0); // Normalizamos a medianoche para comparar solo la fecha

    // 1. Buscamos la configuración del negocio
    const business = await tx.business.findUnique({
        where: { id: businessId },
        select: { rateStrategy: true }
    });

    if (!business) {
        throw new Error(`Negocio con ID ${businessId} no encontrado al resolver tasa.`);
    }

    // 2. Determinamos los filtros según la estrategia
    // Usamos variables para mayor claridad en el "Where"
    const isManual = business.rateStrategy === 'MANUAL';
    
    // Si es MANUAL, buscamos por ID del negocio. Si es API, el businessId es null (Global)
    const targetBusinessId = isManual ? businessId : null;
    
    // Si es MANUAL, el source es 'MANUAL'. Si es API, el source es el nombre de la estrategia (ej: 'API_BCV')
    const targetSource = isManual ? 'MANUAL' : business.rateStrategy;

    // 3. Buscamos la tasa activa
    const activeRate = await tx.exchangeRate.findFirst({
        where: {
            businessId: targetBusinessId,
            source: targetSource,
            isActive: true,
            createdAt: { lte: dateToday }
        },
        orderBy: { createdAt: 'desc' } // La más reciente (LIFO)
    });

    if (!activeRate) {
        // Mensaje de error descriptivo para ayudar al soporte técnico
        const strategyName = isManual ? 'Manual' : 'Automática (API)';
        throw new Error(`CRÍTICO: El negocio está configurado en estrategia ${strategyName} pero no se encontró ninguna tasa activa registrada.`);
    }

    return activeRate;
}