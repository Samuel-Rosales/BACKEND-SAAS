import { prisma } from '@/configs';
import { CreatePaymentDto, CreatePurchaseInterface, FindPurchasesQuery } from './interfaces';
import { Conditions, Currency, InstallmentStatus, MovementType, PaymentStatus, ProductType } from '@prisma/client';
import { BusinessError, calculatePriceWithMarkup, resolveBusinessExchangeRate, updateRecursiveRecipeCosts } from '@/utils';
import { Decimal } from '@prisma/client/runtime/client';

const NON_PERISHABLE_DATE = new Date('2099-12-31');
const IVA = 0.16; // 16% de IVA
const costTolerance = new Decimal(0.0001);


export class PurchaseService {

    async create(businessId: number, userId: number, data: CreatePurchaseInterface) {
        try {
            // =================================================================
            // Fase 0: AUTORIDAD DE TASA (LO NUEVO)
            // =================================================================
            
            // Obtenemos la tasa REAL que manda el servidor
            const currentRateRecord = await resolveBusinessExchangeRate(businessId, prisma);

            // Opcional: Validación estricta "Anti-Sorpresas"
            // Si el front mandó un ID viejo, lanzamos error para que refresquen.
            if (data.exchangeRateId && data.exchangeRateId !== currentRateRecord.id) {
                return { 
                    status: 409, // Conflict
                    message: 'La tasa de cambio ha variado durante la operación. Por favor recargue.', 
                    data: { newRate: currentRateRecord.rate } 
                };
            }

            // =================================================================
            // FASE 1: VALIDACIONES PARALELAS
            // =================================================================
            
            // --- RECOLECCIÓN DE IDS ÚNICOS ---
            const productIds = [...new Set(data.items.map(i => i.productId))];
            const depotIds = [...new Set(data.items.map(i => i.depotId))];
            const paymentMethodIds = [...new Set(data.payments.map(p => p.paymentMethodId))];
            const presentationIds = [...new Set(
                data.items.map(i => i.productPresentationId).filter((id): id is number => id != null)
            )];

            // --- CONSULTAS PARALELAS ---
            const [tax, supplier, products, depots, validPaymentMethods, presentations] = await Promise.all([
                prisma.tax.findUnique({ where: { id: data.taxId } }),

                prisma.supplier.findUnique({ where: { id: data.supplierId } }),

                prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, isPerishable: true, profitMargin: true, type: true, costPrice: true } }),

                prisma.depot.findMany({ where: { id: { in: depotIds } }, select: { id: true } }),
                
                data.payments.length > 0 
                    ? prisma.paymentMethod.findMany({ where: { id: { in: paymentMethodIds } }, select: { id: true, currency: true } })
                    : Promise.resolve([]),
                
                presentationIds.length > 0 
                    ? prisma.productPresentation.findMany({ where: { id: { in: presentationIds } }, select: { id: true, factor: true } })
                    : Promise.resolve([]),
            ]);
    
            // --- VALIDACIONES DE EXISTENCIA ---
            if (!tax) return { message: 'Impuesto no encontrado', status: 404, data: null };

            if (!supplier) return { message: 'Proveedor no encontrado', status: 404, data: null };

            if (!supplier.isActive) return { message: 'Proveedor inactivo', status: 400, data: null };
            
            if (products.length !== productIds.length) return { message: 'Uno o más productos no existen', status: 404, data: null };

            if (depots.length !== depotIds.length) return { message: 'Uno o más almacenes no existen', status: 404, data: null };

            if (presentations.length !== presentationIds.length) return { message: 'Una o más presentaciones no existen', status: 404, data: null };
            
            if (data.payments.length > 0 && validPaymentMethods.length !== paymentMethodIds.length) {
                return { message: 'Método de pago inválido', status: 404, data: null };
            }

            if (data.payments.length === 0 && data.condition !== 'CREDIT') {
                return { message: 'Debe registrar al menos un pago para la compra', status: 400, data: null };
            }   

            const compositeProduct = products.find(p => p.type === ProductType.COMPOSITE);
            if (compositeProduct) {
                return { 
                    status: 400, 
                    message: `No puedes comprar/ingresar stock directo del producto compuesto "${compositeProduct.name}". Debes comprar sus ingredientes.` 
                };
            }
    
            // Constantes convertidas a Decimal para operaciones
            const taxRate = new Decimal(tax.rate); // Asumo que IVA es 0.16 o similar
            const zero = new Decimal(0);
            const tolerance = new Decimal(0.01); // Reemplazo de EPSILON para tolerar redondeos mínimos

            // ==========================================
            // 1. CÁLCULO DEL SUBTOTAL (Matemática Pura)
            // ==========================================
            let calculatedSubTotal = new Decimal(0);
                        
            // 2. Perecederos
            for (const item of data.items) {
                const productInfo = products.find(p => p.id === item.productId);

                // Validar fecha de vencimiento
                if (productInfo?.isPerishable && !item.expirationDate) {
                    return { message: `El producto "${productInfo.name}" requiere fecha de vencimiento`, status: 400, data: null };
                }

                // Sumar al subtotal: (Cantidad * Costo Unitario)
                const qty = new Decimal(item.quantity);
                const cost = new Decimal(item.unitCost);
                
                calculatedSubTotal = calculatedSubTotal.add(qty.mul(cost));
            }

            // Convertimos los inputs del Frontend a Decimal para comparar
            const inputSubTotal = new Decimal(data.subTotal);
            const inputTax = new Decimal(data.taxAmount);
            const inputTotalCost = new Decimal(data.totalCost);
    
            // ==========================================
            // 2. VALIDACIONES DE INTEGRIDAD (Backend vs Frontend)
            // ==========================================

            // A. Validar Subtotal
            // Math.abs(calc - sent) > EPSILON  ===>  calc.sub(sent).abs().gt(tolerance)
            if (calculatedSubTotal.sub(inputSubTotal).abs().gt(tolerance)) {
                return {
                    message: `Error en montos del subtotal. Calculado: ${calculatedSubTotal}, Enviado: ${inputSubTotal}`,
                    status: 400,
                    data: null
                };
            }

            // B. Validar IVA
            // IMPORTANTE: Aplicamos redondeo fiscal (2 decimales) al resultado calculado
            const calculatedTax = calculatedSubTotal
                .mul(taxRate)
                .toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

            // Ahora sí comparamos peras con peras
            if (calculatedTax.sub(inputTax).abs().gt(tolerance)) {
                return {
                    message: `Error en montos del IVA. Calculado: ${calculatedTax.toFixed(2)}, Enviado: ${inputTax}`,
                    status: 400,
                    data: null
                };
            }

            // C. Validar Total
            const calculatedTotal = calculatedSubTotal.add(calculatedTax); // Sumamos el Subtotal (puro) + el Impuesto (ya redondeado)

            if (calculatedTotal.sub(inputTotalCost).abs().gt(tolerance)) {
                return {
                    message: `Error en montos del costo total. Calculado: ${calculatedTotal.toFixed(2)}, Enviado: ${inputTotalCost}`,
                    status: 400,
                    data: null
                }
            }

            // ==========================================
            // 3. PROCESAMIENTO DE PAGOS
            // ==========================================
            let totalPaidBase = new Decimal(0); // Dinero real entregado

            // Recorremos pagos para sumar
            for (const pay of data.payments) {
                const method = validPaymentMethods.find(pm => pm.id === pay.paymentMethodId);
                const amount = new Decimal(pay.amount);

                if (method?.currency === 'USD') {
                    totalPaidBase = totalPaidBase.add(amount);
                } else if (method?.currency === 'VES') {
                    // Conversión: Bs / Tasa
                    const rate = new Decimal(currentRateRecord.rate);
                    totalPaidBase = totalPaidBase.add(amount.div(rate));
                }
            }

            // Redondeo final a 2 decimales para evitar problemas de centavos infinitos
            // Equivale a Math.round(num * 100) / 100
            const totalPaidFinal = totalPaidBase.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
            const inputTotalFinal = inputTotalCost.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

            // Saldo Restante = Total a Pagar - Total Pagado
            const remainingBalance = inputTotalFinal.sub(totalPaidFinal);

            // ==========================================
            // 4. LÓGICA DE ESTADOS Y CRÉDITO
            // ==========================================
            let paymentStatus:
             'PENDING' | 'PARTIAL' | 'PAID' = 'PAID';
            
            // Si remainingBalance > 0 (Usamos .isPositive() o .gt(0))
            // OJO: Hay que tener cuidado con 0.0000001, mejor usar tolerancia o redondeo previo
            if (remainingBalance.gt(new Decimal(0.005))) { 
                
                // Si sobra deuda, debe ser CRÉDITO obligatoriamente
                if (data.condition !== 'CREDIT') {
                    return { status: 400, message: 'El monto pagado es menor al total, la compra debe marcarse como CRÉDITO.', data: null };
                }

                // Estado: Si pagó algo (>0) es PARCIAL, si no es PENDIENTE
                paymentStatus = totalPaidFinal.gt(0) ? 'PARTIAL' : 'PENDING';

                // Validar que las cuotas cubran la deuda
                if (!data.installments || data.installments.length === 0) {
                        return { status: 400, message: 'Una compra a crédito requiere definir cuotas de pago.', data: null };
                }

                // Sumar Cuotas
                const totalInstallments = data.installments.reduce(
                    (sum, inst) => sum.add(new Decimal(inst.amount)), 
                    new Decimal(0)
                );

                // Validar Cuotas vs Deuda
                if (totalInstallments.sub(remainingBalance).abs().gt(tolerance)) {
                    return { 
                        status: 400, 
                        message: `La suma de las cuotas (${totalInstallments.toFixed(2)}) no coincide con el saldo restante (${remainingBalance.toFixed(2)}).`, 
                        data: null 
                    };
                }

            } else {
                // Si no hay deuda (remainingBalance <= 0)
                
                // Validar si pagó de más (remainingBalance es negativo significativo)
                if (remainingBalance.isNegative() && remainingBalance.abs().gt(tolerance)) {
                        return { status: 400, message: 'Estás pagando más del costo total.', data: null };
                }

                paymentStatus = 'PAID';
            }
    
            // =================================================================
            // FASE 2: TRANSACCIÓN
            // =================================================================
            
            const result = await prisma.$transaction(async (tx) => {
                
                // A. Cabecera [ACTUALIZADO CON CRÉDITO]
                const purchase = await tx.purchase.create({
                    data: {
                        businessId,
                        taxId: data.taxId,
                        memberId: userId,
                        supplierId: data.supplierId,
                        exchangeRateId: currentRateRecord.id,
                        
                        subTotal: data.subTotal,
                        taxAmount: data.taxAmount,
                        totalCost: data.totalCost,
                        
                        reference: data.reference || "N/A",
                        observation: data.observation || "N/A",

                        // --- NUEVOS CAMPOS ---
                        conditions: data.condition, // CASH o CREDIT
                        paymentStatus: paymentStatus,
                        remainingBalance: remainingBalance,
                        // Asignamos la fecha de vencimiento general (la última cuota o hoy)
                        paymentDueDate: data.installments?.length 
                            ? new Date(data.installments[data.installments.length - 1].dueDate) 
                            : new Date()
                    }
                });

                // --- [NUEVO] CREACIÓN DE CUOTAS (Si aplica) ---
                if (data.condition === Conditions.CREDIT && data.installments) {

                    await tx.purchaseInstallment.createMany({
                        data: data.installments.map(inst => ({
                            purchaseId: purchase.id,
                            number: inst.number,
                            amount: inst.amount,
                            dueDate: new Date(inst.dueDate),
                            status: InstallmentStatus.PENDING
                        }))
                    });
                }
    
                // B. Procesar Items e Inventario
                for (const item of data.items) {
                    
                    // 1. Calcular Cantidad Real y Costo Unitario Real (Conversión a Decimal)
                    // Inicializamos con los valores que vienen del Frontend
                    let finalQuantity = new Decimal(item.quantity); 
                    let unitCostByPresentation = new Decimal(item.unitCost); // Costo por unidad base

                    // Lógica de Presentaciones (Cajas, Packs)
                    if (item.productPresentationId) {
                        const pres = presentations.find(p => p.id === item.productPresentationId);
                        if (pres) {
                            const factor = new Decimal(pres.factor);

                            // Ej: 2 Cajas * 12 factor = 24 unidades
                            finalQuantity = finalQuantity.mul(factor);
                            
                            // Ej: Caja $24 / 12 factor = $2 c/u
                            // Usamos .div() que es infinitamente más preciso que "/"
                            unitCostByPresentation = unitCostByPresentation.div(factor);
                        }
                    }
            
                    // Manejo de Fechas
                    const expiration = item.expirationDate ? new Date(item.expirationDate) : NON_PERISHABLE_DATE;

                    // 2. Crear PurchaseItem 
                    // Guardamos la evidencia de la compra tal cual la digitó el usuario
                    await tx.purchaseItem.create({
                        data: {
                            purchaseId: purchase.id,
                            productId: item.productId,
                            productPresentationId: item.productPresentationId || null,
                            quantity: new Decimal(item.quantity), // Guardamos lo que digitó (2 Cajas)
                            unitCost: new Decimal(item.unitCost), // Guardamos costo digitado ($24)
                            depotId: item.depotId,
                            expirationDate: expiration
                        }
                    });
            
                    // 3. GESTIÓN DE LOTES (StockLot)
                    // Buscamos si ya existe un lote con el MISMO costo unitario real y fecha de vencimiento
                    // Esto es vital para el método de valuación Promedio Ponderado o identificación específica.
                    let existingLot = await tx.stockLot.findFirst({
                        where: {
                            productId: item.productId,
                            depotId: item.depotId,
                            expirationDate: expiration,
                            // RANGO DE TOLERANCIA: Buscamos lotes que cuesten $2.0000 +/- 0.0001
                            lotCost: {
                                gte: unitCostByPresentation.sub(costTolerance),
                                lte: unitCostByPresentation.add(costTolerance),
                            } 
                        }
                    });
    
                    if (existingLot) {
                        // Si existe, sumamos al montón existente
                        await tx.stockLot.update({
                            where: { id: existingLot.id },
                            data: { quantity: { increment: finalQuantity } }
                        });
                    } else {
                        // Si es un precio nuevo o fecha nueva, creamos lote nuevo
                        const newLot = await tx.stockLot.create({
                            data: {
                                productId: item.productId,
                                depotId: item.depotId,
                                quantity: finalQuantity,        // 24 unidades
                                lotCost: unitCostByPresentation, // $2.0000...
                                expirationDate: expiration,
                                createdAt: new Date() // FIFO: La fecha de creación manda
                            }
                        });

                        existingLot = newLot; // Para usar en el Kardex más abajo
                    }

                    // 4. Actualización del Producto Maestro (Costo de Reposición / Último Costo)
                    const product = products.find(p => p.id === item.productId);
                    if (!product) throw new Error(`Producto ID ${item.productId} no encontrado en memoria`);

                    const currentMasterCost = new Decimal(product.costPrice);
                    
                    // Calculamos la diferencia absoluta entre el costo nuevo y el viejo
                    // | Viejo - Nuevo | > 0.0001 ?
                    const costDiff = currentMasterCost.sub(unitCostByPresentation).abs();

                    if (costDiff.gt(costTolerance)) {
        
                        console.log(`[PRECIO] Actualizando costo ${product.name}: ${currentMasterCost} -> ${unitCostByPresentation}`);

                        // 1. Actualizar el Producto Simple/Ingrediente
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                costPrice: unitCostByPresentation,
                                // Recalculamos venta. Nota: calculatePriceWithMarkup ya acepta Decimal gracias a tu refactor anterior
                                salePrice: calculatePriceWithMarkup(product.profitMargin, unitCostByPresentation)
                            }
                        });

                        // 2. EFECTO DOMINÓ (Recetas) 
                        // Si subió la carne, que suban las hamburguesas automáticamente.
                        await updateRecursiveRecipeCosts(tx, item.productId);
                    }

    
                    // 5. Kardex (StockMovement)
                    // Registro inmutable del movimiento físico
                    await tx.stockMovement.create({
                        data: {
                            businessId,
                            productId: item.productId,
                            memberId: userId,
                            depotId: item.depotId,
                            type: 'IN', 
                            quantity: finalQuantity,           // Entran 24
                            historicalCost: unitCostByPresentation, // A $2 c/u
                            reason: `Compra #${purchase.id}`, // Opcional: purchase.reference
                            date: new Date(),
                            stockLotId: existingLot ? existingLot.id : undefined
                        }
                    });
                }
    
                // C. Pagos (Abono inicial)
                if (data.payments.length > 0) {

                     await tx.purchasePayment.createMany({

                        data: data.payments.map(pay => ({
                            purchaseId: purchase.id,
                            paymentMethodId: pay.paymentMethodId,
                            amount: pay.amount,
                            exchangeRateId: currentRateRecord.id,
                            reference: pay.reference || "N/A"
                        }))
                    });
                }
    
                // Retorno
                return await tx.purchase.findUnique({
                    where: { id: purchase.id },
                    include: {
                        items: { include: { product: { select: { name: true } } } },
                        payments: true,
                        supplier: { select: { nameCompany: true } }
                    }
                });
            });
    
            return {
                status: 201,
                message: 'Compra registrada exitosamente',
                data: result
            };
    
        } catch (error) {
            console.error('Error create purchase:', error);
            return { status: 500, message: 'Error interno al procesar la compra', data: null };
        }
    }

    async findAll(businessId: number, query: FindPurchasesQuery) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const skip = (page - 1) * limit;
            const search = query.search ? String(query.search).trim() : undefined;

            // 1. Construcción Dinámica del WHERE
            const whereClause: any = { 
                businessId,
                // Opcional: Si quieres ocultar las compras borradas/canceladas
                // status: { not: 'CANCELLED' } 
            };

            // Filtro por Estado de Pago (Vital para reportes de deuda)
            if (query.paymentStatus) {
                whereClause.paymentStatus = query.paymentStatus;
            }

            // Filtro por Fechas
            if (query.fromDate && query.toDate) {
                whereClause.createdAt = { // Ojo: Usamos createdAt según tu schema
                    gte: new Date(query.fromDate),
                    lte: new Date(new Date(query.toDate).setHours(23, 59, 59))
                };
            }

            // Búsqueda Inteligente (Referencia O Proveedor)
            if (search) {
                whereClause.OR = [
                    { reference: { contains: search, mode: 'insensitive' } },
                    { supplier: { nameCompany: { contains: search, mode: 'insensitive' } } }
                ];
            }

            // 2. Consulta a BD
            const [purchases, total] = await Promise.all([
                prisma.purchase.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' }, // Por defecto: Lo más reciente primero
                    include: {
                        supplier: { 
                            select: { nameCompany: true, contactName: true } 
                        },
                        member: { 
                            include: { user: { select: { name: true } } } 
                        },
                        _count: { select: { items: true } }
                    }
                }),
                prisma.purchase.count({ where: whereClause })
            ]);

            // 3. Formateo de Datos (Aplanamos para facilitar el frontend)
            // Convertimos Decimal a number para JSON
            const formattedPurchases = purchases.map(p => ({
                ...p,
                subTotal: Number(p.subTotal),
                taxAmount: Number(p.taxAmount),
                totalCost: Number(p.totalCost),
                remainingBalance: Number(p.remainingBalance),
                // Calculamos días de vencimiento si es crédito y está pendiente
                isOverdue: p.paymentStatus !== 'PAID' && p.paymentDueDate && new Date(p.paymentDueDate) < new Date()
            }));

            return {
                status: 200,
                message: 'Historial de compras obtenido',
                data: formattedPurchases,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error(error);
            return { status: 500, message: 'Error interno', data: null };
        }
    }

    // 3. OBTENER DETALLE COMPLETO
    async findOne(businessId: number, id: number) {
        try {
            const purchase = await prisma.purchase.findFirst({
                where: { id, businessId },
                include: {
                    supplier: true,
                    member: { include: { user: { select: { name: true } } } },
                    exchangeRate: true, // Importante para saber a qué tasa se calculó
                    items: {
                        include: {
                            product: { select: { name: true, sku: true, imageUrl: true } },
                            depot: { select: { name: true } } // <--- CRÍTICO: Saber a qué almacén entró
                        }
                    },
                    payments: {
                        include: { paymentMethod: { select: { name: true } } }
                    }
                }
            });

            if (!purchase) {
                return { status: 404, message: 'Compra no encontrada', data: null };
            }

            return { status: 200, message: 'Compra encontrada', data: purchase };

        } catch (error) {
            console.error(error);
            return { status: 500, message: 'Error interno al obtener compra', data: null };
        }
    }

    async addPayment(businessId: number, purchaseId: number, data: CreatePaymentDto) {
        try {
            const result = await prisma.$transaction(async (tx) => {

                // 1. Consultas Iniciales
                const [exchangeRate, purchase, paymentMethod] = await Promise.all([
                    tx.exchangeRate.findUnique({ where: { id: data.exchangeRateId } }),

                    tx.purchase.findUnique({ where: { id: purchaseId, businessId } }),

                    tx.paymentMethod.findUnique({ where: { id: data.paymentMethodId } })
                ]);

                // 2. Validaciones
                if (!purchase) throw new BusinessError("Compra no encontrada", 404);
                
                if (purchase.paymentStatus === PaymentStatus.PAID) { 
                    throw new BusinessError("Esta compra ya está pagada por completo", 400);
                }
                
                if (!exchangeRate) throw new BusinessError("Tasa de cambio inválida", 400);

                if (!paymentMethod) throw new BusinessError("Método de pago inválido", 400);

                // 3. Normalización (USD Base)
                let paymentInBaseCurrency = new Decimal(data.amount); // Monto enviado por frontend

                const rate = new Decimal(exchangeRate.rate);

                // Conversión de Moneda
                if (paymentMethod.currency !== Currency.USD) {

                    if (rate.lte(0)) throw new BusinessError("Tasa de cambio inválida (<= 0)", 400);
                    
                    // Si pagó en Bs, dividimos entre tasa para obtener USD
                    paymentInBaseCurrency = paymentInBaseCurrency.div(rate);
                }

                // Redondeo final a 2 decimales para consistencia contable
                paymentInBaseCurrency = paymentInBaseCurrency.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

                // 4. Validación de Sobrepago
                const currentDebt = new Decimal(purchase.remainingBalance);

                const tolerance = new Decimal(0.05); // Margen de error pequeño

                // Si el pago > Deuda + Tolerancia
                if (paymentInBaseCurrency.gt(currentDebt.add(tolerance))) {
                    throw new BusinessError(`El monto supera la deuda pendiente ($${currentDebt})`, 400);
                }

                // 5. Crear Pago (Registro Histórico)
                const newPayment = await tx.purchasePayment.create({
                    data: {
                        purchaseId,
                        paymentMethodId: data.paymentMethodId,
                        exchangeRateId: exchangeRate.id,
                        amount: new Decimal(data.amount), // Guardamos el monto original (ej: 1000 Bs)
                        reference: data.reference || "N/A"
                    }
                });

                // 6. Cascada de Cuotas (Abono Inteligente)
                if (purchase.conditions === Conditions.CREDIT) {
    
                    const pendingInstallments = await tx.purchaseInstallment.findMany({
                        where: { 
                            purchaseId: purchaseId,
                            status: { not: InstallmentStatus.PAID } 
                        },
                        orderBy: { dueDate: 'asc' }
                    });

                    let moneyDistributor = paymentInBaseCurrency; // Dinero disponible

                    for (const inst of pendingInstallments) {
                        // Si ya no hay dinero (tolerancia mínima), terminamos
                        if (moneyDistributor.lte(new Decimal(0.001))) break;

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

                        // E. Actualizamos la Base de Datos
                        await tx.purchaseInstallment.update({
                            where: { id: inst.id },
                            data: {
                                status: isFullyPaid ? InstallmentStatus.PAID : InstallmentStatus.PARTIAL,
                                amountPaid: newAmountPaid,
                                // Solo ponemos fecha si se completó, o actualizamos la fecha del último abono
                                paidAt: isFullyPaid ? new Date() : undefined 
                            }
                        });

                        // F. CRÍTICO: Restamos a la bolsa SOLO LO QUE PAGAMOS AHORA
                        moneyDistributor = moneyDistributor.sub(amountToPayNow);
                    }
                }

                // 7. Actualización Global de la Compra
                // Nueva Deuda = Deuda Vieja - Pago
                let newBalance = currentDebt.sub(paymentInBaseCurrency);
                
                // Si quedó negativo por centavos, lo forzamos a 0
                if (newBalance.isNegative()) {
                    newBalance = new Decimal(0);
                }

                let newStatus: PaymentStatus = purchase.paymentStatus;

                // Si debe menos de 5 centavos, consideramos pagado
                if (newBalance.lte(tolerance)) {
                    newStatus = PaymentStatus.PAID;
                    newBalance = new Decimal(0); // Limpieza final
                } else {
                    newStatus = PaymentStatus.PARTIAL;
                }

                await tx.purchase.update({
                    where: { id: purchaseId },
                    data: {
                        remainingBalance: newBalance,
                        paymentStatus: newStatus
                    }
                });

                return {
                    payment: newPayment,
                    newBalance: newBalance,
                    status: newStatus,
                    message: newStatus === PaymentStatus.PAID ? '¡Compra pagada totalmente!' : 'Abono registrado'
                };
            });

            return { status: 200, message: 'Pago registrado exitosamente', data: result };

        } catch (error) {
            console.error('Error addPurchasePayment:', error);
            if (error instanceof BusinessError) {
                return { status: error.status, message: error.message, data: null };
            }
            return { status: 500, message: 'Error interno al registrar pago', data: null };
        }
    }

    async findPayables(businessId: number) {
        try {
            const debts = await prisma.purchase.findMany({
                where: {
                    businessId,
                    conditions: 'CREDIT', // Solo compras a crédito
                    // FILTRO CLAVE: Solo traer lo que debemos (Saldo > 0)
                    /*remainingBalance: {
                        gt: 0 
                    },*/
                    // Excluimos compras anuladas
                    status: {
                        not: 'CANCELLED'
                    }
                },
                select: {
                    id: true,
                    reference: true,
                    totalCost: true,
                    remainingBalance: true,
                    paymentStatus: true,
                    createdAt: true, 
                    supplier: {
                        select: {
                            nameCompany: true,
                            contactName: true,
                            phone: true // Útil para llamar a cobrar/pagar
                        }
                    },
                    // ✅ LO NUEVO: Traer las cuotas de la compra
                    installments: {
                        orderBy: {
                            number: 'asc'
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
                    // 1) Primero las NO pagadas (PENDING, PARTIAL), luego PAID
                    // (Funciona porque el enum PaymentStatus está ordenado: PENDING < PARTIAL < PAID)
                    { paymentStatus: 'asc' },
                    // 2) Dentro de cada grupo, las más antiguas primero
                    { createdAt: 'asc' }
                ]
            });

            if (debts.length === 0) {
                return {
                    message: 'No tienes deudas pendientes con proveedores',
                    status: 200,
                    data: []
                };
            }

            // Mapeo para frontend
            const mappedDebts = debts.map(p => ({
                id: p.id,
                invoiceNumber: p.reference || "S/N", 
                
                supplierName: p.supplier.nameCompany,
                contact: p.supplier.contactName,
                supplierPhone: p.supplier.phone,
                
                totalDebt: Number(p.totalCost),
                pendingDebt: Number(p.remainingBalance),
                // Calculamos lo pagado
                paidAmount: Number(p.totalCost) - Number(p.remainingBalance),
                
                status: p.paymentStatus,
                issueDate: p.createdAt, // Fecha emisión
                
                // ✅ Mapeamos las cuotas para el Frontend
                installments: p.installments.map(ins => ({
                    id: ins.id,
                    number: ins.number,
                    amount: Number(ins.amount),
                    dueDate: ins.dueDate,
                    status: ins.status,
                    paidAt: ins.paidAt
                }))
            }));

            return { 
                message: 'Cuentas por pagar obtenidas exitosamente',
                status: 200,
                data: mappedDebts
            };

        } catch (error) {
            console.error('Error findPayables:', error);
            return { status: 500, message: 'Error interno', data: null };
        }
    }
    
    async getPurchasePaymentDetails(businessId: number, purchaseId: number) {
        try {
            // 1. Obtener Compra + Proveedor + Cuotas (Todo en una sola consulta)
            const purchase = await prisma.purchase.findUnique({
                where: { id: purchaseId, businessId },
                include: {
                    supplier: {
                        select: { nameCompany: true, contactName: true }
                    },
                    installments: {
                        orderBy: { number: 'asc' }
                    }
                }
            });

            if (!purchase) {
                return { status: 404, message: 'Compra no encontrada', data: null };
            }

            // 2. Buscar Pagos Realizados (Historial)
            const payments = await prisma.purchasePayment.findMany({
                where: { purchaseId },
                include: {
                    paymentMethod: {
                        select: { name: true, type: true, currency: true }
                    },
                    exchangeRate: { select: { rate: true } }
                },
                orderBy: { paymentDate: 'desc' } // Cronología inversa
            });

            // 3. Cálculos Financieros del Resumen
            const totalCost = Number(purchase.totalCost);
            const remainingBalance = Number(purchase.remainingBalance);
            const totalPaid = totalCost - remainingBalance;

            // 4. Mapeo del Historial (ESTANDARIZADO con Ventas)
            const formattedHistory = payments.map(p => {
                const rate = Number(p.exchangeRate.rate);
                const originalAmount = Number(p.amount);
                
                // Calculamos el equivalente en USD (Moneda Base)
                const usdEquivalent = p.paymentMethod.currency === 'VES' 
                    ? originalAmount / rate 
                    : originalAmount;

                return {
                    id: p.id,
                    // ✅ Estandarizamos a 'date' para que el componente genérico funcione
                    date: p.paymentDate, 
                    methodName: p.paymentMethod.name,
                    methodType: p.paymentMethod.type,
                    reference: p.reference,
                    currency: p.paymentMethod.currency,
                    
                    // ✅ Mismos nombres que en Ventas
                    originalAmount: originalAmount,
                    rateUsed: rate,
                    usdEquivalent: Number(usdEquivalent.toFixed(2))
                };
            });

            // 5. Mapeo del Plan de Cuotas (Plan)
            const formattedPlan = purchase.installments.map(i => ({
                id: i.id,
                number: i.number,
                amount: Number(i.amount),
                amountPaid: Number(i.amountPaid),
                dueDate: i.dueDate,
                status: i.status,
                paidAt: i.paidAt
            }));

            return {
                status: 200,
                message: 'Detalle financiero obtenido',
                data: {
                    // Info básica de la cabecera
                    purchaseInfo: {
                        invoiceNumber: purchase.reference, // Nro Factura Proveedor
                        supplierName: purchase.supplier.nameCompany,
                        status: purchase.paymentStatus,
                        isCredit: purchase.conditions === 'CREDIT'
                    },
                    // Los 3 cuadros de resumen
                    summary: {
                        totalDebt: totalCost,
                        currentDebt: remainingBalance,
                        totalPaid: Number(totalPaid.toFixed(2))
                    },
                    // Las dos listas para las pestañas
                    plan: formattedPlan,
                    history: formattedHistory
                }
            };

        } catch (error) {
            console.error('Error getPurchasePaymentDetails:', error);
            return { status: 500, message: 'Error interno', data: null };
        }
    }
}