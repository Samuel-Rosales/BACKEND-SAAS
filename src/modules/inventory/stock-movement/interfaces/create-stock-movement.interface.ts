import { MovementType } from '@prisma/client';

export interface CreateStockMovementInterface {
    businessId: number;
    productId: number;
    depotId: number;
    targetDepotId?: number; // Para TRANSFER
    
    type: MovementType;
    quantity: number;
    reason?: string;
    date?: Date;
    
    // --- CAMPOS PARA LOTES ---
    lotId?: number;        // <--- NUEVO: Si el usuario selecciona un lote específico (Salidas/Transferencias)
    expirationDate?: Date; // Para Entradas (Creación de Lote)
    unitCost?: number;     // Para Entradas (Valoración)
}

export interface StockOutputResult {
    movement: any; // O el tipo Prisma.StockMovementGetPayload<...>
    sourceMetadata: {
        expirationDate: Date;
        cost: number;
    } | null; // Null si es un ajuste negativo sin lote específico (raro pero posible)
}