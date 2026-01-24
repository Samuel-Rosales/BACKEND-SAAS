import { prisma } from '@/configs';
import { CreatePaymentDto, CreatePurchaseInterface } from './interfaces';
import { Conditions, Currency, InstallmentStatus, MovementType, PaymentStatus, ProductType } from '@prisma/client';
import { BusinessError, calculatePriceWithMargin, resolveBusinessExchangeRate, updateRecursiveRecipeCosts } from '@/utils';

const NON_PERISHABLE_DATE = new Date('2099-12-31');
const IVA = 0.16; // 16% de IVA
const EPSILON = 0.02; // Margen de error aceptable en validaciones monetarias


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
            const [supplier, products, depots, validPaymentMethods, presentations] = await Promise.all([

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
            if (!supplier) return { message: 'Proveedor no encontrado', status: 404, data: null };

            if (!supplier.isActive) return { message: 'Proveedor inactivo', status: 400, data: null };
            
            if (products.length !== productIds.length) return { message: 'Uno o más productos no existen', status: 404, data: null };

            if (depots.length !== depotIds.length) return { message: 'Uno o más almacenes no existen', status: 404, data: null };

            if (presentations.length !== presentationIds.length) return { message: 'Una o más presentaciones no existen', status: 404, data: null };
            
            if (data.payments.length > 0 && validPaymentMethods.length !== paymentMethodIds.length) {
                return { message: 'Método de pago inválido', status: 404, data: null };
            }

            if (data.payments.length === 0) {
                return { message: 'Debe registrar al menos un pago para la compra', status: 400, data: null };
            }   

            const compositeProduct = products.find(p => p.type === ProductType.COMPOSITE);
            if (compositeProduct) {
                return { 
                    status: 400, 
                    message: `No puedes comprar/ingresar stock directo del producto compuesto "${compositeProduct.name}". Debes comprar sus ingredientes.` 
                };
            }
    
            // --- VALIDACIONES LÓGICAS ---
    
            // 1. Matemática (Subtotal)
            let calculatedSubTotal = 0;
            
            // 2. Perecederos
            for (const item of data.items) {

                const productInfo = products.find(p => p.id === item.productId);
                
                // Validar fecha de vencimiento
                if (productInfo?.isPerishable && !item.expirationDate) {
                    return { message: `El producto "${productInfo.name}" requiere fecha de vencimiento`, status: 400, data: null };
                }
    
                // Sumar al subtotal calculado
                calculatedSubTotal += (item.quantity * item.unitCost);
            }
    
            if (Math.abs(calculatedSubTotal - data.subTotal) > EPSILON) {
                return {
                    message: `Error en montos del subtotal. Calculado: ${calculatedSubTotal}, Enviado: ${data.subTotal}`,
                    status: 400,
                    data: null
                };
            }

            if (Math.abs(calculatedSubTotal * IVA - data.taxAmount) > EPSILON) {
                return {
                    message: `Error en montos del IVA. Calculado: ${calculatedSubTotal * IVA}, Enviado: ${data.taxAmount}`,
                    status: 400,
                    data: null
                };
            }

            if (Math.abs(calculatedSubTotal + (calculatedSubTotal * IVA) - data.totalCost) > EPSILON) {
                return {
                    message: `Error en montos del costo total. Calculado: ${calculatedSubTotal + (calculatedSubTotal * IVA)}, Enviado: ${data.totalCost}`,
                    status: 400,
                    data: null
                }
            }

            let totalPaidBase = 0; // Dinero real entregado (Abono inicial)

            // Recorremos pagos para sumar
            for (const pay of data.payments) {

                const method = validPaymentMethods.find(pm => pm.id === pay.paymentMethodId);

                // ... validaciones de moneda ...
                if (method?.currency === 'USD') {
                    totalPaidBase += pay.amount;
                } else if (method?.currency === 'VES') {
                    totalPaidBase += pay.amount / Number(currentRateRecord.rate);
                }
            }
            
            // Redondeo
            const totalPaidFinal = Math.round(totalPaidBase * 100) / 100;
            const remainingBalance = Math.round((data.totalCost - totalPaidFinal) * 100) / 100;

            // Lógica de Estados
            let paymentStatus: 'PENDING' | 'PARTIAL' | 'PAID' = 'PAID';
            
            if (remainingBalance > 0) {
                // Si sobra deuda, debe ser CRÉDITO obligatoriamente
                if (data.condition !== 'CREDIT') {
                    return { status: 400, message: 'El monto pagado es menor al total, la compra debe marcarse como CRÉDITO.', data: null };
                }

                paymentStatus = totalPaidFinal > 0 ? 'PARTIAL' : 'PENDING';

                // Validar que las cuotas cubran la deuda
                if (!data.installments || data.installments.length === 0) {
                     return { status: 400, message: 'Una compra a crédito requiere definir cuotas de pago.', data: null };
                }

                const totalInstallments = data.installments.reduce((sum, inst) => sum + inst.amount, 0);

                if (Math.abs(totalInstallments - remainingBalance) > EPSILON) {
                    return { status: 400, message: `La suma de las cuotas (${totalInstallments}) no coincide con el saldo restante (${remainingBalance}).`, data: null };
                }

            } else {
                // Si no hay deuda
                if (Math.abs(remainingBalance) > EPSILON && remainingBalance < 0) {
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
                    
                    // 1. Calcular Cantidad Real y Costo Unitario Real
                    let finalQuantity = item.quantity;
                    let unitCostByPresentation = item.unitCost; // Costo por unidad base

                    if (item.productPresentationId) {
                        const pres = presentations.find(p => p.id === item.productPresentationId);
                        if (pres) {
                            // Ej: Compro 2 Cajas (quantity=2). Factor=12.
                            // finalQuantity = 24 unidades.
                            finalQuantity = item.quantity * Number(pres.factor);
                            
                            // Ej: Caja cuesta $24. Factor=12.
                            // unitCostByPresentation = $2.
                            unitCostByPresentation = item.unitCost / Number(pres.factor);
                        }
                    }
            
                    const expiration = item.expirationDate ? new Date(item.expirationDate) : NON_PERISHABLE_DATE;
            
                    // 2. Crear PurchaseItem 
                    // MANTENEMOS DATOS DE FACTURA (Aquí NO usamos el costo unitario, sino el de compra)
                    await tx.purchaseItem.create({
                        data: {
                            purchaseId: purchase.id,
                            productId: item.productId,
                            productPresentationId: item.productPresentationId || null,
                            quantity: item.quantity, 
                            unitCost: item.unitCost, // $24 (Precio de la caja)
                            depotId: item.depotId,
                            expirationDate: expiration
                        }
                    });
            
                    // 3. GESTIÓN DE LOTES (StockLot)
                    // [CORRECCIÓN]: Usamos unitCostByPresentation, no item.unitCost
                    const existingLot = await tx.stockLot.findFirst({
                        where: {
                            productId: item.productId,
                            depotId: item.depotId,
                            expirationDate: expiration,
                            // Importante: Buscamos lotes que cuesten lo mismo UNITARIAMENTE ($2)
                            // Usamos un rango pequeño (EPSILON) por si hay decimales flotantes
                            lotCost: { equals: unitCostByPresentation } 
                        }
                    });
    
                    if (existingLot) {

                        await tx.stockLot.update({
                            where: { id: existingLot.id },
                            data: { quantity: { increment: finalQuantity } }
                        });
                    } else {

                        await tx.stockLot.create({
                            data: {
                                productId: item.productId,
                                depotId: item.depotId,
                                quantity: finalQuantity, // 24 unidades
                                lotCost: unitCostByPresentation, // $2 (Costo real unitario)
                                expirationDate: expiration,
                                createdAt: new Date()
                            }
                        });
                    }

                    // 4. Actualización del Producto Maestro
                    const product = products.find(p => p.id === item.productId);
                    if (!product) throw new Error('Producto no encontrado en inventario');

                    // [OPTIMIZACIÓN]: Solo actualizamos si el costo cambia significativamente (> 0.01)
                    // Esto evita escrituras innecesarias en base de datos.
                    const currentCost = Number(product.costPrice);
                    const costDiff = Math.abs(currentCost - unitCostByPresentation);

                    if (costDiff > 0.001) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                costPrice: unitCostByPresentation,
                                // Recalculamos precio de venta basado en el nuevo costo
                                salePrice: calculatePriceWithMargin(Number(product.profitMargin), unitCostByPresentation)
                            }
                        });

                        // ============================================================
                        // [IMPORTANTE - TAREA PENDIENTE]
                        // Aquí acabas de cambiar el precio de un INGREDIENTE (ej: Carne).
                        // Si tienes Productos Compuestos (ej: Hamburguesa) que usan Carne,
                        // su costo ahora está desactualizado.
                        //
                        // Deberías llamar aquí a una función auxiliar (fuera de este loop si es posible)
                        // Ej: await this.updateCompositeProductCosts(tx, item.productId);
                        // ============================================================
                        await updateRecursiveRecipeCosts(tx, item.productId);
                    }

    
                    // 5. Kardex (StockMovement)
                    // [CORRECCIÓN]: Usamos finalQuantity y unitCostByPresentation
                    await tx.stockMovement.create({
                        data: {
                            businessId,
                            productId: item.productId,
                            memberId: userId,
                            depotId: item.depotId,
                            type: 'IN', // O tu enum MovementType.IN
                            quantity: finalQuantity, // Entran 24 unidades
                            historicalCost: unitCostByPresentation, // A $2 cada una
                            reason: `Compra #${purchase.id}`, // O purchase.reference
                            date: new Date()
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

    async findAll(businessId: number, query: { page?: number; limit?: number; fromDate?: string; toDate?: string }) {
        try {
            const page = Number(query.page) || 1;
            const limit = Number(query.limit) || 20; // 20 por página por defecto
            const skip = (page - 1) * limit;

            // Filtro de fechas (Opcional pero recomendado)
            const whereClause: any = { businessId };
            
            if (query.fromDate && query.toDate) {
                whereClause.date = {
                    gte: new Date(query.fromDate), // Desde las 00:00
                    lte: new Date(new Date(query.toDate).setHours(23, 59, 59)) // Hasta el final del día
                };
            }

            // Hacemos 2 consultas en paralelo: Datos y Conteo Total
            const [purchases, total] = await Promise.all([
                prisma.purchase.findMany({
                    where: whereClause,
                    skip: skip,
                    take: limit,
                    include: {
                        supplier: { select: { nameCompany: true } },
                        member: { include: { user: { select: { name: true } } } },
                        // Traemos el totalCost y status para mostrar en la tabla
                        exchangeRate: { select: { rate: true, /* currency: true*/ } }, 
                        _count: { select: { items: true } }
                    },
                    orderBy: { date: 'desc' }
                }),
                
                prisma.purchase.count({ where: whereClause })
            ]);

            return {
                status: 200,
                message: 'Compras obtenidas',
                data: purchases,
                meta: { // Metadata para que el frontend dibuje los botones de paginación
                    total,
                    page,
                    lastPage: Math.ceil(total / limit)
                }
            };

        } catch (error) {
            console.error(error);
            return { status: 500, message: 'Error interno al listar compras', data: null };
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
                tx.purchase.findUnique({ 
                    where: { id: purchaseId, businessId }
                }),
                tx.paymentMethod.findUnique({ where: { id: data.paymentMethodId } })
            ]);

            // 2. Validaciones
            if (!purchase) throw new BusinessError("Compra no encontrada", 404);
            
            // USO CORRECTO DEL ENUM AQUÍ
            if (purchase.paymentStatus === PaymentStatus.PAID) { 
                throw new BusinessError("Esta compra ya está pagada por completo", 400);
            }
            
            if (!exchangeRate) throw new BusinessError("Tasa de cambio inválida", 400);
            if (!paymentMethod) throw new BusinessError("Método de pago inválido", 400);

            // 3. Normalización (USD Base)
            let paymentInBaseCurrency = data.amount;

            // USO CORRECTO DEL ENUM AQUÍ
            if (paymentMethod.currency !== Currency.USD) {
                const rate = Number(exchangeRate.rate);
                if (!rate || rate <= 0) throw new BusinessError("Tasa de cambio inválida", 400);
                paymentInBaseCurrency = data.amount / rate;
            }

            paymentInBaseCurrency = Math.round(paymentInBaseCurrency * 100) / 100;

            // 4. Sobrepago
            if (paymentInBaseCurrency > (Number(purchase.remainingBalance) + 0.05)) {
                throw new BusinessError(`El monto supera la deuda pendiente`, 400);
            }

            // 5. Crear Pago
            const newPayment = await tx.purchasePayment.create({
                data: {
                    purchaseId,
                    paymentMethodId: data.paymentMethodId,
                    exchangeRateId: exchangeRate.id,
                    amount: data.amount,
                    reference: data.reference || "N/A"
                }
            });

            // 6. Cascada de Cuotas
            // USO CORRECTO DEL ENUM AQUÍ
            if (purchase.conditions === Conditions.CREDIT) {
                
                const pendingInstallments = await tx.purchaseInstallment.findMany({
                    where: { 
                        purchaseId: purchaseId,
                        // USO CORRECTO DEL ENUM AQUÍ
                        status: { not: InstallmentStatus.PAID } 
                    },
                    orderBy: { dueDate: 'asc' }
                });

                let moneyDistributor = paymentInBaseCurrency;

                for (const inst of pendingInstallments) {
                    if (moneyDistributor <= 0.01) break;

                    const amountPending = Number(inst.amount);

                    if (moneyDistributor >= (amountPending - 0.01)) {
                        await tx.purchaseInstallment.update({
                            where: { id: inst.id },
                            data: { 
                                // USO CORRECTO DEL ENUM AQUÍ
                                status: InstallmentStatus.PAID,
                                paidAt: new Date()
                            }
                        });
                        moneyDistributor -= amountPending;
                    } 
                }
            }

            // 7. Actualización Global
            const newBalance = Number(purchase.remainingBalance) - paymentInBaseCurrency;
            const finalBalance = newBalance < 0 ? 0 : newBalance;

            let newStatus: PaymentStatus = purchase.paymentStatus;

            // [AQUÍ ESTABA EL ERROR]
            // Debes usar el Enum, no el string literal
            if (finalBalance <= 0.05) {
                newStatus = PaymentStatus.PAID; // <--- CORREGIDO
            } else {
                newStatus = PaymentStatus.PARTIAL; // <--- CORREGIDO
            }

            await tx.purchase.update({
                where: { id: purchaseId },
                data: {
                    remainingBalance: finalBalance,
                    paymentStatus: newStatus
                }
            });

            return {
                payment: newPayment,
                newBalance: finalBalance,
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
}