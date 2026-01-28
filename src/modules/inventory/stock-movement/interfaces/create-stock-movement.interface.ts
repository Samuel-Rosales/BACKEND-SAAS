import { MovementType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export interface CreateStockMovementInterface {
    businessId: number;
    productId: number;
    depotId: number;
    targetDepotId?: number; 
    
    type: MovementType;
    // Aceptamos number (del JSON/Frontend) o Decimal (si viene de otro cálculo interno)
    quantity: number | Decimal; 
    
    reason?: string;
    date?: Date;
    
    // --- CAMPOS PARA LOTES ---
    lotId?: number;        
    expirationDate?: Date; 
    unitCost?: number | Decimal; // El dinero siempre debe estar listo para ser Decimal
}

export interface StockOutputResult {
    movement: any; 
    sourceMetadata: {
        expirationDate: Date;
        // Aquí es ESTRICTO: Cuando leemos de la BD, Prisma nos devuelve un Objeto Decimal
        cost: Decimal; 
    } | null; 
}

export interface FindMovementsQuery {
    page?: number;
    limit?: number;
    search?: string;    
    type?: string;      
    depotId?: number;    
    productId?: number;  
    startDate?: string;  
    endDate?: string;
}