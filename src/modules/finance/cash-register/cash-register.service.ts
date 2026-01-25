import { prisma } from '@/configs';
import { CreateCashRegisterInterface, CloseCashRegisterInterface } from './interfaces';
import { CashStatus, CashCountType, PaymentStatus, Currency } from '@prisma/client';
import { BusinessError } from '@/utils/catch-errors.util'; // Asumo que tienes esto
import { Decimal } from '@prisma/client/runtime/client';

export class CashRegisterService {

    // 1. ABRIR CAJA (Con Transacción)
    async open(businessId: number, memberShipId: number, data: CreateCashRegisterInterface) {

        // Verificar miembro y negocio (Validaciones básicas)
        const member = await prisma.businessMember.findFirst({
            where: { id: memberShipId, businessId, isActive: true }
        });

        if (!member) return { status: 404, message: 'Miembro no válido', data: null };

        // A. REGLA DE NEGOCIO: Un miembro no puede tener dos cajas abiertas
        const existingRegister = await prisma.cashRegister.findFirst({
            where: { memberId: memberShipId, status: CashStatus.OPEN }
        });

        if (existingRegister) {
            return { status: 409, message: 'Ya tienes una caja abierta. Debes cerrarla primero.', data: null };
        }

        // B. CREACIÓN ATÓMICA (Caja + Billetes Iniciales)
        try {
            const result = await prisma.$transaction(async (tx) => {
                const register = await tx.cashRegister.create({
                    data: {
                        businessId,
                        memberId: memberShipId,
                        status: CashStatus.OPEN,
                        initialAmount: data.initialAmount || 0,
                        openTime: new Date(),
                        
                        // Si mandan detalle de billetes (Apertura detallada)
                        counts: data.denominations && data.denominations.length > 0 ? {
                            create: data.denominations.map(c => ({
                                denomination: c.denomination,
                                quantity: c.quantity,
                                currency: c.currency,
                                exchangeRateId: c.exchangeRateId,
                                type: CashCountType.INITIAL
                            }))
                        } : undefined
                    },
                    include: { member: { include: { user: { select: { name: true } } } } }
                });
                return register;
            });

            return { status: 201, message: 'Caja abierta exitosamente', data: result };

        } catch (error) {
            console.error('Error open register:', error);
            return { status: 500, message: 'Error interno al abrir caja', data: null };
        }
    }

    // 2. LISTAR CAJAS (Histórico)
    async findAll(businessId: number) {
        try {
            const registers = await prisma.cashRegister.findMany({
                where: { businessId },
                include: {
                    member: { include: { user: { select: { name: true } } } },
                    _count: { select: { payments: true } } // Contamos cuántos pagos recibió
                },
                orderBy: { openTime: 'desc' },
                take: 50 // Paginación recomendada
            });
            return { status: 200, message: 'Histórico obtenido', data: registers };
        } catch (error) {
            return { status: 500, message: 'Error interno', data: null };
        }
    }

    // 3. OBTENER MI CAJA ACTUAL (Dashboard del Cajero)
    async findMyOpenRegister(businessId: number, memberId: number) {
        try {
            const register = await prisma.cashRegister.findFirst({
                where: { businessId, memberId, status: CashStatus.OPEN },
                include: {
                    member: { include: { user: { select: { name: true } } } }
                }
            });

            if (!register) return { status: 404, message: 'No tienes caja abierta', data: null };

            // === AQUI VIENE LA MAGIA DEL SISTEMA ===
            // Calculamos cuánto dinero debería haber según los pagos registrados
            const paymentsGrouped = await prisma.salePayment.groupBy({
                by: ['paymentMethodId'],
                where: { cashRegisterId: register.id },
                _sum: { amount: true }
            });

            // Enriquecemos con nombres de métodos
            const methods = await prisma.paymentMethod.findMany({
                where: { id: { in: paymentsGrouped.map(p => p.paymentMethodId) } }
            });

            const systemTotals = paymentsGrouped.map(pg => {
                const method = methods.find(m => m.id === pg.paymentMethodId);
                return {
                    method: method?.name,
                    type: method?.type, // CASH, ZELLE, ETC
                    currency: method?.currency,
                    total: pg._sum.amount
                };
            });

            return { 
                status: 200, 
                message: 'Estado de caja obtenido', 
                data: {
                    ...register,
                    systemSummary: systemTotals // El frontend usa esto para comparar contra lo físico
                } 
            };

        } catch (error) {
            return { status: 500, message: 'Error interno', data: null };
        }
    }

    // 4. CERRAR CAJA (El Arqueo Final)
    async close(businessId: number, id: number, data: CloseCashRegisterInterface) {
        try {
            const register = await prisma.cashRegister.findFirst({
                where: { id, businessId, status: CashStatus.OPEN }
            });

            if (!register) return { status: 404, message: 'Caja no encontrada o ya cerrada', data: null };

            const result = await prisma.$transaction(async (tx) => {
                
                // A. Guardar la evidencia física (Conteo de billetes)
                if (data.counts && data.counts.length > 0) {
                    await tx.cashCount.createMany({
                        data: data.counts.map(c => ({
                            cashRegisterId: register.id,
                            denomination: c.denomination,
                            quantity: c.quantity,
                            currency: c.currency,
                            exchangeRateId: c.exchangeRateId,
                            type: CashCountType.FINAL
                        }))
                    });
                }

                // B. Cerrar el ciclo
                const updated = await tx.cashRegister.update({
                    where: { id: register.id },
                    data: {
                        status: CashStatus.CLOSED,
                        finalAmount: data.finalAmount, // Total calculado por el front (suma de counts)
                        closeTime: data.closeTime || new Date()
                    }
                });

                return updated;
            });

            return { status: 200, message: 'Caja cerrada correctamente', data: result };

        } catch (error) {
            console.error('Error closing register:', error);
            return { status: 500, message: 'Error al cerrar caja', data: null };
        }
    }
}