// Para actualizar una venta (generalmente solo status y remainingBalance)
export interface UpdateSaleInterface {
    status?: 'PENDING' | 'COMPLETED' | 'CANCELLED' | 'REFUNDED';
    remainingBalance?: number; // Actualizar saldo pendiente
    paymentDueDate?: string; // Actualizar fecha de vencimiento - "YYYY-MM-DD"
}
