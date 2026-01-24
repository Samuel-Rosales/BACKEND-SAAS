import { prisma } from '@/configs';
import { CreateSaleInterface, CreateSalePaymentDto, UpdateSaleInterface } from './interfaces';
import { PaymentStatus, Conditions, SaleStatus, SaleType, ProductType, Prisma, MovementType, Currency, InstallmentStatus } from '@prisma/client';
import { BusinessError } from '@/utils/catch-errors.util';
import { resolveBusinessExchangeRate } from '@/utils';
import { Decimal } from '@prisma/client/runtime/client';

const EPSILON = 0.02;

export class SaleService {

    // =================================================================
    // MÉTODO PRINCIPAL: CREAR VENTA
    // =================================================================
    async create(businessId: number, memberId: number, data: CreateSaleInterface) {
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

            // =================================================================
            // FASE 1: CARGA DE DATOS Y VALIDACIONES
            // =================================================================
            
            // 1. Cargar Cliente y Vendedor
            const [client, member] = await Promise.all([
                prisma.client.findFirst({ where: { id: data.clientId, businessId } }),
                prisma.businessMember.findFirst({ where: { id: memberId, businessId } })
            ]);

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
                const taxRate = item.product.tax?.rate ? new Decimal(item.product.tax.rate) : new Decimal(0);

                // rate > 0 ---> .gt(0)
                if (taxRate.gt(0)) {
                    // Fórmula: Base * (Tasa / 100)
                    // Ejemplo: 100 * (16 / 100) = 16
                    lineTax = lineNetAmount.mul(taxRate.div(100));
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
                    quantityToDeductFromStock: new Decimal(item.quantity).mul(item.factor).toNumber(),
                    
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
                if (diff.abs().gt(0.05)) {
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

            // Si la deuda es mayor a 5 centavos (tolerancia)
            if (remainingBalance.gt(0.05)) {
                // Si ya pagó algo (mayor a 0), es PARCIAL, si no, es PENDIENTE
                derivedPaymentStatus = totalPaidFinal.gt(0) 
                    ? PaymentStatus.PARTIAL 
                    : PaymentStatus.PENDING;
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

                // C. Crear Cuotas (Solo Crédito)
                if (data.condition === Conditions.CREDIT && data.installments) {
                    await tx.saleInstallment.createMany({
                        data: data.installments.map(inst => ({
                            saleId: sale.id,
                            number: inst.number,
                            amount: inst.amount,
                            dueDate: new Date(inst.dueDate),
                            status: 'PENDING'
                        }))
                    });
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
                        data.depotId
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
                            reference: p.reference || "N/A"
                        }))
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
        quantityToRemove: number,
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
                if (remainingToDeduct <= 0) break;

                // Tomamos lo que hay en el lote o lo que falta (lo menor de los dos)
                const deduction = Math.min(lot.quantity, remainingToDeduct);

                // A. Actualizar Lote (Restar cantidad)
                await tx.stockLot.update({
                    where: { id: lot.id },
                    data: { quantity: { decrement: deduction } }
                });

                // B. Trazabilidad (Vincular Lote específico con Item de Venta)
                await tx.saleItemLot.create({
                    data: {
                        saleItemId: saleItemId,
                        stockLotId: lot.id,
                        quantity: deduction
                    }
                });

                // C. Kardex (Histórico de Movimiento)
                await tx.stockMovement.create({
                    data: {
                        businessId,
                        productId: product.id,
                        memberId: memberId,
                        depotId: lot.depotId, // Importante: Guardamos de qué deposito salió este lote
                        type: MovementType.OUT,
                        quantity: deduction,
                        historicalCost: lot.lotCost, // Costo real al momento de compra (FIFO)
                        reason: `Venta #${saleId}`
                    }
                });

                remainingToDeduct -= deduction;
            }

            // Safety Check: Aunque validamos antes, si alguien robó el stock milisegundos antes, esto explota aquí.
            if (remainingToDeduct > 0) {
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

            for (const comp of product.components) {
                // Calculamos cuánto del ingrediente necesitamos
                const ingredientQty = quantityToRemove * Number(comp.quantity);

                const childProduct = await tx.product.findUnique({
                    where: { id: comp.childProductId },
                    // Importante: Traer componentes del hijo por si es una receta dentro de otra receta
                    include: { components: { include: { child: true } } } 
                });

                if (!childProduct) throw new BusinessError(`Ingrediente ID ${comp.childProductId} no encontrado`, 500);

                // Recursividad con Contexto
                // Pasamos el MISMO depotId para que los ingredientes salgan del mismo almacén que el padre
                await this.processStockExit(
                    tx, 
                    businessId, 
                    memberId, 
                    saleId, 
                    saleItemId, 
                    childProduct, 
                    ingredientQty, 
                    depotId // <--- Pasamos el filtro hacia abajo
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
        items: any[], // Tus items procesados
        depotId: number // Opcional
    ): Promise<void> {

        // 1. Aplanamos la lista de necesidades (Desglosamos Recetas)
        // Map: ProductID -> Cantidad Total Requerida
        const requirements = new Map<number, number>();

        for (const item of items) {
            await this.accumulateRequirements(tx, requirements, item.product, item.quantityToDeductFromStock);
        }

        // 2. Consultamos Stock Físico en Masa (Bulk Query)
        const productIds = Array.from(requirements.keys());
        
        // Agrupamos por producto para saber el TOTAL disponible en los almacenes elegidos
        const stockSummary = await tx.stockLot.groupBy({
            by: ['productId'],
            _sum: { quantity: true },
            where: {
                productId: { in: productIds },
                quantity: { gt: 0 },
                ...(depotId ? { depotId } : {}) // Filtro opcional
            }
        });

        // 3. Comparamos Requerido vs Disponible
        for (const [productId, requiredQty] of requirements.entries()) {
            const stock = stockSummary.find(s => s.productId === productId);
            const available = stock?._sum.quantity || 0;

            if (available < requiredQty) {
                // Buscamos el nombre para dar un error amigable
                const prodName = items.find(i => i.productId === productId)?.product.name 
                    || `Producto ID ${productId} (Ingrediente)`;
                    
                throw new BusinessError(
                    `Stock insuficiente para "${prodName}". Requerido: ${requiredQty}, Disponible: ${available}`, 
                    409
                );
            }
        }
    }

    // Helper Recursivo para desglosar recetas
    private async accumulateRequirements(
        tx: Prisma.TransactionClient,
        map: Map<number, number>,
        product: any,
        qtyNeeded: number
    ) {
        if (product.type === ProductType.SIMPLE) {
            if (product.isService) return; // Ignorar servicios

            const current = map.get(product.id) || 0;
            map.set(product.id, current + qtyNeeded);
        } 
        else if (product.type === ProductType.COMPOSITE) {
            // Si es receta, buscamos sus componentes
            // NOTA: Asumimos que 'product' ya viene con 'components' cargados en la query inicial (FASE 1)
            if (product.components) {
                for (const comp of product.components) {
                    // Obtenemos el hijo (Ingrediente)
                    // OJO: Aquí podrías necesitar una pequeña query si el hijo no está cargado profundamente,
                    // pero idealmente deberías cargar niveles necesarios en Fase 1.
                    // Para simplificar, asumiremos que haces un fetch rápido si falta data.
                    
                    const childProduct = await tx.product.findUnique({
                        where: { id: comp.childProductId },
                        include: { components: true } // Para recursividad multinivel
                    });
                    
                    if (childProduct) {
                        const ingredientQty = qtyNeeded * Number(comp.quantity);
                        await this.accumulateRequirements(tx, map, childProduct, ingredientQty);
                    }
                }
            }
        }
    }

    // 2. LISTAR VENTAS (CON PAGINACIÓN Y FILTROS)
    async findAll(businessId: number, query: { page?: number; limit?: number; fromDate?: string; toDate?: string; clientId?: number; status?: string }) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20;
            const skip = (page - 1) * limit;

            const whereClause: any = { businessId };
            
            if (query.fromDate && query.toDate) {
                whereClause.createdAt = {
                    gte: new Date(query.fromDate),
                    lte: new Date(new Date(query.toDate).setHours(23, 59, 59))
                };
            }

            if (query.clientId) {
                whereClause.clientId = Number(query.clientId);
            }

            if (query.status) {
                whereClause.status = query.status;
            }

            const [sales, total] = await Promise.all([
                prisma.sale.findMany({
                    where: whereClause,
                    skip,
                    take: limit,
                    include: {
                        client: { select: { name: true, ci: true } },
                        member: { include: { user: { select: { name: true } } } },
                        exchangeRate: { select: { rate: true, /* currency: true */ } },
                        _count: { select: { items: true, payments: true } }
                    },
                    orderBy: { createdAt: 'desc' }
                }),
                prisma.sale.count({ where: whereClause })
            ]);

            return {
                status: 200,
                message: 'Ventas obtenidas exitosamente',
                data: sales,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error('Error al listar ventas:', error);
            return { status: 500, message: 'Error interno al listar ventas', data: null };
        }
    }

    // 3. OBTENER DETALLE COMPLETO
    async findOne(businessId: number, id: number) {
        try {
            const sale = await prisma.sale.findFirst({
                where: { id, businessId },
                include: {
                    client: true,
                    member: { include: { user: { select: { name: true, ci: true } } } },
                    exchangeRate: true,
                    items: {
                        include: {
                            product: { select: { name: true, sku: true, imageUrl: true } },
                            productPresentation: { select: { name: true, factor: true } },
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
                            exchangeRate: { select: { rate: true, /* currency: true */ } }
                        }
                    }
                }
            });

            if (!sale) {
                return { status: 404, message: 'Venta no encontrada', data: null };
            }

            return { status: 200, message: 'Venta obtenida exitosamente', data: sale };

        } catch (error) {
            console.error('Error al obtener venta:', error);
            return { status: 500, message: 'Error interno al obtener venta', data: null };
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
                    tx.sale.findUnique({ 
                        where: { id: saleId, businessId },
                        // No traemos installments aquí para optimizar, los buscamos solo si es necesario
                    }),
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
                let paymentInBaseCurrency = data.amount;
                
                // USO CORRECTO DEL ENUM (Currency)
                if (paymentMethod.currency !== Currency.USD) {
                    const rate = Number(exchangeRate.rate);
                    if (!rate || rate <= 0) throw new BusinessError("Tasa de cambio inválida para conversión", 400);
                    paymentInBaseCurrency = data.amount / rate;
                }
        
                // Redondeo a 2 decimales
                paymentInBaseCurrency = Math.round(paymentInBaseCurrency * 100) / 100;
        
                // 4. Validar sobrepago
                if (paymentInBaseCurrency > (Number(sale.remainingBalance) + 0.05)) {
                    throw new BusinessError(`El monto ($${paymentInBaseCurrency}) supera la deuda pendiente ($${sale.remainingBalance})`, 400);
                }
        
                // 5. Crear el registro del Pago (Histórico)
                const newPayment = await tx.salePayment.create({
                    data: {
                        saleId,
                        paymentMethodId: data.paymentMethodId,
                        exchangeRateId: exchangeRate.id,
                        amount: data.amount, // Guardamos el monto original
                        reference: data.reference || "N/A"
                    }
                });

                // =================================================================
                // 6. LÓGICA DE CASCADA DE CUOTAS (Waterfall)
                // =================================================================
                
                // USO CORRECTO DEL ENUM (Conditions)
                if (sale.conditions === Conditions.CREDIT) {
                    
                    // A. Buscamos cuotas pendientes (FIFO)
                    const pendingInstallments = await tx.saleInstallment.findMany({
                        where: { 
                            saleId: saleId,
                            // USO CORRECTO DEL ENUM (InstallmentStatus)
                            status: { not: InstallmentStatus.PAID } 
                        },
                        orderBy: { dueDate: 'asc' } // Primero vence, primero se paga
                    });

                    // B. Distribuimos el dinero
                    let moneyDistributor = paymentInBaseCurrency;

                    for (const inst of pendingInstallments) {
                        
                        // Si se acabó el dinero, paramos
                        if (moneyDistributor <= 0.01) break; 

                        const amountPending = Number(inst.amount);
                        
                        // Si el dinero alcanza para cubrir esta cuota...
                        if (moneyDistributor >= (amountPending - 0.01)) {
                            
                            // 1. Marcar cuota como PAGADA
                            await tx.saleInstallment.update({
                                where: { id: inst.id },
                                data: { 
                                    status: InstallmentStatus.PAID,
                                    paidAt: new Date()
                                }
                            });

                            // 2. Restar del distribuidor
                            moneyDistributor -= amountPending;
                        } 
                        // Si no alcanza, el loop sigue y la cuota queda PENDING (o podrías implementar parciales a futuro)
                    }
                }

                // =================================================================
                // 7. Actualización Global (Saldo y Estado de Venta)
                // =================================================================

                const newBalance = Number(sale.remainingBalance) - paymentInBaseCurrency;
                const finalBalance = newBalance < 0 ? 0 : newBalance;
        
                // DECLARACIÓN EXPLÍCITA DEL TIPO (Para evitar error de TS)
                let newStatus: PaymentStatus = sale.paymentStatus;
                
                // Si debe menos de 5 centavos, lo consideramos PAGADO
                if (finalBalance <= 0.05) {
                    newStatus = PaymentStatus.PAID;
                } else {
                    newStatus = PaymentStatus.PARTIAL;
                }
        
                await tx.sale.update({
                    where: { id: saleId },
                    data: {
                        remainingBalance: finalBalance,
                        paymentStatus: newStatus
                    }
                });
        
                return {
                    payment: newPayment,
                    newBalance: finalBalance,
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
                // Truco Senior: No traigas las que ya están pagadas para no saturar la vista
                /*paymentStatus: {
                not: 'PAID' 
                },*/
                // Opcional: Asegurar que el saldo sea mayor a 0 por integridad
                remainingBalance: {
                gt: 0 
                }
            },
            select: {
                id: true,
                receiptNumber: true,
                totalAmount: true,
                remainingBalance: true,
                paymentDueDate: true,
                paymentStatus: true,
                client: {
                    select: {
                        name: true, // Necesitamos el nombre para la tabla
                        phone: true
                    }
                }
            },
            orderBy: {
                paymentDueDate: 'asc' // Mostrar primero las que vencen pronto
            }
        });

        if ( credits.length === 0 ) {
            return {
                message: 'No hay créditos pendientes',
                status: 200,
                data: []
            };
        }

        // Mapeamos para que el frontend reciba números limpios y structure plana
        const mappedCredits = credits.map(sale => ({
            id: sale.id,
            saleId: sale.receiptNumber,
            clientName: sale.client.name,
            totalAmount: Number(sale.totalAmount),
            // Calculamos lo pagado restando el total del saldo pendiente
            paidAmount: Number(sale.totalAmount) - Number(sale.remainingBalance), 
            dueDate: sale.paymentDueDate,
            status: sale.paymentStatus
        }));

        return { 
            message: 'Créditos obtenidos exitosamente',
            status: 200,
            data: mappedCredits
        }} catch (error) {
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
            // 1. Validar que la venta exista y pertenezca al negocio
            // Necesitamos 'totalAmount' y 'remainingBalance' para el resumen financiero
            const sale = await prisma.sale.findUnique({
                where: { id: saleId, businessId },
                select: {
                    id: true,
                    receiptNumber: true,
                    totalAmount: true,
                    remainingBalance: true,
                    paymentStatus: true
                }
            });

            if (!sale) {
                return {
                    status: 404,
                    message: 'Venta no encontrada',
                    data: null
                };
            }

            // 2. Buscar los pagos relacionados
            // Incluimos PaymentMethod y ExchangeRate para mostrar detalles ricos
            const payments = await prisma.salePayment.findMany({
                where: { saleId },
                include: {
                    paymentMethod: {
                        select: { name: true, type: true, currency: true } // Ej: "Zelle Banesco"
                    },
                    exchangeRate: {
                        select: { rate: true } // Ej: 50.00
                    }
                },
                orderBy: {
                    date: 'desc' // Lo más reciente primero (Cronología inversa)
                }
            });

            // 3. Preparar el Resumen Financiero
            const totalAmount = Number(sale.totalAmount);
            const remainingBalance = Number(sale.remainingBalance);
            const totalPaid = totalAmount - remainingBalance;

            // 4. Mapear los pagos para el Frontend (DTO de Salida)
            const formattedPayments = payments.map(p => {

                const rate = Number(p.exchangeRate.rate);
                const originalAmount = Number(p.amount);
                
                // Calculamos cuánto representó este pago en la moneda base (USD)
                // Si fue VES, dividimos. Si fue USD, es igual.
                const usdEquivalent = p.paymentMethod.currency === 'VES' 
                    ? originalAmount / rate 
                    : originalAmount;

                return {
                    id: p.id,
                    date: p.date,
                    
                    // Detalles del Método
                    methodName: p.paymentMethod.name,
                    methodType: p.paymentMethod.type, // Útil para poner íconos en el front
                    reference: p.reference,

                    // Detalles Financieros
                    currency: p.paymentMethod.currency,
                    originalAmount: originalAmount, // Ej: 1000 (Bs)
                    rateUsed: rate,                 // Ej: 50.00
                    
                    // Dato clave para auditoría: ¿Cuánto restó de la deuda real?
                    usdEquivalent: Math.round(usdEquivalent * 100) / 100 
                };
            });

            return {
                status: 200,
                message: 'Historial obtenido correctamente',
                data: {
                    saleInfo: {
                        receiptNumber: sale.receiptNumber,
                        status: sale.paymentStatus
                    },
                    summary: {
                        totalDebt: Number(sale.totalAmount),
                        currentDebt: Number(sale.remainingBalance),
                        totalPaid: Math.round(totalPaid * 100) / 100
                    },
                    history: formattedPayments
                }
            };

        } catch (error) {
            console.error('Error al obtener historial de pagos:', error);
            return {
                status: 500,
                message: 'Error interno al obtener el historial',
                data: null
            };
        }
    }
}
