export interface DispatchItemInput {
    productId: number;
    quantity: number;
    unitCost?: number;
}

export interface CreateDispatchDto {
    destinationBusinessId: number | string;
    originDepotId: number;
    notes?: string;
    items: DispatchItemInput[];
}

export interface ReceiveTransferItemInput {
    itemId: number;
    quantityReceived: number; // Conforme (entra a inventario)
    quantityDamaged?: number;  // Averiado / Dañado (no entra a inventario, se registra para reclamo)
    quantityMissing?: number;  // Faltante (no entra a inventario)
    damagedReason?: string;    // Explicación técnica de la falla / rotura
}

export interface ReceiveTransferDto {
    destinationDepotId: number;
    notes?: string;
    items: ReceiveTransferItemInput[];
}
