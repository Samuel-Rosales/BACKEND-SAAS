import { prisma } from '@/configs';
import { CreateSaleInterface, CreateSalePaymentDto, UpdateSaleInterface } from './interfaces';
import { PaymentStatus, Conditions, SaleStatus, SaleType, ProductType, Prisma, MovementType, Currency, InstallmentStatus } from '@prisma/client';
import { BusinessError } from '@/utils/catch-errors.util';
import { resolveBusinessExchangeRate } from '@/utils';
import { Decimal } from '@prisma/client/runtime/client';

const EPSILON = 0.02;

interface FindSalesQuery {
    page?: number;
    limit?: number;
    search?: string;        // <--- NUEVO: Buscador de texto
    paymentStatus?: string; // <--- NUEVO: PENDING, PAID, PARTIAL
    fromDate?: string;
    toDate?: string;
}

export class SaleService {

    // =================================================================
    // MÉTODO PRINCIPAL: CREAR VENTA
    // =================================================================
    async create(businessId: number, memberId: number, data: CreateSaleInterface) {
        try {
            // =================================================================
            // FASE 0: AUTORIDAD DE TASA (ANTI-SORPRESAS)
            // =================================================================

            // 1. VALIDAR CAJA ABIERTA (Lo primero de todo)
            // Usamos 'prisma' (global) porque aún no estamos en transacción.
            const activeRegister = await this.getOpenRegisterOrFail(prisma, memberId, businessId);

            // 2. VALIDAR TASA DE CAMBIO
            // Buscamos la tasa activa "REAL" en la base de datos para este negocio
            const currentRateRecord = await resolveBusinessExchangeRate(businessId, prisma);

            if (!currentRateRecord) {
                return { status: 400, message: 'No hay una tasa de cambio configurada en el sistema.', data: null };
            }

            // Validación estricta: El ID que manda el front DEBE ser el ID de la tasa actual
            if (data.exchangeRateId && data.exchangeRateId !== currentRateRecord.id) {
                return {
                    status: 409, // Conflict
                    message: 'La tasa de cambio ha variado durante la operación. Por favor recargue.',
                    data: { newRate: currentRateRecord.rate }
                };
            }

            // =================================================================
            // FASE 1: CARGA DE DATOS Y VALIDACIONES
            // =================================================================

            // 1. Cargar Cliente y Vendedor
            const [client, member, business] = await Promise.all([
                prisma.client.findFirst({ where: { id: data.clientId, businessId } }),
                prisma.businessMember.findFirst({ where: { id: memberId, businessId } }),
                prisma.business.findUnique({ where: { id: businessId } })
            ]);

            if (!business) throw new BusinessError('Negocio no encontrado', 404);
            if (!client) throw new BusinessError('Cliente no encontrado o no pertenece al negocio', 404);
            if (!member) throw new BusinessError('Vendedor no autorizado', 403);

            // 2. Cargar Productos (Con Impuestos, Recetas y Presentaciones)
            const productIds = [...new Set(data.items.map(i => i.productId))];

            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, businessId, isActive: true },
                include: {
                    tax: true, // Vital para calcular IVA
                    components: { include: { child: true } }, // Para Recetas
                    presentations: true // Para convertir Cajas -> Unidades
                }
            });

            if (products.length !== productIds.length) {
                throw new BusinessError('Uno o más productos no existen o están inactivos', 400);
            }

            // =================================================================
            // FASE 2: CÁLCULOS FINANCIEROS (PRECIOS, IVA, DESCUENTOS)
            // =================================================================

            // 1. Pre-cálculo para determinar el Subtotal Bruto (Antes de descuentos)
            // Necesitamos esto para saber el "peso" de cada producto en la venta total
            let rawSubTotal = new Decimal(0);

            const preProcessedItems = data.items.map(item => {
                const product = products.find(p => p.id === item.productId)!;

                // A. Manejo de Presentaciones (Cajas/Packs) y Precio Base
                let factor = new Decimal(1);
                let unitPrice = new Decimal(product.salePrice);
                let presentationUsed = null;

                if (item.productPresentationId) {

                    presentationUsed = product.presentations.find(p => p.id === item.productPresentationId);

                    if (!presentationUsed) throw new BusinessError(`Presentación inválida`, 400);

                    factor = new Decimal(presentationUsed.factor);

                    unitPrice = new Decimal(presentationUsed.price).greaterThan(0)
                        ? new Decimal(presentationUsed.price)
                        : new Decimal(product.salePrice).mul(factor);
                }

                const lineGrossAmount = new Decimal(unitPrice).mul(item.quantity);
                rawSubTotal = rawSubTotal.add(lineGrossAmount);

                return {
                    ...item,
                    product,
                    unitPrice,
                    lineGrossAmount,
                    factor,
                    presentationUsed
                };
            });

            // 2. Aplicación de Descuento Global (Prorrateo) y Cálculo de Impuestos
            const globalDiscount = new Decimal(data.discount || 0);

            // 2. Compara usando .gt() (Greater Than / Mayor Que)
            if (globalDiscount.gt(rawSubTotal)) {
                throw new BusinessError('El descuento no puede ser mayor al total de la venta', 400);
            }

            let finalSubTotal = new Decimal(0);
            let finalTaxAmount = new Decimal(0);

            // Asumimos que rawSubTotal ya es un Decimal calculado previamente
            const processedItems = preProcessedItems.map(item => {

                // ---------------------------------------------------------
                // A. Prorrateo del Descuento Global
                // ---------------------------------------------------------
                // Lógica: (SubtotalLinea / SubtotalTotal) * DescuentoGlobal

                let weight = new Decimal(0);

                // rawSubTotal > 0 ---> .gt(0)
                if (rawSubTotal.gt(0)) {
                    // item.lineGrossAmount / rawSubTotal ---> .div()
                    weight = item.lineGrossAmount.div(rawSubTotal);
                }

                // globalDiscount * weight ---> .mul()
                const lineDiscount = globalDiscount.mul(weight);

                // Base Imponible de la línea (Subtotal Neto)
                // item.lineGrossAmount - lineDiscount ---> .sub()
                const lineNetAmount = item.lineGrossAmount.sub(lineDiscount);

                // ---------------------------------------------------------
                // B. Cálculo de IVA Individual
                // ---------------------------------------------------------
                let lineTax = new Decimal(0);

                // Validamos si existe tax y si el rate es válido. 
                // Convertimos tax.rate a Decimal por seguridad.
                const taxRate = item.product.tax.rate ? new Decimal(item.product.tax.rate) : new Decimal(0);

                // rate > 0 ---> .gt(0)
                if (taxRate.gt(0)) {
                    // Fórmula: Base * (Tasa / 100)
                    // Ejemplo: 100 * 0.16 = 16
                    lineTax = lineNetAmount.mul(taxRate);
                }

                // ---------------------------------------------------------
                // C. Acumuladores Globales
                // ---------------------------------------------------------
                // ERROR COMÚN: No uses += con objetos Decimal.
                // Correcto: variable = variable.add(valor)
                finalSubTotal = finalSubTotal.add(lineNetAmount);
                finalTaxAmount = finalTaxAmount.add(lineTax);

                return {
                    ...item,
                    // Conversión segura para stock (cantidad * factor de presentación)
                    // Usamos Decimal para la multiplicacion para evitar 3 * 0.1 = 0.3000000004
                    quantityToDeductFromStock: new Decimal(item.quantity).mul(item.factor),

                    // Guardamos los valores finales como Decimal para la BD
                    finalLinePrice: lineNetAmount,
                    finalLineTax: lineTax
                };
            });

            // 3. Total Final
            const totalAmount = finalSubTotal.add(finalTaxAmount);

            // =================================================================
            // FASE 3: VALIDACIÓN DE PAGOS Y CRÉDITO (STRICT DECIMAL MODE)
            // =================================================================

            // 1. Inicializar acumulador como Decimal
            let totalPaidBase = new Decimal(0);

            // Buscamos los métodos válidos
            const validMethods = await prisma.paymentMethod.findMany({
                where: { id: { in: data.payments.map(p => p.paymentMethodId) } }
            });

            for (const pay of data.payments) {
                const method = validMethods.find(pm => pm.id === pay.paymentMethodId);

                if (!method) throw new BusinessError(`Método de pago ID ${pay.paymentMethodId} inválido`, 400);

                // Convertimos el input del usuario a Decimal de inmediato
                const paymentAmount = new Decimal(pay.amount);

                if (method.currency === 'USD') {
                    // Suma directa: variable = variable.add(valor)
                    totalPaidBase = totalPaidBase.add(paymentAmount);
                } else {
                    // Conversión VES -> USD
                    // Fórmula: MontoVES / Tasa
                    const rate = new Decimal(currentRateRecord.rate);

                    // Validación anti-división por cero (Defensive Programming)
                    if (rate.equals(0)) throw new BusinessError('La tasa de cambio no puede ser 0', 500);

                    const convertedAmount = paymentAmount.div(rate);

                    totalPaidBase = totalPaidBase.add(convertedAmount);
                }
            }

            // 2. Totales Finales (Redondeo bancario a 2 decimales)
            // Reemplaza a: Math.round(x * 100) / 100
            const totalPaidFinal = totalPaidBase.toDecimalPlaces(2);

            // Cálculo del saldo restante
            // Asumimos que 'totalAmount' viene de la Fase 2 y YA ES un Decimal
            const remainingBalance = totalAmount.sub(totalPaidFinal).toDecimalPlaces(2);

            // =================================================================
            // VALIDACIÓN DE CRÉDITO
            // =================================================================

            // Usamos remainingBalance, que es exactamente lo que se va a crédito
            if (data.condition === Conditions.CREDIT && remainingBalance.gt(0)) {

                // 1. ¿El negocio permite crédito globalmente?
                if (!business.enableGlobalCredit) {
                    throw new BusinessError('Las ventas a crédito están deshabilitadas temporalmente en el negocio.', 409);
                }

                // 2. ¿Este cliente está bloqueado para créditos?
                if (!client.allowCredit) {
                    throw new BusinessError('Este cliente no tiene permitido realizar compras a crédito.', 409);
                }

                // 3. CALCULAR EL LÍMITE EFECTIVO
                const effectiveLimit = client.useCustomLimit
                    ? new Decimal(client.customLimit)
                    : new Decimal(business.defaultCreditLimit);

                const currentDebt = new Decimal(client.currentDebt);

                // 4. Validar Disponibilidad
                const projectedDebt = currentDebt.add(remainingBalance);

                if (projectedDebt.gt(effectiveLimit)) {

                    const available = effectiveLimit.sub(currentDebt);
                    // Protegemos si el disponible es negativo
                    const safeAvailable = available.lt(0) ? new Decimal(0) : available;

                    throw new BusinessError(
                        `Límite de crédito excedido. Cupo: $${effectiveLimit.toFixed(2)}. Disponible: $${safeAvailable.toFixed(2)}. Intentas sumar: $${remainingBalance.toFixed(2)}`,
                        409
                    );
                }
            }

            // =================================================================
            // VALIDACIONES DE NEGOCIO
            // =================================================================

            // A. Caso CONTADO (CASH)
            if (data.condition === Conditions.CASH) {
                // Tolerancia de 0.05 (5 centavos) por posibles redondeos de interfaz
                // remainingBalance > 0.05 ---> .gt(0.05)
                if (remainingBalance.gt(0.05)) {
                    throw new BusinessError(
                        `Monto insuficiente para venta de Contado. Faltan $${remainingBalance.toString()}`,
                        400
                    );
                }
            }
            // B. Caso CRÉDITO (CREDIT)
            else if (data.condition === Conditions.CREDIT) {
                if (!data.installments || data.installments.length === 0) {
                    throw new BusinessError('Venta a crédito requiere plan de cuotas', 400);
                }

                // Sumatoria de Cuotas (Uso correcto de REDUCE con Decimal)
                const totalInstallments = data.installments.reduce(
                    (acc, curr) => acc.add(new Decimal(curr.amount)),
                    new Decimal(0) // Valor inicial debe ser new Decimal(0)
                );

                // Verificación de cuadre: |TotalCuotas - Deuda| > 0.05
                // 1. Restamos
                const diff = totalInstallments.sub(remainingBalance);

                // 2. Valor Absoluto (.abs) y Comparación (.gt)
                if (diff.abs().gt(0.01)) {
                    throw new BusinessError(
                        `La suma de cuotas ($${totalInstallments.toString()}) no coincide con la deuda ($${remainingBalance.toString()})`,
                        400
                    );
                }
            }

            // 1. Lógica de Estado de Pago (Pre-cálculo)
            // -----------------------------------------------------------------
            // Extraemos esta lógica compleja para que el 'create' quede limpio.
            let derivedPaymentStatus: PaymentStatus = PaymentStatus.PAID;

            // Si la deuda es mayor a 1 centavo (tolerancia)
            if (remainingBalance.gt(0.01)) {
                // Si ya pagó algo (mayor a 0), es PARCIAL, si no, es PENDIENTE
                derivedPaymentStatus = totalPaidFinal.gt(0)
                    ? PaymentStatus.PARTIAL
                    : PaymentStatus.PENDING;
            }

            // 1. Aseguramos que los datos entrantes sean instancias de Decimal
            // Si data.totalAmount es un número o string, 'new Decimal()' lo convierte en objeto con métodos.
            const incomingTotal = new Decimal(data.totalAmount || 0);
            const incomingSubTotal = new Decimal(data.subTotal || 0);
            const incomingTax = new Decimal(data.taxAmount || 0);

            // 2. Ahora sí podemos usar .sub() con seguridad
            const differenceTotalAmount = incomingTotal.sub(totalAmount).abs();
            const differenceSubTotal = incomingSubTotal.sub(finalSubTotal).abs();
            const differenceTaxAmount = incomingTax.sub(finalTaxAmount).abs();

            // 3. Validación - Solo lanzar error si hay una diferencia real mayor al epsilon
            if (differenceTotalAmount.gt(EPSILON)) {
                throw new BusinessError(
                    `Discrepancia en total: Recibido ${incomingTotal.toFixed(2)} vs Calculado ${totalAmount.toFixed(2)} (Diferencia: ${differenceTotalAmount.toFixed(2)})`,
                    400
                );
            }

            if (differenceSubTotal.gt(EPSILON)) {
                throw new BusinessError(
                    `Discrepancia en subtotal: Recibido ${incomingSubTotal.toFixed(2)} vs Calculado ${finalSubTotal.toFixed(2)} (Diferencia: ${differenceSubTotal.toFixed(2)})`,
                    400
                );
            }

            if (differenceTaxAmount.gt(EPSILON)) {
                throw new BusinessError(
                    `Discrepancia en impuestos: Recibido ${incomingTax.toFixed(2)} vs Calculado ${finalTaxAmount.toFixed(2)} (Diferencia: ${differenceTaxAmount.toFixed(2)})`,
                    400
                );
            }
            // =================================================================
            // FASE 4: TRANSACCIÓN ATÓMICA (ESCRITURA EN DB)
            // =================================================================
            const result = await prisma.$transaction(async (tx) => {

                await this.verifyStockAvailability(tx, processedItems, data.depotId);

                // A. Generar Número de Factura
                const nextReceipt = await this.generateNextReceiptNumber(tx, businessId);

                // B. Crear Venta
                const sale = await tx.sale.create({
                    data: {
                        businessId,
                        memberId,
                        clientId: data.clientId,
                        exchangeRateId: currentRateRecord.id,
                        receiptNumber: nextReceipt,

                        type: data.type,
                        status: SaleStatus.COMPLETED,
                        conditions: data.condition,

                        // Pasamos los objetos Decimal DIRECTAMENTE. 
                        // Prisma sabe cómo mapear Decimal.js a la base de datos.
                        subTotal: finalSubTotal,
                        discount: globalDiscount,
                        taxAmount: finalTaxAmount,
                        totalAmount: totalAmount,

                        // Validación segura de saldo negativo
                        // Si remainingBalance < 0 (por error de redondeo), guardamos 0
                        remainingBalance: remainingBalance.gt(0) ? remainingBalance : new Decimal(0),

                        // Usamos el estado calculado arriba
                        paymentStatus: derivedPaymentStatus,

                        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : new Date()
                    }
                });

                if (data.condition === Conditions.CREDIT && data.installments) {

                    let moneyDistributor = new Decimal(totalPaidFinal); // Dinero disponible para abonar

                    for (const inst of data.installments) {

                        const quotaAmount = new Decimal(inst.amount);
                        let amountToPayNow = new Decimal(0);

                        // 1. Lógica de Distribución (Waterfall)
                        if (moneyDistributor.gt(0)) {

                            if (moneyDistributor.gte(quotaAmount)) {

                                // El abono cubre toda esta cuota
                                amountToPayNow = quotaAmount;
                                moneyDistributor = moneyDistributor.sub(quotaAmount);
                            } else {

                                // El abono solo cubre una parte
                                amountToPayNow = moneyDistributor;
                                moneyDistributor = new Decimal(0); // Se acabó el abono
                            }
                        }

                        // 2. Determinar Estado
                        let status: InstallmentStatus = InstallmentStatus.PENDING;

                        // Usamos una pequeña tolerancia (epsilon) para evitar errores de flotantes extremos, 
                        // aunque con Decimal.js es raro.
                        if (amountToPayNow.gte(quotaAmount.sub(0.001))) {
                            status = InstallmentStatus.PAID;
                        } else if (amountToPayNow.gt(0)) {
                            status = InstallmentStatus.PARTIAL;
                        }

                        // 3. Crear la Cuota SIEMPRE (tenga pago o no)
                        await tx.saleInstallment.create({
                            data: {
                                saleId: sale.id,
                                number: inst.number,
                                amount: quotaAmount,
                                dueDate: new Date(inst.dueDate),

                                status: status,
                                amountPaid: amountToPayNow,

                                // Si se pagó algo ahora, marcamos la fecha, si no, null
                                paidAt: amountToPayNow.gt(0) ? new Date() : null
                            }
                        });
                    }

                    // Safety check opcional: Si sobró dinero en moneyDistributor, 
                    // significa que pagaron más que el total de la deuda. 
                    // Deberías manejar ese "saldo a favor" o lanzar un error antes.
                }

                // D. PROCESAR ITEMS E INVENTARIO
                for (const item of processedItems) {
                    // 1. Crear Registro Visual (SaleItem)
                    const saleItem = await tx.saleItem.create({
                        data: {
                            saleId: sale.id,
                            productId: item.productId,
                            productPresentationId: item.presentationUsed?.id || null,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subTotal: item.finalLinePrice,
                        }
                    });

                    // 2. DESCUENTO DE STOCK (Recursivo con cantidad convertida)
                    await this.processStockExit(
                        tx,
                        businessId,
                        memberId,
                        sale.id,
                        saleItem.id,
                        item.product,
                        item.quantityToDeductFromStock,
                        item.depotId || data.depotId || 0 // Use item specific depot, or sale default, or 0 (global search logic)
                    );
                }

                // E. Registrar Pagos Iniciales
                if (data.payments.length > 0) {
                    await tx.salePayment.createMany({
                        data: data.payments.map(p => ({
                            saleId: sale.id,
                            paymentMethodId: p.paymentMethodId,
                            amount: p.amount,
                            exchangeRateId: currentRateRecord.id, // Tasa validada
                            reference: p.reference || "N/A",
                            cashRegisterId: activeRegister.id
                        }))
                    });
                }

                // Si quedó debiendo algo (remainingBalance > 0), se lo sumamos a su cuenta.
                if (remainingBalance.gt(0)) {
                    await tx.client.update({
                        where: { id: client.id }, // Usamos el objeto 'client' que cargamos al principio
                        data: {
                            currentDebt: { increment: remainingBalance }
                        }
                    });
                }

                return sale;
            });

            return { status: 201, message: 'Venta registrada exitosamente', data: result };

        } catch (error: any) {
            console.error('Error create sale:', error);
            if (error instanceof BusinessError) return { status: error.status, message: error.message, data: null };
            return { status: 500, message: 'Error interno al procesar la venta', data: null };
        }
    }

    // En SaleService
    private async getOpenRegisterOrFail(tx: Prisma.TransactionClient | typeof prisma, memberId: number, businessId: number) {
        const register = await tx.cashRegister.findFirst({
            where: {
                businessId,
                memberId,
                status: 'OPEN' // O CashStatus.OPEN
            }
        });

        if (!register) {
            throw new BusinessError(
                '⚠️ No tienes una caja abierta. Debes realizar la Apertura de Caja antes de vender.',
                409 // Conflict
            );
        }
        return register;
    }

    // =================================================================
    // HELPER: DESCUENTO DE STOCK RECURSIVO (FIFO)
    // =================================================================
    private async processStockExit(
        tx: Prisma.TransactionClient,
        businessId: number,
        memberId: number,
        saleId: number,
        saleItemId: number,
        product: any,
        quantityToRemove: Decimal,
        depotId: number // <--- Recibimos el Depósito (Opcional)
    ) {
        // =========================================================
        // CASO 0: SERVICIOS (INTANGIBLES)
        // =========================================================
        // Si es un servicio, no hacemos nada. Simplemente salimos.
        // Esto evita errores de "Stock insuficiente" en cosas que no tienen stock.
        if (product.type === ProductType.SERVICE) {
            return;
        }

        // =========================================================
        // CASO 1: PRODUCTO SIMPLE (Físico)
        // =========================================================
        if (product.type === ProductType.SIMPLE) {

            // Construimos el filtro (Depot Global vs Específico)
            // Si hay depotId, filtramos por él. Si no, traemos de todos los almacenes.
            const whereFilter: Prisma.StockLotWhereInput = {
                productId: product.id,
                quantity: { gt: 0 },
                ...(depotId ? { depotId } : {})
            };

            // Buscar lotes disponibles (FIFO: Primero en entrar, primero en salir)
            const lots = await tx.stockLot.findMany({
                where: whereFilter,
                orderBy: { expirationDate: 'asc' }
            });

            let remainingToDeduct = quantityToRemove;

            for (const lot of lots) {
                if (remainingToDeduct.lte(0)) break; // lte = Less Than or Equal (<=)

                // 1. Convertimos la cantidad del lote a Decimal por seguridad
                const lotQty = new Decimal(lot.quantity);

                // 2. Lógica de "Deduction": ¿Cuál es el menor?
                // Usamos el operador ternario con .lessThan()
                const deduction = lotQty.lessThan(remainingToDeduct) ? lotQty : remainingToDeduct;

                // A. Actualizar Lote
                await tx.stockLot.update({
                    where: { id: lot.id },
                    data: { quantity: { decrement: deduction } }
                });

                // B. Trazabilidad
                await tx.saleItemLot.create({
                    data: {
                        saleItemId: saleItemId,
                        stockLotId: lot.id,
                        quantity: deduction
                    }
                });

                // C. Kardex
                await tx.stockMovement.create({
                    data: {
                        businessId,
                        productId: product.id,
                        memberId: memberId,
                        depotId: lot.depotId,
                        type: 'OUT',
                        quantity: -deduction,
                        historicalCost: lot.lotCost,
                        reason: `Venta #${saleId}`
                    }
                });

                // 3. Restamos usando .sub() para mantener precisión
                remainingToDeduct = remainingToDeduct.sub(deduction);
            }

            // Safety Check: Aunque validamos antes, si alguien robó el stock milisegundos antes, esto explota aquí.
            if (remainingToDeduct.gt(0)) {
                throw new BusinessError(`Inconsistencia de inventario en "${product.name}". Faltan ${remainingToDeduct}.`, 409);
            }
        }

        // =========================================================
        // CASO 2: PRODUCTO COMPUESTO (Receta / Combo)
        // =========================================================
        else if (product.type === ProductType.COMPOSITE) {
            if (!product.components || product.components.length === 0) {
                throw new BusinessError(`El combo "${product.name}" no tiene configuración de receta.`, 400);
            }

            // 1. Aseguramos que quantityToRemove sea Decimal
            const qtyToSell = new Decimal(quantityToRemove);

            for (const comp of product.components) {
                // 2. Multiplicación de alta precisión: (Cantidad Vendida) * (Cantidad en Receta)
                // Ejemplo: 10 hamburguesas * 0.150 kg de carne = 1.500 kg
                const ingredientQty = qtyToSell.mul(new Prisma.Decimal(comp.quantity));

                // 3. Validación de seguridad: no procesar cantidades en cero o negativas
                if (ingredientQty.lte(0)) continue;

                const childProduct = await tx.product.findUnique({
                    where: { id: comp.childProductId },
                    include: { components: { include: { child: true } } }
                });

                if (!childProduct) {
                    throw new BusinessError(`Ingrediente "${comp.child?.name || comp.childProductId}" no encontrado`, 500);
                }

                // 4. Recursividad con Contexto
                // Pasamos ingredientQty como Decimal. 
                // Tu función processStockExit debe estar preparada para recibir number | Decimal
                await this.processStockExit(
                    tx,
                    businessId,
                    memberId,
                    saleId,
                    saleItemId,
                    childProduct,
                    ingredientQty, // Se envía el objeto Decimal con precisión total
                    depotId
                );
            }
        }
    }

    private async generateNextReceiptNumber(tx: Prisma.TransactionClient, businessId: number): Promise<number> {
        const lastSale = await tx.sale.findFirst({
            where: { businessId },
            orderBy: { receiptNumber: 'desc' }
        });
        return (lastSale?.receiptNumber || 0) + 1;
    }

    /**
     * Verifica recursivamente si hay suficiente stock para cubrir la venta.
     * No modifica nada, solo lee y suma.
     */
    private async verifyStockAvailability(
        tx: Prisma.TransactionClient,
        items: any[],
        depotId: number
    ): Promise<void> {

        // 1. Aplanamos la lista de necesidades usando Decimal en el Map
        // Map: ProductID -> Prisma.Decimal (Cantidad Total Requerida)
        const requirements = new Map<number, Prisma.Decimal>();

        for (const item of items) {
            // Asegúrate de que accumulateRequirements reciba y sume usando .add()
            await this.accumulateRequirements(tx, requirements, item.product, item.quantityToDeductFromStock);
        }

        // 2. Consultamos Stock Físico
        const productIds = Array.from(requirements.keys());

        const stockSummary = await tx.stockLot.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            where: {
                productId: { in: productIds },
                quantity: { gt: 0 },
                ...(depotId ? { depotId } : {})
            }
        });

        // 3. Comparamos Requerido vs Disponible
        for (const [productId, requiredQty] of requirements.entries()) {
            const stock = stockSummary.find(s => s.productId === productId);

            // Prisma.groupBy devuelve objetos Decimal en los campos de suma
            const available = new Prisma.Decimal(stock?._sum.quantity || 0);

            // COMPARACIÓN CRÍTICA: available < requiredQty
            if (available.lt(requiredQty)) {
                // Buscamos el nombre para el error
                const prodName = items.find(i => i.productId === productId)?.product.name
                    || `Producto ID ${productId} (Ingrediente)`;

                throw new BusinessError(
                    `Stock insuficiente para "${prodName}". Requerido: ${requiredQty.toNumber()}, Disponible: ${available.toNumber()}`,
                    409
                );
            }
        }
    }

    // Helper Recursivo para desglosar recetas
    private async accumulateRequirements(
        tx: Prisma.TransactionClient,
        map: Map<number, Prisma.Decimal>, // Cambiamos el tipo del Map
        product: any,
        qtyNeeded: number | Prisma.Decimal // Aceptamos ambos para flexibilidad
    ) {
        // 1. Normalizamos la cantidad a Decimal
        const needed = new Prisma.Decimal(qtyNeeded);

        if (product.type === ProductType.SIMPLE) {
            if (product.isService) return;

            // 2. Obtenemos el valor actual del mapa o inicializamos en 0
            const current = map.get(product.id) || new Prisma.Decimal(0);

            // 3. Sumamos usando .add() para mantener precisión total
            map.set(product.id, current.add(needed));
        }
        else if (product.type === ProductType.COMPOSITE) {
            if (product.components) {
                for (const comp of product.components) {
                    const childProduct = await tx.product.findUnique({
                        where: { id: comp.childProductId },
                        include: { components: true }
                    });

                    if (childProduct) {
                        // 4. Multiplicación de alta precisión: 
                        // (Cantidad de combos) * (Cantidad que lleva la receta)
                        const ingredientQty = needed.mul(new Prisma.Decimal(comp.quantity));

                        // 5. Llamada recursiva con el nuevo Decimal
                        await this.accumulateRequirements(tx, map, childProduct, ingredientQty);
                    }
                }
            }
        }
    }

    // 2. LISTAR VENTAS (CON PAGINACIÓN Y FILTROS)
    async findAll(businessId: number, query: FindSalesQuery) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const skip = (page - 1) * limit;
            const search = query.search ? String(query.search).trim() : undefined;

            // 1. Where Base
            const whereClause: any = {
                businessId,
                //status: { not: 'CANCELLED' } // Opcional: Si quieres ocultar las anuladas por defecto
            };

            // 2. Filtros de Fecha
            if (query.fromDate && query.toDate) {
                whereClause.createdAt = {
                    gte: new Date(query.fromDate),
                    lte: new Date(new Date(query.toDate).setHours(23, 59, 59))
                };
            }

            // 3. Filtro de Estado de Pago (Cuentas por Cobrar)
            if (query.paymentStatus) {
                whereClause.paymentStatus = query.paymentStatus;
            }

            // 4. BÚSQUEDA AVANZADA (La mejora clave)
            if (search) {
                const searchAsNumber = Number(search);
                const isNumeric = !isNaN(searchAsNumber);

                whereClause.OR = [
                    // Búsqueda por texto (Cliente, Cédula - asumiendo que CI es string en DB)
                    { client: { name: { contains: search, mode: 'insensitive' } } },
                    { client: { ci: { contains: search, mode: 'insensitive' } } }
                ];

                // Solo agregamos búsqueda por ID de factura si el input es un número válido
                if (isNumeric) {
                    whereClause.OR.push({
                        receiptNumber: { equals: searchAsNumber }
                    });
                }
            }

            // 5. Query
            const [sales, total] = await Promise.all([
                prisma.sale.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: { select: { name: true, ci: true } },
                        member: { include: { user: { select: { name: true } } } },
                        exchangeRate: { select: { rate: true } },
                        _count: { select: { items: true } }
                    }
                }),
                prisma.sale.count({ where: whereClause })
            ]);

            // 6. Serialización (Decimal -> Number)
            const formattedSales = sales.map(sale => ({
                ...sale,
                subTotal: Number(sale.subTotal),
                taxAmount: Number(sale.taxAmount),
                totalAmount: Number(sale.totalAmount),
                remainingBalance: Number(sale.remainingBalance),
                // Calculamos si está vencida (solo visual)
                isOverdue: sale.conditions === 'CREDIT' &&
                    sale.paymentStatus !== 'PAID' &&
                    sale.paymentDueDate &&
                    new Date(sale.paymentDueDate) < new Date()
            }));

            return {
                status: 200,
                message: 'Ventas obtenidas',
                data: formattedSales,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('Error findAll Sales:', error);
            return { status: 500, message: 'Error interno', data: null };
        }
    }

    // 3. OBTENER DETALLE COMPLETO
    async findOne(businessId: number, id: number) {
        try {
            // 1. QUERY: Traemos toda la data relacional necesaria
            const sale = await prisma.sale.findFirst({
                where: { id, businessId },
                include: {
                    client: true, // Datos del cliente
                    member: {
                        include: {
                            user: { select: { name: true, ci: true } }
                        }
                    },
                    exchangeRate: true, // Tasa del día de la venta
                    items: {
                        include: {
                            product: {
                                select: { name: true, sku: true, imageUrl: true, category: true }
                            },
                            productPresentation: {
                                select: { name: true, factor: true }
                            },
                            // TRAZABILIDAD: ¿De qué lotes salió este ítem?
                            lotAllocations: {
                                include: {
                                    stockLot: {
                                        select: {
                                            id: true,
                                            expirationDate: true,
                                            lotCost: true
                                        }
                                    }
                                }
                            }
                        }
                    },
                    payments: {
                        include: {
                            paymentMethod: { select: { name: true, type: true } },
                            exchangeRate: { select: { rate: true } }
                        }
                    },
                    creditNotes: {
                        include: {
                            items: {
                                include: { product: true } // Para obtener el nombre del producto
                            }
                        }
                    }
                }
            });

            if (!sale) {
                return { status: 404, message: 'Venta no encontrada', data: null };
            }

            // 2. SERIALIZACIÓN (La Magia): Convertimos la data cruda de DB a algo útil para la UI
            const formattedSale = {
                // --- Cabecera ---
                id: sale.id,
                receiptNumber: sale.receiptNumber, // Ojo: Asegura que sea string o number según tu UI
                createdAt: sale.createdAt,
                status: sale.status, // PAID, PENDING, CANCELLED

                // --- Financiero (CONVERSIÓN DE DECIMAL A NUMBER) ---
                subTotal: Number(sale.subTotal),
                taxAmount: Number(sale.taxAmount),
                discountAmount: Number(sale.discount || 0),
                totalAmount: Number(sale.totalAmount),
                remainingBalance: Number(sale.remainingBalance),

                // --- Cliente y Vendedor ---
                client: {
                    id: sale.client.id,
                    name: sale.client.name,
                    ci: sale.client.ci,
                    address: sale.client.address,
                    phone: sale.client.phone
                },
                seller: {
                    name: sale.member?.user?.name || 'Sistema',
                    ci: sale.member?.user?.ci
                },

                // --- Tasa de Cambio de la Venta ---
                exchangeRate: sale.exchangeRate ? Number(sale.exchangeRate.rate) : null,
                exchangeRateId: sale.exchangeRateId,

                // --- ITEMS (Lo más crítico) ---
                items: sale.items.map(item => {
                    // Lógica de Snapshot: ¿Tenemos nombre guardado en el item? Si no, usa el del producto actual.
                    const displayName = item.product.name || 'Producto Desconocido';

                    return {
                        id: item.id,
                        productId: item.productId,
                        name: displayName,
                        sku: item.product?.sku,
                        quantity: Number(item.quantity),
                        price: Number(item.unitPrice), // Precio unitario al momento de la venta
                        total: Number(item.subTotal), // Total línea (qty * price)

                        // Info de Presentación (ej. "Caja x 12")
                        presentation: item.productPresentation ? {
                            name: item.productPresentation.name,
                            factor: Number(item.productPresentation.factor)
                        } : null,

                        // Info de Lotes (Simplificada para mostrar en UI)
                        lots: item.lotAllocations.map(alloc => ({
                            // StockLot no tiene `lotNumber` en el schema; usamos el ID como identificador.
                            lotNumber: alloc.stockLot ? String(alloc.stockLot.id) : 'N/A',
                            expirationDate: alloc.stockLot?.expirationDate,
                            quantityTaken: Number(alloc.quantity) // Cuánto se sacó de este lote específico
                        }))
                    };
                }),

                // --- PAGOS ASOCIADOS ---
                payments: sale.payments.map(payment => ({
                    id: payment.id,
                    method: payment.paymentMethod.name,
                    date: payment.date,
                    amount: Number(payment.amount), // Monto en moneda (ej. USD o VES)
                    rateUsed: payment.exchangeRate ? Number(payment.exchangeRate.rate) : null,
                    reference: payment.reference // Referencia bancaria
                })),

                creditNotes: sale.creditNotes.map(note => ({
                    id: note.id,
                    number: note.number,
                    reason: note.reason,
                    totalAmount: Number(note.totalAmount), // Importante: Decimal -> Number
                    createdAt: note.createdAt.toISOString(), // O como prefieras formatear la fecha string
                    items: note.items.map(noteItem => ({
                        id: noteItem.id,
                        productName: noteItem.product.name, // El include te permite acceder a esto
                        quantity: Number(noteItem.quantity),
                        unitPrice: Number(noteItem.unitPrice),
                        subTotal: Number(noteItem.subTotal),
                        returnToStock: noteItem.returnToStock
                    }))
                }))
            };

            return {
                status: 200,
                message: 'Venta obtenida exitosamente',
                data: formattedSale
            };

        } catch (error) {
            // Log detallado para ti (Backend)
            console.error(`[SaleService.findOne] Error ID ${id}:`, error);

            // Respuesta genérica para el cliente (Seguridad)
            return {
                status: 500,
                message: 'Error interno al procesar la solicitud',
                data: null
            };
        }
    }

    async addPayment(businessId: number, saleId: number, data: CreateSalePaymentDto) {
        try {
            // =================================================================
            // FASE 0: AUTORIDAD DE TASA (ANTI-SORPRESAS)
            // =================================================================
            // Buscamos la tasa activa "REAL" en la base de datos para este negocio
            // Asumimos que tienes un campo 'isActive' o te basas en la fecha más reciente
            const currentRateRecord = await resolveBusinessExchangeRate(businessId, prisma);

            if (!currentRateRecord) {
                return { status: 400, message: 'No hay una tasa de cambio configurada en el sistema.', data: null };
            }

            // Validación estricta: El ID que manda el front DEBE ser el ID de la tasa actual
            if (data.exchangeRateId && data.exchangeRateId !== currentRateRecord.id) {
                return {
                    status: 409, // Conflict
                    message: 'La tasa de cambio ha variado durante la operación. Por favor recargue.',
                    data: { newRate: currentRateRecord.rate }
                };
            }

            const result = await prisma.$transaction(async (tx) => {

                // 1. Consultas Iniciales
                const [exchangeRate, sale, paymentMethod] = await Promise.all([

                    tx.exchangeRate.findUnique({ where: { id: currentRateRecord.id } }),

                    tx.sale.findUnique({ where: { id: saleId, businessId }, include: { client: true } }),

                    tx.paymentMethod.findUnique({ where: { id: data.paymentMethodId } })
                ]);

                // 2. Validaciones de Seguridad
                if (!sale) throw new BusinessError("Venta no encontrada", 404);

                // USO CORRECTO DEL ENUM
                if (sale.paymentStatus === PaymentStatus.PAID) {
                    throw new BusinessError("Esta venta ya está pagada por completo", 400);
                }

                if (!exchangeRate) throw new BusinessError("Tasa de cambio inválida", 400);

                if (!paymentMethod) throw new BusinessError("Método de pago inválido", 400);

                // 3. Normalizar el Pago a Moneda Base (USD)
                let paymentInBaseCurrency = new Decimal(data.amount);

                const rate = new Decimal(exchangeRate.rate);

                // USO CORRECTO DEL ENUM (Currency)
                if (paymentMethod.currency !== Currency.USD) {

                    if (!rate || rate.lte(0)) throw new BusinessError("Tasa de cambio inválida para conversión", 400);

                    paymentInBaseCurrency = paymentInBaseCurrency.div(rate);
                }

                // Redondeo a 2 decimales
                paymentInBaseCurrency = paymentInBaseCurrency.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

                // Validación de Sobrepago
                const currentDebt = new Decimal(sale.remainingBalance);

                const tolerance = new Decimal(0.05); // Margen de error pequeño

                // 4. Validar sobrepago
                if (paymentInBaseCurrency.gt(currentDebt.add(tolerance))) {
                    throw new BusinessError(`El monto ($${paymentInBaseCurrency}) supera la deuda pendiente ($${sale.remainingBalance})`, 400);
                }

                // 5. Crear el registro del Pago (Histórico)
                const newPayment = await tx.salePayment.create({
                    data: {
                        saleId,
                        paymentMethodId: data.paymentMethodId,
                        exchangeRateId: exchangeRate.id,
                        amount: new Decimal(data.amount), // Guardamos el monto original
                        reference: data.reference || "N/A"
                    }
                });

                // =================================================================
                // 6. LÓGICA DE CASCADA DE CUOTAS (Waterfall)
                // =================================================================

                if (sale.conditions === Conditions.CREDIT) {

                    // A. Buscamos cuotas pendientes (FIFO)
                    const pendingInstallments = await tx.saleInstallment.findMany({
                        where: {
                            saleId: saleId,
                            status: { not: InstallmentStatus.PAID }
                        },
                        orderBy: { dueDate: 'asc' } // Primero vence, primero se paga
                    });

                    // B. Distribuimos el dinero
                    let moneyDistributor = paymentInBaseCurrency;

                    for (const inst of pendingInstallments) {
                        // Si se acabó el dinero, paramos
                        if (moneyDistributor.lte(new Decimal(0.01))) break;

                        const totalAmount = new Decimal(inst.amount);
                        const alreadyPaid = new Decimal(inst.amountPaid);

                        // A. Calculamos cuánto falta para liquidar ESTA cuota
                        const missingAmount = totalAmount.sub(alreadyPaid);

                        // B. Decidimos cuánto vamos a abonar AHORA
                        // Es el mínimo entre: Lo que tengo disponible VS Lo que falta
                        let amountToPayNow: Decimal;

                        if (moneyDistributor.gte(missingAmount)) {
                            amountToPayNow = missingAmount; // Pago lo que falta completo
                        } else {
                            amountToPayNow = moneyDistributor; // Pago todo lo que me queda
                        }

                        // C. Calculamos el nuevo total pagado
                        const newAmountPaid = alreadyPaid.add(amountToPayNow);

                        // D. Determinamos si se liquidó (con tolerancia de centavos)
                        // Usamos 0.005 para evitar problemas de redondeo en el último decimal
                        const isFullyPaid = newAmountPaid.gte(totalAmount.sub(new Decimal(0.002)));

                        await tx.saleInstallment.update({
                            where: { id: inst.id },
                            data: {
                                status: isFullyPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
                                amountPaid: newAmountPaid,
                                paidAt: isFullyPaid ? new Date() : undefined
                            }
                        });

                        // E. Reducimos el dinero disponible
                        moneyDistributor = moneyDistributor.sub(amountToPayNow);
                    }
                }

                // =================================================================
                // 7. Actualización Global (Saldo y Estado de Venta)
                // =================================================================

                let newBalance = currentDebt.sub(paymentInBaseCurrency);

                newBalance = newBalance.lt(0) ? new Decimal(0) : newBalance;

                // DECLARACIÓN EXPLÍCITA DEL TIPO (Para evitar error de TS)
                let newStatus: PaymentStatus = sale.paymentStatus;

                // Si debe menos de 5 centavos, lo consideramos PAGADO
                if (newBalance.lte(tolerance)) {
                    newStatus = PaymentStatus.PAID;
                    newBalance = new Decimal(0); // Limpieza final
                } else {
                    newStatus = PaymentStatus.PARTIAL;
                }

                await tx.sale.update({
                    where: { id: saleId },
                    data: {
                        remainingBalance: newBalance,
                        paymentStatus: newStatus
                    }
                });

                await tx.client.update({
                    where: { id: sale.client.id }, // Usamos el objeto 'client' que cargamos al principio
                    data: {
                        currentDebt: { decrement: paymentInBaseCurrency }
                    }
                });

                return {
                    payment: newPayment,
                    newBalance: newBalance,
                    status: newStatus,
                    message: newStatus === PaymentStatus.PAID ? '¡Venta liquidada correctamente!' : 'Abono registrado correctamente'
                };
            });

            return { status: 200, message: 'Pago agregado exitosamente', data: result };

        } catch (error) {
            console.error('Error al agregar pago:', error);
            if (error instanceof BusinessError) {
                return { status: error.status, message: error.message, data: null };
            }
            return { status: 500, message: 'Error interno al agregar pago', data: null };
        }
    }

    // 4. ACTUALIZAR VENTA (Solo status y remainingBalance)
    async update(businessId: number, id: number, data: UpdateSaleInterface) {
        try {
            const existing = await prisma.sale.findFirst({
                where: { id, businessId }
            });

            if (!existing) {
                return {
                    status: 404,
                    message: 'Venta no encontrada o no pertenece a este negocio',
                    data: null
                };
            }

            const updateData: any = {};

            if (data.status) {
                updateData.status = data.status;
            }

            if (data.remainingBalance !== undefined) {
                updateData.remainingBalance = data.remainingBalance;
            }

            if (data.paymentDueDate) {
                updateData.paymentDueDate = new Date(data.paymentDueDate);
            }

            const updatedSale = await prisma.sale.update({
                where: { id },
                data: updateData,
                include: {
                    client: { select: { name: true } },
                    member: { include: { user: { select: { name: true } } } }
                }
            });

            return {
                status: 200,
                message: 'Venta actualizada exitosamente',
                data: updatedSale
            };

        } catch (error) {
            console.error('Error al actualizar venta:', error);
            return {
                status: 500,
                message: 'Error interno al actualizar venta',
                data: null
            };
        }
    }

    async findCredits(businessId: number) {
        try {
            const credits = await prisma.sale.findMany({
                where: {
                    businessId,
                    conditions: 'CREDIT', // Solo ventas a crédito
                    // Filtro: Traer solo las que tienen deuda pendiente
                    /*remainingBalance: {
                        gt: 0
                    },*/
                    // Seguridad extra: que no estén anuladas
                    status: {
                        not: 'CANCELLED'
                    }
                },
                select: {
                    id: true,
                    receiptNumber: true,
                    totalAmount: true,
                    remainingBalance: true,
                    paymentStatus: true,
                    createdAt: true, // ✅ NECESARIO: Para mostrar la fecha de la venta en la tabla
                    client: {
                        select: {
                            id: true,
                            name: true,
                            phone: true
                        }
                    },
                    // ✅ LO NUEVO: Traer las cuotas ordenadas
                    installments: {
                        orderBy: {
                            number: 'asc' // Cuota 1, 2, 3...
                        },
                        select: {
                            id: true,
                            number: true,
                            amount: true,
                            dueDate: true,
                            status: true,
                            paidAt: true
                        }
                    }
                },
                orderBy: [
                    { paymentStatus: 'asc' },
                    { createdAt: 'desc' }
                ]
            });

            if (credits.length === 0) {
                return {
                    message: 'No hay créditos pendientes',
                    status: 200,
                    data: []
                };
            }

            // Mapeo de datos para el Frontend
            const mappedCredits = credits.map(sale => ({
                id: sale.id,
                receiptNumber: sale.receiptNumber,

                clientId: sale.client.id,
                clientName: sale.client.name,
                clientPhone: sale.client.phone,

                totalAmount: Number(sale.totalAmount),
                remainingBalance: Number(sale.remainingBalance),

                status: sale.paymentStatus,
                createdAt: sale.createdAt, // Fecha de creación para la tabla

                // ✅ Mapeamos las cuotas convirtiendo Decimal a Number
                installments: sale.installments.map(inst => ({
                    id: inst.id,
                    number: inst.number,
                    amount: Number(inst.amount),
                    dueDate: inst.dueDate,
                    status: inst.status,
                    paidAt: inst.paidAt
                }))
            }));

            return {
                message: 'Créditos obtenidos exitosamente',
                status: 200,
                data: mappedCredits
            };

        } catch (error) {
            console.error('Error al obtener créditos:', error);
            return {
                message: 'Error interno al obtener créditos',
                status: 500,
                data: null
            };
        }
    }

    async getPaymentHistory(businessId: number, saleId: number) {
        try {
            // 1. Get Sale + Installments
            const sale = await prisma.sale.findUnique({
                where: { id: saleId, businessId },
                include: {
                    // ✅ Fetch Installments to show the plan
                    installments: {
                        orderBy: { number: 'asc' }
                    },
                    client: { select: { name: true } }
                }
            });

            if (!sale) {
                return { status: 404, message: 'Venta no encontrada', data: null };
            }

            // 2. Get Payments (Same as before)
            const payments = await prisma.salePayment.findMany({
                where: { saleId },
                include: {
                    paymentMethod: { select: { name: true, type: true, currency: true } },
                    exchangeRate: { select: { rate: true } }
                },
                orderBy: { date: 'desc' }
            });

            // 3. Map Payments (Same logic as before)
            const formattedPayments = payments.map(p => {
                const rate = Number(p.exchangeRate.rate);
                const originalAmount = Number(p.amount);
                const usdEquivalent = p.paymentMethod.currency === 'VES'
                    ? originalAmount / rate
                    : originalAmount;

                return {
                    id: p.id,
                    date: p.date,
                    methodName: p.paymentMethod.name,
                    currency: p.paymentMethod.currency,
                    originalAmount,
                    rateUsed: rate,
                    usdEquivalent: Number(usdEquivalent.toFixed(2)),
                    reference: p.reference
                };
            });

            // 4. ✅ Map Installments (New Section)
            const formattedInstallments = sale.installments.map(ins => ({
                id: ins.id,
                number: ins.number,
                amount: Number(ins.amount),
                amountPaid: Number(ins.amountPaid),
                dueDate: ins.dueDate,
                status: ins.status, // PENDING, PAID, PARTIAL
                paidAt: ins.paidAt
            }));

            return {
                status: 200,
                message: 'Detalle de crédito obtenido',
                data: {
                    saleInfo: {
                        receiptNumber: sale.receiptNumber,
                        status: sale.paymentStatus,
                        clientName: sale.client.name
                    },
                    summary: {
                        totalDebt: Number(sale.totalAmount),
                        currentDebt: Number(sale.remainingBalance),
                        totalPaid: Number(sale.totalAmount) - Number(sale.remainingBalance)
                    },
                    // ✅ We send both lists now
                    plan: formattedInstallments,
                    history: formattedPayments
                }
            };

        } catch (error) {
            console.error(error);
            return { status: 500, message: 'Error interno', data: null };
        }
    }
}
