import { prisma } from '@/configs';
import { BusinessError } from '@/utils/catch-errors.util';
import { CreateCreditNoteInterface, ItemProcessingData, ListCreditNoteQuery } from './interfaces';
import { InstallmentStatus, MovementType, ProductType, SaleStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export class CreditNoteService {

    async create(businessId: number, memberId: number, data: CreateCreditNoteInterface) {
        
        const result = await prisma.$transaction(async (tx) => {

            // 🔒 RE-CHECK DE SEGURIDAD (ANTI-RACE CONDITION)
            // Buscamos la venta de nuevo DENTRO de la transacción para bloquear la fila
            // y tener el saldo 'remainingBalance' más actual posible.
            const currentSale = await tx.sale.findUniqueOrThrow({ 
                where: { id: data.saleId, businessId },
                    include: {
                    items: { include: { lotAllocations: true, product: true } },
                    creditNotes: { include: { items: true } } // Traemos historial ACTUALIZADO
                } 
            });

            if (!currentSale) throw new BusinessError('Venta no encontrada', 404);
            if (currentSale.status === SaleStatus.CANCELLED) throw new BusinessError('No se puede generar nota de crédito sobre una venta anulada', 400);

            // ------------------------------------------------------------------
            // PASO 2: PRE-CÁLCULO Y VALIDACIONES (EN MEMORIA)
            // ------------------------------------------------------------------
            let totalRefundAmount = new Decimal(0);
            const itemsToProcess: ItemProcessingData[] = [];

            for (const requestItem of data.items) {
                
                // A. Buscar el item en la venta original
                const originalSaleItem = currentSale.items.find(i => i.productId === requestItem.productId);

                if (!originalSaleItem) {
                    throw new BusinessError(`El producto ID ${requestItem.productId} no pertenece a esta venta`, 400);
                }

                // B. Calcular cuánto se ha devuelto ya (Historial)
                const previouslyReturned = currentSale.creditNotes.reduce((acc, cn) => {

                    const item = cn.items.find(i => i.productId === requestItem.productId);

                    return acc.add(item ? item.quantity : 0);

                }, new Decimal(0));

                // Cantidad original - Lo ya devuelto = Lo que queda disponible para devolver
                const maxReturnable = new Decimal(originalSaleItem.quantity).sub(previouslyReturned);

                if (new Decimal(requestItem.quantity).gt(maxReturnable)) {
                    throw new BusinessError(
                        `Cantidad excedida para '${originalSaleItem.product.name}'. Compraste: ${originalSaleItem.quantity}, Ya devolviste: ${previouslyReturned}. Intentas devolver: ${requestItem.quantity}`, 
                        400
                    );
                }

                // C. Calcular Dinero a devolver (Precio Original * Cantidad Actual)
                const refundLineAmount = new Decimal(originalSaleItem.unitPrice).mul(requestItem.quantity);
                totalRefundAmount = totalRefundAmount.add(refundLineAmount);

                // D. Calcular FACTOR DE PROPORCIÓN (Ratio)
                // Si vendí 10 y devuelvo 2, el ratio es 0.2.
                // Usaremos esto para devolver el 20% de los ingredientes exactos que salieron.
                const returnRatio = new Decimal(requestItem.quantity).div(originalSaleItem.quantity);

                itemsToProcess.push({
                    originalItem: originalSaleItem,
                    quantityToReturn: new Decimal(requestItem.quantity),
                    refundAmount: refundLineAmount,
                    ratio: returnRatio,
                    returnToStock: requestItem.returnToStock // Pasamos la decisión al siguiente paso
                });
            }

            // A. CREAR LA NOTA DE CRÉDITO (DOCUMENTO)
            const nextNumber = (await tx.creditNote.count({ where: { businessId } })) + 1;

            const creditNote = await tx.creditNote.create({
                data: {
                    businessId,
                    saleId: currentSale.id,
                    number: nextNumber,
                    reason: data.reason,
                    totalAmount: totalRefundAmount,
                    items: {
                        create: itemsToProcess.map(i => ({
                            productId: i.originalItem.productId,
                            quantity: i.quantityToReturn,
                            unitPrice: i.originalItem.unitPrice,
                            subTotal: i.refundAmount,
                            returnToStock: i.returnToStock // Guardamos la decisión para auditoría
                        }))
                    }
                }
            });

            // B. RESTAURAR INVENTARIO (Solo si returnToStock === true)
            for (const item of itemsToProcess) {
                
                // Si es un servicio, no inventariable, ignoramos stock.
                if (item.originalItem.product.type === ProductType.SERVICE) continue;

                // SI ESTÁ DAÑADO (COMIDA, ROTO), NO TOCAMOS EL STOCK FÍSICO.
                // El dinero se devuelve (abajo), pero el producto muere aquí.
                if (!item.returnToStock) {
                    // Opcional: Podrías registrar un movimiento de "MERMA" en Kardex con cantidad negativa o cero
                    // solo para dejar constancia, pero sin afectar 'StockLot'.
                    continue; 
                }

                // SI ESTÁ BUENO, LO DEVOLVEMOS A SUS LOTES ORIGINALES
                // Esto maneja Productos Simples y Recetas (Compuestos) por igual
                if (item.originalItem.lotAllocations.length > 0) {
                    
                    for (const allocation of item.originalItem.lotAllocations) {
                        
                        // Calculamos cuánto devolver de este ingrediente/lote
                        // Ejemplo: Si la Hamburguesa usó 0.2kg de carne y devuelvo media hamburguesa (ratio 0.5)
                        // Devuelvo 0.1kg de carne.
                        const qtyToRestore = new Decimal(allocation.quantity).mul(item.ratio);

                        // 1. Devolver al Lote Original
                        // Nota: Si el lote no existe (raro), fallará. Deberías manejar ese caso si borras lotes.
                        await tx.stockLot.update({
                            where: { id: allocation.stockLotId },
                            data: { quantity: { increment: qtyToRestore } }
                        });

                        // 2. Obtener datos del lote para el Kardex
                        const lotInfo = await tx.stockLot.findUnique({ 
                            where: { id: allocation.stockLotId } 
                        });

                        // 3. Registrar Entrada en Kardex
                        if (lotInfo) {
                            await tx.stockMovement.create({
                                data: {
                                    businessId,
                                    memberId,
                                    productId: lotInfo.productId, // ID del ingrediente real
                                    depotId: lotInfo.depotId,
                                    type: MovementType.IN,
                                    quantity: qtyToRestore,
                                    historicalCost: lotInfo.lotCost,
                                    reason: `Devolución NC #${nextNumber} (Restock)`
                                }
                            });
                        }
                    }
                }
            }

            let amountAppliedToDebt = new Decimal(0);
            let amountToReturnCash = new Decimal(0);

            // 1. Lógica de Distribución (ESTO ESTÁ PERFECTO)
            if (currentSale.remainingBalance.gt(0)) {
                if (totalRefundAmount.gte(currentSale.remainingBalance)) {
                    // Mata la deuda, sobra dinero
                    amountAppliedToDebt = currentSale.remainingBalance;
                    amountToReturnCash = totalRefundAmount.sub(currentSale.remainingBalance);
                } else {
                    // Baja la deuda, no sobra nada
                    amountAppliedToDebt = totalRefundAmount;
                    amountToReturnCash = new Decimal(0);
                }
            } else {
                // Venta de contado
                amountAppliedToDebt = new Decimal(0);
                amountToReturnCash = totalRefundAmount;
            }

            // 2. Ejecutar Actualizaciones (AQUÍ ESTÁ LA MEJORA)
            if (amountAppliedToDebt.gt(0)) {
                
                // Calculamos el nuevo saldo en memoria para saber si quedó en cero
                const newBalance = currentSale.remainingBalance.sub(amountAppliedToDebt);
                
                // Definimos si el estatus cambia a PAGADO
                // Usamos un EPSILON pequeño por seguridad con flotantes, aunque Decimal es preciso
                const isFullyPaid = newBalance.lte(0.005); 

                // A. Actualizar Venta (Saldo y Estatus)
                await tx.sale.update({
                    where: { id: currentSale.id },
                    data: { 
                        remainingBalance: { decrement: amountAppliedToDebt },
                        // Si ya no debe nada, actualizamos el estatus visual
                        paymentStatus: isFullyPaid ? 'PAID' : undefined 
                    }
                });

                // B. Actualizar Deuda Global del Cliente
                await tx.client.update({
                    where: { id: currentSale.clientId },
                    data: { currentDebt: { decrement: amountAppliedToDebt } }
                });
                
                // C. SINCRONIZACIÓN DE CUOTAS (ROBUSTO) ✅
                // Estrategia: FIFO (First In, First Out). 
                // El saldo a favor mata primero las cuotas más viejas o próximas a vencer.
                
                // 1. Buscamos solo las cuotas que NO están pagadas totalmente
                const pendingInstallments = await tx.saleInstallment.findMany({
                    where: { 
                        saleId: currentSale.id, 
                        status: { not: 'PAID' } // Ignoramos las que ya están listas
                    },
                    orderBy: { dueDate: 'asc' } // Importante: Pagar la más antigua primero
                });

                // Variable temporal para ir descontando el saldo a favor disponible
                let remainingCreditToApply = new Decimal(amountAppliedToDebt);

                for (const installment of pendingInstallments) {
                    
                    // Si ya se nos acabó el crédito de la devolución, paramos el bucle
                    if (remainingCreditToApply.lte(0)) break;

                    // Calculamos cuánto le falta a ESTA cuota para estar pagada
                    const amountMissing = installment.amount.sub(installment.amountPaid);

                    // Determinamos cuánto vamos a abonar a esta cuota específica
                    let paymentForThisInstallment = new Decimal(0);
                    let newStatus: InstallmentStatus = installment.status; // Mantener estado actual por defecto
                    let setPaidAt = false;

                    if (remainingCreditToApply.gte(amountMissing)) {
                        // ESCENARIO 1: Nos alcanza para matar esta cuota completa
                        paymentForThisInstallment = amountMissing;
                        newStatus = 'PAID';
                        setPaidAt = true;
                    } else {
                        // ESCENARIO 2: Solo nos alcanza para abonar una parte (Parcial)
                        paymentForThisInstallment = remainingCreditToApply;
                        newStatus = 'PARTIAL'; // Si estaba PENDING, pasa a PARTIAL
                    }

                    // Ejecutar el update en la BD
                    await tx.saleInstallment.update({
                        where: { id: installment.id },
                        data: {
                            // Sumamos lo que ya tenía pagado + el abono de la devolución
                            amountPaid: { increment: paymentForThisInstallment },
                            status: newStatus,
                            // Solo marcamos fecha de pago si se completó al 100%
                            paidAt: setPaidAt ? new Date() : installment.paidAt
                        }
                    });

                    // Restamos lo usado de nuestra "billetera" virtual de crédito
                    remainingCreditToApply = remainingCreditToApply.sub(paymentForThisInstallment);
                }

                // VALIDACIÓN DE INTEGRIDAD (Opcional pero recomendada)
                // Si sobró crédito después de pagar TODAS las cuotas, algo raro pasó con la data original.
                // (Normalmente esto no debería pasar si currentSale.remainingBalance estaba bien calculado).
                if (remainingCreditToApply.gt(0.01)) {
                    console.warn(`[CreditNote Warning] Sobró crédito ($${remainingCreditToApply}) después de liquidar todas las cuotas de la venta #${currentSale.id}`);
                }
            }

            if (amountToReturnCash.gt(0)) {
                
                const incomingPayments = data.refundPayments || [];
                let totalPaidInBaseCurrency = new Decimal(0); // Acumulador en USD

                // 🛠️ 1. OBTENER TASA DEL DÍA (CRÍTICO)
                // Buscamos la tasa activa para el negocio en este momento exacto.
                // Asumimos que tienes una función o query para esto.
                const currentExchangeRate = await tx.exchangeRate.findFirstOrThrow({
                    where: { businessId, isActive: true },
                    orderBy: { createdAt: 'desc' }
                });

                // Validar que la tasa no sea cero para evitar divisiones infinitas
                if (new Decimal(currentExchangeRate.rate).equals(0)) {
                    throw new BusinessError('Error crítico: La tasa de cambio actual es 0.', 500);
                }

                // 🛠️ 2. PRE-PROCESAMIENTO Y VALIDACIÓN (CONVERSIÓN)
                for (const payment of incomingPayments) {
                    
                    const method = await tx.paymentMethod.findUniqueOrThrow({ 
                        where: { id: payment.paymentMethodId } 
                    });

                    const paymentAmount = new Decimal(payment.amount);
                    let valueInUsd = new Decimal(0);

                    // APLICAMOS TU LÓGICA DE CONVERSIÓN AQUÍ
                    if (method.currency === 'USD') {
                        // Si es USD, entra directo
                        valueInUsd = paymentAmount;
                    } else {
                        // Si es Bs (o cualquier otra), dividimos entre la tasa del día
                        valueInUsd = paymentAmount.div(currentExchangeRate.rate);
                    }

                    totalPaidInBaseCurrency = totalPaidInBaseCurrency.add(valueInUsd);
                }

                // 🛠️ 3. VALIDACIÓN DE TOTALES (AHORA SÍ EN USD vs USD)
                // Usamos una pequeña tolerancia (EPSILON) por errores de redondeo en división
                const EPSILON = new Decimal(0.01);
                const diff = totalPaidInBaseCurrency.sub(amountToReturnCash).abs();

                if (diff.gt(EPSILON)) {
                    throw new BusinessError(
                        `Monto incorrecto. Debes devolver $${amountToReturnCash.toFixed(2)}. ` +
                        `Los pagos ingresados suman $${totalPaidInBaseCurrency.toFixed(2)} (al cambio de hoy).`, 
                        400
                    );
                }

                // 🛠️ 4. GUARDADO EN BASE DE DATOS
                for (const payment of incomingPayments) {
                    
                    const method = await tx.paymentMethod.findUniqueOrThrow({ 
                        where: { id: payment.paymentMethodId } 
                    });

                    const affectedCashRegisterId = method.type === 'CASH' 
                        ? payment.cashRegisterId 
                        : null;

                    if (method.type === 'CASH' && !affectedCashRegisterId) {
                        throw new BusinessError("Se requiere caja abierta para efectivo", 400);
                    }

                    // Determinamos qué ID de tasa guardar
                    // Si pagó en USD, a veces se guarda la tasa null o la tasa 1:1, 
                    // pero si pagó en Bs, ES OBLIGATORIO guardar 'currentExchangeRate.id'
                    const rateIdToSave = method.currency !== 'USD' ? currentExchangeRate.id : currentExchangeRate.id; 

                    await tx.creditNotePayment.create({
                        data: {
                            creditNoteId: creditNote.id,
                            paymentMethodId: method.id,
                            
                            // Guardamos el monto ORIGINAL (Ej: 500 Bs) para que el recibo sea fiel
                            amount: new Decimal(payment.amount), 
                            
                            // Guardamos la tasa usada para auditoría futura
                            exchangeRateId: rateIdToSave, 

                            reference: payment.reference,
                            cashRegisterId: affectedCashRegisterId
                        }
                    });
                }
            }

            const paymentSummary = (data.refundPayments || [])
                .map(p => {
                    // Nota: Aquí no tenemos el nombre del método a mano (está en DB), 
                    // pero podrías pasarlo desde el front o hacer un query rápido si es vital.
                    // Por ahora, mostramos el monto.
                    return `$${new Decimal(p.amount).toFixed(2)}`; 
                })
                .join(' + ');

            // 3. Retornar un objeto enriquecido con instrucciones para el Cajero
            return {
                creditNote, 
                financialAction: {
                    action: amountToReturnCash.gt(0) ? 'REFUND' : 'ADJUST_DEBT',
                    totalRefunded: totalRefundAmount,
                    
                    // Desglose
                    appliedToDebt: amountAppliedToDebt,
                    totalReturnedToCustomer: amountToReturnCash,
                    
                    // Mensaje Inteligente
                    message: amountToReturnCash.gt(0) 
                        ? `Devolución procesada: ${paymentSummary} (Revise métodos de pago)` 
                        : `Se ajustó la deuda del cliente en $${amountAppliedToDebt.toFixed(2)}`
                }
            };
        });

        return { 
            status: 201, 
            message: 'Nota de crédito procesada exitosamente', 
            data: result 
        };
    }

    async findAll(businessId: number, query: ListCreditNoteQuery) {
        
        // 1. Configuración de Paginación
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 20;
        const skip = (page - 1) * limit;

        // 2. Construcción del Filtro (Where Dinámico)
        // Empezamos asegurando que sea del negocio actual (Seguridad)
        const where: any = {
            businessId,
        };

        // Filtro por Fechas
        if (query.fromDate && query.toDate) {
            where.createdAt = {
                gte: new Date(new Date(query.fromDate).setHours(0, 0, 0, 0)), // Inicio del día
                lte: new Date(new Date(query.toDate).setHours(23, 59, 59, 999)) // Fin del día
            };
        }

        // Filtro por Cliente (Relación anidada: CreditNote -> Sale -> Client)
        if (query.clientId) {
            where.sale = { clientId: Number(query.clientId) };
        }

        // Filtro por Venta Específica
        if (query.saleId) {
            where.saleId = Number(query.saleId);
        }

        // Búsqueda Flexible (Por motivo o número consecutivo)
        if (query.search) {
            const isNumber = !isNaN(Number(query.search));
            where.OR = [
                { reason: { contains: query.search, mode: 'insensitive' } },
                // Si es número, buscamos por el consecutivo
                ...(isNumber ? [{ number: Number(query.search) }] : [])
            ];
        }

        try {
            // 3. Ejecución Optimizada (Transaction: Count + Data)
            // Hacemos las dos consultas en paralelo para velocidad
            const [total, creditNotes] = await prisma.$transaction([
                prisma.creditNote.count({ where }),
                prisma.creditNote.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { number: 'desc' }, // Las más recientes primero
                    include: {
                        // Incluimos solo datos relevantes para la tabla
                        sale: {
                            select: {
                                id: true,
                                receiptNumber: true, // "Factura #105"
                                client: {
                                    select: {
                                        id: true,
                                        name: true, // "Juan Perez"
                                        ci: true
                                    }
                                }
                            }
                        },
                        // Opcional: Si quieres mostrar cuántos items tiene
                        _count: {
                            select: { items: true }
                        }
                    }
                })
            ]);

            // 4. Retorno con Metadatos de Paginación
            return {
                status: 200,
                message: 'Listado obtenido correctamente',
                data: {
                    data: creditNotes,
                    meta: {
                        total,
                        page,
                        limit,
                        totalPages: Math.ceil(total / limit)
                    }
                }
            };

        } catch (error) {
            console.error('Error listing credit notes:', error);
            return { status: 500, message: 'Error interno al listar notas', data: null };
        }
    }
}