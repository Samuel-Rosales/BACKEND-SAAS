import { prisma } from '@/configs';
import { BusinessError } from '@/utils/catch-errors.util';
import { computeClientDebt } from '@/utils';
import { CreateCreditNoteInterface, ItemProcessingData, ListCreditNoteQuery } from './interfaces';
import { MovementType, ProductType, SaleStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export class CreditNoteService {

    async create(businessId: number, memberId: number, data: CreateCreditNoteInterface) {
        return await prisma.$transaction(async (tx) => {
            
            // ------------------------------------------------------------------
            // PASO 1: OBTENCIÓN DE DATOS OPTIMIZADA (EAGER LOADING INTELIGENTE)
            // ------------------------------------------------------------------
            const currentSale = await tx.sale.findUniqueOrThrow({
                where: { id: data.saleId, businessId },
                include: {
                    items: {
                        include: {
                            product: true,
                            // 🔥 OPTIMIZACIÓN: Traemos el StockLot anidado para tener el costo y depotId
                            // y evitar consultas N+1 durante el bucle de inventario.
                            lotAllocations: {
                                include: {
                                    stockLot: true
                                }
                            }
                        }
                    },
                    // Solo necesitamos items para calcular cantidades devueltas
                    creditNotes: {
                        include: { items: true } 
                    }
                }
            });

            type CurrentSaleItem = (typeof currentSale.items)[number];
            type ItemProcessingDataFromQuery = Omit<ItemProcessingData, 'originalItem'> & {
                originalItem: CurrentSaleItem;
            };

            if (currentSale.status === SaleStatus.CANCELLED) {
                throw new BusinessError('No se puede generar nota de crédito sobre una venta anulada', 400);
            }

            // ------------------------------------------------------------------
            // PASO 2: PRE-CÁLCULO DE HISTORIAL (OPTIMIZACIÓN O(1))
            // ------------------------------------------------------------------
            // Creamos un mapa: ProductID -> Cantidad ya devuelta.
            // Esto evita recorrer todo el array de creditNotes por cada item del request.
            const returnedMap = new Map<number, Decimal>();

            for (const cn of currentSale.creditNotes) {
                for (const item of cn.items) {
                    const current = returnedMap.get(item.productId) || new Decimal(0);
                    returnedMap.set(item.productId, current.add(item.quantity));
                }
            }

            // ------------------------------------------------------------------
            // PASO 3: PROCESAMIENTO DE ITEMS Y VALIDACIONES
            // ------------------------------------------------------------------
            let totalRefundAmount = new Decimal(0);
            const itemsToProcess: ItemProcessingDataFromQuery[] = [];

            for (const requestItem of data.items) {
                const originalSaleItem = currentSale.items.find(i => i.productId === requestItem.productId);

                if (!originalSaleItem) {
                    throw new BusinessError(`El producto ID ${requestItem.productId} no pertenece a esta venta`, 400);
                }

                const previouslyReturned = returnedMap.get(requestItem.productId) || new Decimal(0);
                const maxReturnable = new Decimal(originalSaleItem.quantity).sub(previouslyReturned);
                const qtyToReturn = new Decimal(requestItem.quantity);

                // Validación de cantidad con tolerancia mínima para decimales flotantes
                if (qtyToReturn.gt(maxReturnable.add(0.000001))) {
                    throw new BusinessError(
                        `Cantidad excedida para '${originalSaleItem.product.name}'. Max disponible: ${maxReturnable.toFixed(2)}`,
                        400
                    );
                }

                // Cálculos financieros
                const refundLineAmount = new Decimal(originalSaleItem.unitPrice).mul(qtyToReturn);
                totalRefundAmount = totalRefundAmount.add(refundLineAmount);

                // Cálculo del ratio para prorrateo de lotes
                // Si la cantidad original es 0 (raro), evitamos división por cero
                const originalQty = new Decimal(originalSaleItem.quantity);
                const returnRatio = originalQty.isZero() ? new Decimal(0) : qtyToReturn.div(originalQty);

                itemsToProcess.push({
                    originalItem: originalSaleItem,
                    quantityToReturn: qtyToReturn,
                    refundAmount: refundLineAmount,
                    ratio: returnRatio,
                    returnToStock: requestItem.returnToStock
                });
            }

            // ------------------------------------------------------------------
            // PASO 4: CREACIÓN DEL DOCUMENTO
            // ------------------------------------------------------------------
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
                            returnToStock: i.returnToStock
                        }))
                    }
                }
            });

            // ------------------------------------------------------------------
            // PASO 5: RESTAURACIÓN DE INVENTARIO (BATCH OPTIMIZADO)
            // ------------------------------------------------------------------
            // Agrupamos las promesas de stock para ejecutarlas en paralelo donde sea posible
            // o secuencialmente pero sin lecturas extra.
            
            for (const item of itemsToProcess) {
                // Filtros rápidos
                if (!item.returnToStock) continue;
                if (item.originalItem.product.type === ProductType.SERVICE) continue;
                if (item.originalItem.lotAllocations.length === 0) continue;

                for (const allocation of item.originalItem.lotAllocations) {
                    const qtyToRestore = new Decimal(allocation.quantity).mul(item.ratio);
                    
                    // Solo procedemos si hay algo que restaurar (> 0)
                    if (qtyToRestore.lte(0)) continue;

                    // 1. Restaurar Stock Físico
                    await tx.stockLot.update({
                        where: { id: allocation.stockLotId },
                        data: { quantity: { increment: qtyToRestore } }
                    });

                    // 2. Kardex (Usamos los datos que YA TRAJIMOS en el Paso 1)
                    // No hace falta hacer 'await tx.stockLot.findUnique' de nuevo.
                    const lotInfo = allocation.stockLot; 

                    if (lotInfo) {
                        await tx.stockMovement.create({
                            data: {
                                businessId,
                                memberId,
                                productId: lotInfo.productId,
                                depotId: lotInfo.depotId, // Usamos el depot del lote
                                type: MovementType.IN,
                                quantity: qtyToRestore,
                                historicalCost: lotInfo.lotCost, // Costo histórico del lote
                                reason: `Devolución NC #${nextNumber}`,
                                stockLotId: lotInfo.id // Vinculamos al lote
                            }
                        });
                    }
                }
            }

            // ------------------------------------------------------------------
            // PASO 6: LÓGICA FINANCIERA (DISTRIBUCIÓN DE SALDOS)
            // ------------------------------------------------------------------
            let amountAppliedToDebt = new Decimal(0);
            let amountToReturnCash = new Decimal(0);
            const currentDebt = new Decimal(currentSale.remainingBalance);

            if (currentDebt.gt(0)) {
                if (totalRefundAmount.gte(currentDebt)) {
                    amountAppliedToDebt = currentDebt;
                    amountToReturnCash = totalRefundAmount.sub(currentDebt);
                } else {
                    amountAppliedToDebt = totalRefundAmount;
                    amountToReturnCash = new Decimal(0);
                }
            } else {
                amountAppliedToDebt = new Decimal(0);
                amountToReturnCash = totalRefundAmount;
            }

            // ------------------------------------------------------------------
            // PASO 7: ACTUALIZACIONES DE DEUDA Y CUOTAS
            // ------------------------------------------------------------------
            if (amountAppliedToDebt.gt(0)) {
                const newBalance = currentDebt.sub(amountAppliedToDebt);
                const isFullyPaid = newBalance.lte(0.01);

                // Ejecutamos actualizaciones independientes en paralelo
                await Promise.all([
                    // A. Actualizar Venta
                    tx.sale.update({
                        where: { id: currentSale.id },
                        data: {
                            remainingBalance: { decrement: amountAppliedToDebt },
                            paymentStatus: isFullyPaid ? 'PAID' : undefined
                        }
                    }),
                    // B. Actualizar Cliente
                    tx.client.update({
                        where: { id: currentSale.clientId },
                        data: { currentDebt: { decrement: amountAppliedToDebt } }
                    })
                ]);

                // C. Sincronización de Cuotas (FIFO)
                const pendingInstallments = await tx.saleInstallment.findMany({
                    where: { saleId: currentSale.id, status: { not: 'PAID' } },
                    orderBy: { dueDate: 'asc' }
                });

                let remainingCredit = new Decimal(amountAppliedToDebt);

                for (const installment of pendingInstallments) {
                    if (remainingCredit.lte(0)) break;

                    const amountMissing = new Decimal(installment.amount).sub(installment.amountPaid);
                    let paymentForThis = new Decimal(0);
                    let newStatus = installment.status;
                    let setPaidAt = false;

                    if (remainingCredit.gte(amountMissing)) {
                        paymentForThis = amountMissing;
                        newStatus = 'PAID';
                        setPaidAt = true;
                    } else {
                        paymentForThis = remainingCredit;
                        newStatus = 'PARTIAL';
                    }

                    await tx.saleInstallment.update({
                        where: { id: installment.id },
                        data: {
                            amountPaid: { increment: paymentForThis },
                            status: newStatus,
                            paidAt: setPaidAt ? new Date() : undefined
                        }
                    });

                    remainingCredit = remainingCredit.sub(paymentForThis);
                }
            }

            // ------------------------------------------------------------------
            // PASO 8: PROCESAMIENTO DE PAGOS DE REEMBOLSO (CASH/ZELLE/ETC)
            // ------------------------------------------------------------------
            if (amountToReturnCash.gt(0)) {
                const incomingPayments = data.refundPayments || [];

                if (incomingPayments.length === 0) {
                    throw new BusinessError(
                        `Debe indicar los pagos de reembolso. Monto a devolver: $${amountToReturnCash.toFixed(2)}`,
                        400
                    );
                }
                
                // 🛠️ BUG FIX: Buscar la tasa ACTIVA del negocio, no la histórica de la venta.
                // Si la venta fue hace 1 mes, la tasa cambió. El reembolso se calcula a hoy.
                const activeExchangeRate = await tx.exchangeRate.findFirst({
                    where: { businessId, isActive: true } // Asumo que tienes businessId en ExchangeRate
                });

                if (!activeExchangeRate || new Decimal(activeExchangeRate.rate).lte(0)) {
                    throw new BusinessError('No hay tasa de cambio activa para calcular la devolución en divisas.', 500);
                }

                // Pre-fetch de métodos de pago para evitar N+1
                const paymentMethodIds = incomingPayments.map(p => p.paymentMethodId);
                const paymentMethods = await tx.paymentMethod.findMany({
                    where: { id: { in: paymentMethodIds } }
                });
                const methodsMap = new Map(paymentMethods.map(pm => [pm.id, pm]));

                let totalPaidInBaseCurrency = new Decimal(0);

                for (const payment of incomingPayments) {
                    const method = methodsMap.get(payment.paymentMethodId);
                    if (!method) throw new BusinessError(`Método de pago ID ${payment.paymentMethodId} no válido`, 400);

                    const paymentAmount = new Decimal(payment.amount);
                    let valueInUsd = new Decimal(0);

                    // Conversión
                    if (method.currency === 'USD') {
                        valueInUsd = paymentAmount;
                    } else {
                        valueInUsd = paymentAmount.div(activeExchangeRate.rate);
                    }
                    totalPaidInBaseCurrency = totalPaidInBaseCurrency.add(valueInUsd);

                    // Validación de Caja
                    if (method.type === 'CASH' && !payment.cashRegisterId) {
                         throw new BusinessError("Se requiere caja abierta para devoluciones en efectivo", 400);
                    }

                    // Guardado
                    await tx.creditNotePayment.create({
                        data: {
                            creditNoteId: creditNote.id,
                            paymentMethodId: method.id,
                            amount: paymentAmount,
                            exchangeRateId: activeExchangeRate.id, // Guardamos la tasa usada HOY
                            reference: payment.reference,
                            cashRegisterId: method.type === 'CASH' ? payment.cashRegisterId : null
                        }
                    });
                }

                // Validación final de montos
                const diff = totalPaidInBaseCurrency.sub(amountToReturnCash).abs();
                if (diff.gt(0.05)) { // Tolerancia de 5 centavos por redondeos
                    throw new BusinessError(
                        `Los pagos no coinciden. A devolver: $${amountToReturnCash.toFixed(2)}. Ingresado: $${totalPaidInBaseCurrency.toFixed(2)}`,
                        400
                    );
                }
            }

            // ------------------------------------------------------------------
            // PASO 9: RESPUESTA
            // ------------------------------------------------------------------
            const paymentSummary = (data.refundPayments || [])
                .map(p => `$${new Decimal(p.amount).toFixed(2)}`)
                .join(' + ');

            return {
                status: 201,
                message: 'Nota de crédito generada correctamente',
                data: {
                    creditNote,
                    financialAction: {
                        action: amountToReturnCash.gt(0) ? 'REFUND' : 'ADJUST_DEBT',
                        totalRefunded: totalRefundAmount,
                        appliedToDebt: amountAppliedToDebt,
                        totalReturnedToCustomer: amountToReturnCash,
                        message: amountToReturnCash.gt(0)
                            ? `Devolución: ${paymentSummary}`
                            : `Ajuste de deuda: $${amountAppliedToDebt.toFixed(2)}`
                    }
                }
            };
        });
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