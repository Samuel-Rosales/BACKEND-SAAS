import { prisma } from '@/configs';
import { CreateSaleInterface, SalePaymentDto, UpdateSaleInterface } from './interfaces';
import { PaymentStatus, SaleConditions, SaleStatus, SaleType } from '@prisma/client';

const IVA = 0.16;

export class SaleService {

    async create(businessId: number, memberId: number, data: CreateSaleInterface) {
        try {
            // =================================================================
            // FASE 1: VALIDACIONES PARALELAS
            // =================================================================
            
            // --- RECOLECCIÓN DE IDS ÚNICOS ---
            const productIds = [...new Set(data.items.map(i => i.productId))];
            const paymentMethodIds = [...new Set(data.payments.map(p => p.paymentMethodId))];
            const presentationIds = [...new Set(
                data.items.map(i => i.productPresentationId).filter((id): id is number => id != null)
            )];

            // --- CONSULTAS PARALELAS ---
            const [exchangeRate, client, member, products, validPaymentMethods, presentations] = await Promise.all([

                prisma.exchangeRate.findUnique({ where: { id: data.exchangeRateId } }),

                prisma.client.findUnique({ where: { id: data.clientId } }),

                prisma.businessMember.findFirst({ where: { id: memberId, businessId }, include: { user: { select: { name: true } } }}),

                prisma.product.findMany({ where: { id: { in: productIds }, businessId, isActive: true }, select: { id: true, name: true, isService: true, businessId: true, salePrice: true } }),

                data.payments.length > 0 
                    ? prisma.paymentMethod.findMany({ where: { id: { in: paymentMethodIds }, isActive: true }, select: { id: true } })
                    : Promise.resolve([]),
                
                presentationIds.length > 0
                    ? prisma.productPresentation.findMany({ where: { id: { in: presentationIds } }, select: { id: true, productId: true, factor: true, price: true } })
                    : Promise.resolve([]),
            ]);

            // --- VALIDACIONES DE EXISTENCIA ---
            if (!exchangeRate) { return { message: 'La tasa de cambio no existe', status: 404, data: null };}

            if (!client) { return { message: 'El cliente no existe', status: 404, data: null }; }

            if (client.businessId !== businessId) return { message: 'El cliente no pertenece a este negocio', status: 403, data: null };
            
            if (!member) return { message: 'El vendedor no existe o no pertenece a este negocio', status: 404, data: null };
                
            if (products.length !== productIds.length) {
                const foundIds = products.map(p => p.id);

                const missingIds = productIds.filter(id => !foundIds.includes(id));

                return { message: `Los productos [${missingIds.join(', ')}] no existen o no pertenecen a este negocio`, status: 404, data: null };
            }

            if (data.payments.length > 0 && validPaymentMethods.length !== paymentMethodIds.length) {
                return { message: 'Uno o más métodos de pago no existen o están inactivos', status: 404, data: null };
            }

            // --- VALIDACIONES LÓGICAS ---

            // Validar stock disponible (solo para productos no servicios)
            for (const item of data.items) {
                const product = products.find(p => p.id === item.productId);
                
                if (!product) {
                    throw new Error(`Inconsistencia: Producto ID ${item.productId} no encontrado en validaciones previas`);   
                }

                if (product.isService) continue; // Los servicios no tienen stock
                
                // Obtener stock total del producto (suma de todos los lotes)
                const stockLots = await prisma.stockLot.findMany({ where: { productId: item.productId }, select: { quantity: true }});
                
                const totalStock = stockLots.reduce((sum, lot) => sum + lot.quantity, 0);
                
                if (totalStock < item.quantity) {
                    return {
                        message: `Stock insuficiente para el producto (${product.name}). Disponible: ${totalStock}, Solicitado: ${item.quantity}`,
                        status: 400,
                        data: null
                    };
                }
            }

            // 3. CÁLCULO DE TOTALES (La "Autoridad" es el Backend)
            let calculatedSubTotal = 0;

            // Recorremos los items para calcular montos reales
            for (const item of data.items) {

                const product = products.find(p => p.id === item.productId);
                
                if (!product) {
                    throw new Error(`Inconsistencia: Producto ID ${item.productId} no encontrado en validaciones previas`);
                }
                
                if (item.productPresentationId) {
                    const presentation = presentations.find(p => p.id === item.productPresentationId);

                    console.log("Precio presentación: ", Number(presentation?.price));
                    console.log("Precio enviado: ", item.unitPrice);

                    if (!presentation || Number(presentation.price) !== Number(item.unitPrice)) {
                        return {
                            status: 400,
                            message: `El precio de la presentación seleccionada para el producto (${product.name}) es inválido. Diferencia con precio base.`,
                            data: null
                        };
                    }
                } else {

                    if (Number(product.salePrice) !== Number(item.unitPrice)) {
                        return {
                            status: 400,
                            message: `El precio de la presentación seleccionada para el producto (${product.name}) es inválido. Diferencia con precio base.`,
                            data: null
                        };
                    }

                }
                
                calculatedSubTotal += (item.quantity * item.unitPrice);
            }

            // Subtotal
            if (Math.abs(calculatedSubTotal - data.subTotal) > 0.01) {
                return {
                    status: 400,
                    message: `Error en montos del subtotal. Calculado: ${calculatedSubTotal}, Enviado: ${data.subTotal}`,
                    data: null
                };
            }

            // Impuesto (IVA)
            if (Math.abs(calculatedSubTotal * IVA - data.taxAmount) > 0.01) {
                return {
                    status: 400,
                    message: `Error en montos del IVA. Calculado: ${calculatedSubTotal * IVA}, Enviado: ${data.taxAmount}`,
                    data: null
                };
            }

            // Total final
            if (Math.abs(calculatedSubTotal + (calculatedSubTotal * IVA) - data.totalAmount) > 0.01) {
                return {
                    message: `Error en montos del costo total. Calculado: ${calculatedSubTotal + (calculatedSubTotal * IVA)}, Enviado: ${data.totalAmount}`,
                    status: 400,
                    data: null
                }
            }

            // A. Normalizar Pagos a Moneda Base (USD)
            const totalPaidInBaseCurrency = data.payments.reduce((acc, payment) => {

                if (payment.currency === 'USD') {

                    return acc + payment.amount;

                } else {
                    const rate = Number(exchangeRate.rate);

                    if (!rate || rate <= 0) throw new Error("Tasa de cambio inválida para conversión");
                    
                    return acc + (payment.amount / rate);
                }
            }, 0);

            const totalPaidFinal = Math.round(totalPaidInBaseCurrency * 100) / 100;

            // B. Validar Montos según Condición (CASH vs CREDIT)
            let initialPaymentStatus: PaymentStatus = PaymentStatus.PENDING;

            if (data.conditions === SaleConditions.CASH) {
                // Si es Contado, deben pagar TODO (+/- 0.01 por redondeo)
                if (Math.abs(data.totalAmount - totalPaidFinal) > 0.01) {
                    return {
                        status: 400,
                        message: `Monto incompleto para venta de Contado. Total a pagar: $${data.totalAmount}, Recibido (al cambio): $${totalPaidFinal}`,
                        data: null
                    };
                }

                initialPaymentStatus = PaymentStatus.PAID;

            } else if (data.conditions === SaleConditions.CREDIT) {
                // Validar fecha de pago obligatoria
                if (!data.paymentDueDate) {
                    return { status: 400, message: 'Venta a crédito requiere fecha de vencimiento', data: null };
                }

                // Definir estado inicial
                initialPaymentStatus = totalPaidFinal > 0.1 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
                
                // Opcional: Evitar que paguen de más
                if (totalPaidFinal > data.totalAmount) {
                    return { status: 400, message: 'El abono inicial supera el total de la venta', data: null };
                }
            }

            // =================================================================
            // FASE 2: TRANSACCIÓN
            // =================================================================
            
            const result = await prisma.$transaction(async (tx) => {

                // A. Obtener el siguiente número de recibo (consecutivo)
                const lastSale = await tx.sale.findFirst({
                    where: { businessId },
                    orderBy: { receiptNumber: 'desc' },
                    select: { receiptNumber: true }
                });
                
                const receiptNumber = lastSale ? lastSale.receiptNumber + 1 : 1;

                // B. Crear Cabecera de Venta
                const sale = await tx.sale.create({
                    data: {
                        businessId,
                        receiptNumber,
                        memberId,
                        clientId: data.clientId,
                        exchangeRateId: exchangeRate.id,

                        type: data.type || SaleType.RETAIL,
                        status: SaleStatus.COMPLETED,
                        conditions: data.conditions,
                        paymentStatus: initialPaymentStatus,

                        subTotal: calculatedSubTotal,
                        taxAmount: data.taxAmount,
                        discount: data.discount || 0,
                        totalAmount: data.totalAmount,

                        remainingBalance: data.conditions === SaleConditions.CREDIT 
                        ? data.totalAmount - totalPaidFinal
                        : 0,
                        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null
                    }
                });

                // C. Insertar Items y manejar lotes (FIFO)
                for (const item of data.items) {

                    let remainingQuantity = item.quantity;
                    let availableLots = []; 

                    if (item.productPresentationId) {
                        const presentation = presentations.find(p => p.id === item.productPresentationId);
                        if (presentation) {
                            // Ajustar cantidad según el factor de la presentación
                            remainingQuantity = item.quantity * Number(presentation.factor);
                        }
                    } 


                    // A. DECISIÓN: ¿Selección Manual o Automática (FIFO)?
                    if (item.stockLotId) {
                        // === MODO MANUAL (Lote específico) ===
                        // Buscamos SOLO el lote que pidió el usuario
                        const specificLot = await tx.stockLot.findUnique({
                            where: { id: item.stockLotId }
                        });

                        // Validaciones de seguridad obligatorias para modo manual
                        if (!specificLot) {
                            throw new Error(`El lote específico ID ${item.stockLotId} no existe.`);
                        }
                        
                        if (specificLot.productId !== item.productId) {
                            throw new Error(`El lote ID ${item.stockLotId} no corresponde al producto que se está vendiendo.`);
                        }
                        
                        // Verificamos si alcanza el stock en ese lote específico
                        if (specificLot.quantity < remainingQuantity) {
                            // En modo manual, si no alcanza, solemos fallar y avisar.
                            throw new Error(`Stock insuficiente en el lote seleccionado. Disponible: ${specificLot.quantity}, Requerido: ${remainingQuantity}`);
                        }

                        // Si todo bien, nuestra lista de lotes disponibles es solo este.
                        availableLots = [specificLot];

                    } else {
                        // === MODO AUTOMÁTICO (FIFO) ===
                        // Comportamiento actual: Traemos todos los lotes con stock, ordenados por fecha
                        availableLots = await tx.stockLot.findMany({
                            where: { 
                                productId: item.productId,
                                quantity: { gt: 0 } 
                            },
                            orderBy: [
                                { expirationDate: 'asc' }, 
                                { createdAt: 'asc' }
                            ]
                        });
                    }

                    const product = products.find(p => p.id === item.productId);
                    
                    // Si es servicio, no necesita stock
                    if (product?.isService) {
                        await tx.saleItem.create({
                            data: {
                                saleId: sale.id,
                                productId: item.productId,
                                productPresentationId: item.productPresentationId || null,
                                quantity: item.quantity,
                                unitPrice: item.unitPrice,
                                subTotal: item.subTotal
                            }
                        });
                        continue;
                    }

                    // Crear el SaleItem primero
                    const saleItem = await tx.saleItem.create({
                        data: {
                            saleId: sale.id,
                            productId: item.productId,
                            productPresentationId: item.productPresentationId || null,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            subTotal: item.subTotal
                        }
                    });

                    // Asignar lotes (FIFO)
                    for (const lot of availableLots) {
                        if (remainingQuantity <= 0) break;

                        const quantityToTake = Math.min(remainingQuantity, Number(lot.quantity)); // Asegurar number

                        // 1. Crear relación SaleItem - Lote
                        await tx.saleItemLot.create({
                            data: {
                                saleItemId: saleItem.id,
                                stockLotId: lot.id,
                                quantity: quantityToTake
                            }
                        });

                        // 2. Reducir stock del lote
                        await tx.stockLot.update({
                            where: { id: lot.id },
                            data: { quantity: { decrement: quantityToTake } }
                        });

                        // 3. Registrar movimiento en el Kardex (Detallado por lote)
                        await tx.stockMovement.create({
                            data: {
                                businessId,
                                productId: item.productId,
                                memberId,
                                depotId: lot.depotId, 
                                
                                type: 'OUT',
                                quantity: quantityToTake,
                                
                                // CLAVE FINANCIERA: Usamos el costo real de este lote específico
                                historicalCost: lot.lotCost,
                                reason: `Venta #${sale.receiptNumber}`
                            }
                        });

                        remainingQuantity -= quantityToTake;
                    }

                    // Validación final de integridad
                    if (remainingQuantity > 0) {
                        throw new Error(`Inconsistencia: Stock insuficiente para producto ID ${item.productId}`);
                    } 
                }

                // D. Insertar Pagos
                if (data.payments.length > 0) {
                    await tx.salePayment.createMany({
                        data: data.payments.map(pay => ({
                            saleId: sale.id,
                            paymentMethodId: pay.paymentMethodId,
                            amount: pay.amount,
                            currency: pay.currency,
                            exchangeRateId: exchangeRate.id,
                            reference: pay.reference || "N/A"
                        }))
                    });
                }

                // Retornar la venta creada con relaciones
                return await tx.sale.findUnique({
                    where: { id: sale.id },
                    include: {
                        client: { select: { name: true, ci: true } },
                        member: { include: { user: { select: { name: true } } } },
                        exchangeRate: true,
                        items: {
                            include: {
                                product: { select: { name: true, sku: true, imageUrl: true } },
                                productPresentation: { select: { name: true, factor: true } }
                            }
                        },
                        payments: {
                            include: {
                                paymentMethod: { select: { name: true, type: true } },
                                exchangeRate: { select: { rate: true, currency: true } }
                            }
                        }
                    }
                });
            });

            return {
                message: 'Venta registrada exitosamente',
                status: 201,
                data: result
            };

        } catch (error: any) {
            console.error('Error al crear la venta:', error);

            if (
                error.message.includes("Stock insuficiente") || 
                error.message.includes("El lote") ||
                error.message.includes("Inconsistencia")
            ) {
                return {
                    message: error.message,
                    status: 400,
                    data: null
                };
            }
            
            return {
                message: 'Error interno al procesar la venta',
                status: 500,
                data: null
            };
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
                        exchangeRate: { select: { rate: true, currency: true } },
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
                            exchangeRate: { select: { rate: true, currency: true } }
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

    async addPayment(businessId: number, saleId: number, data: SalePaymentDto) {
        try {
            const result = await prisma.$transaction(async (tx) => {
                
                // 1. Buscar la venta y cuánto debe ACTUALMENTE
                const sale = await tx.sale.findUnique({
                    where: { id: saleId, businessId }
                });
        
                if (!sale) throw new Error("Venta no encontrada");
                if (sale.paymentStatus === PaymentStatus.PAID) throw new Error("Esta venta ya está pagada por completo");
        
                // 2. Buscar la Tasa del día (Porque puede pagar hoy con una tasa distinta a la de la venta original)
                const exchangeRate = await tx.exchangeRate.findUnique({
                    where: { id: data.exchangeRateId }
                });
                if (!exchangeRate) throw new Error("Tasa de cambio inválida");
        
                // 3. Normalizar el Pago a Dólares (Moneda Base)
                let paymentInBaseCurrency = data.amount;
                
                if (data.currency !== 'USD') {
                    // Si paga en Bolívares, convertimos a Dólares con la tasa DE HOY
                    const rate = Number(exchangeRate.rate);
                    paymentInBaseCurrency = data.amount / rate;
                }
        
                // Redondeo a 2 decimales
                paymentInBaseCurrency = Math.round(paymentInBaseCurrency * 100) / 100;
        
                // 4. Validar que no esté pagando de más
                // Usamos un pequeño margen de error (0.05) por los decimales
                if (paymentInBaseCurrency > (Number(sale.remainingBalance) + 0.05)) {
                    throw new Error(`El monto ($${paymentInBaseCurrency}) supera la deuda pendiente ($${sale.remainingBalance})`);
                }
        
                // 5. Crear el registro del Pago (La "Cuota")
                const newPayment = await tx.salePayment.create({
                    data: {
                        saleId,
                        paymentMethodId: data.paymentMethodId,
                        exchangeRateId: exchangeRate.id, // Guardamos la tasa de HOY
                        amount: data.amount,             // Lo que pagó (ej. 1000 Bs)
                        currency: data.currency,         // Moneda (VES)
                        reference: data.reference || "N/A"
                    }
                });
        
                // 6. Calcular Nuevo Saldo
                // Restamos lo que pagó (convertido a USD) al saldo anterior
                const newBalance = Number(sale.remainingBalance) - paymentInBaseCurrency;
                
                // Asegurar que no quede negativo por milésimas (ej: -0.00001)
                const finalBalance = newBalance < 0 ? 0 : newBalance;
        
                // 7. Determinar Nuevo Estado
                let newStatus: PaymentStatus = sale.paymentStatus;
                if (finalBalance <= 0.05) { // Margen de error
                    newStatus = PaymentStatus.PAID;
                } else {
                    newStatus = PaymentStatus.PARTIAL;
                }
        
                // 8. Actualizar la Venta Principal
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
            
            return {
                status: 200,
                message: 'Pago agregado exitosamente',
                data: result
            };
        } catch (error) {
            console.error('Error al agregar pago:', error);
            return {
                status: 500,
                message: 'Error interno al agregar pago',
                data: null
            };
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
}
