import { prisma } from '@/configs';
import { CreateSaleInterface, UpdateSaleInterface } from './interfaces';
import { PaymentStatus, SaleConditions, SaleStatus, SaleType } from '@prisma/client';

export class SaleService {

    async create(businessId: number, memberId: number, data: CreateSaleInterface) {
        try {
            // =================================================================
            // FASE 1: VALIDACIONES PARALELAS
            // =================================================================
            
            const productIds = [...new Set(data.items.map(i => i.productId))];
            const paymentMethodIds = [...new Set(data.payments.map(p => p.paymentMethodId))];

            // Validaciones paralelas
            const [exchangeRate, client, member, products, validPaymentMethods] = await Promise.all([
                prisma.exchangeRate.findUnique({ where: { id: data.exchangeRateId } }),
                prisma.client.findUnique({ where: { id: data.clientId } }),
                prisma.businessMember.findFirst({ 
                    where: { id: memberId, businessId },
                    include: { user: { select: { name: true } } }
                }),
                prisma.product.findMany({ 
                    where: { id: { in: productIds }, businessId, isActive: true },
                    select: { id: true, name: true, isService: true, businessId: true }
                }),
                data.payments.length > 0 
                    ? prisma.paymentMethod.findMany({ 
                        where: { id: { in: paymentMethodIds }, isActive: true },
                        select: { id: true } 
                    })
                    : Promise.resolve([])
            ]);

            // Validaciones
            if (!exchangeRate) {
                return { message: 'La tasa de cambio no existe', status: 404, data: null };
            }

            if (!client) {
                return { message: 'El cliente no existe', status: 404, data: null };
            }

            if (client.businessId !== businessId) {
                return { message: 'El cliente no pertenece a este negocio', status: 403, data: null };
            }

            if (!member) {
                return { message: 'El vendedor no existe o no pertenece a este negocio', status: 404, data: null };
            }

            if (products.length !== productIds.length) {
                const foundIds = products.map(p => p.id);
                const missingIds = productIds.filter(id => !foundIds.includes(id));
                return { message: `Los productos [${missingIds.join(', ')}] no existen o no pertenecen a este negocio`, status: 404, data: null };
            }

            if (data.payments.length > 0 && validPaymentMethods.length !== paymentMethodIds.length) {
                return { message: 'Uno o más métodos de pago no existen o están inactivos', status: 404, data: null };
            }


            // Validar stock disponible (solo para productos no servicios)
            for (const item of data.items) {
                const product = products.find(p => p.id === item.productId);
                
                if (!product) continue;
                
                if (product.isService) continue; // Los servicios no tienen stock
                
                // Obtener stock total del producto (suma de todos los lotes)
                const stockLots = await prisma.stockLot.findMany({
                    where: { productId: item.productId },
                    select: { quantity: true }
                });
                
                const totalStock = stockLots.reduce((sum, lot) => sum + lot.quantity, 0);
                
                if (totalStock < item.quantity) {
                    return {
                        message: `Stock insuficiente para el producto "${product.name}". Disponible: ${totalStock}, Solicitado: ${item.quantity}`,
                        status: 400,
                        data: null
                    };
                }
            }

            // -----------------------------------------------------------------
            // 3. CÁLCULO DE TOTALES (La "Autoridad" es el Backend)
            // -----------------------------------------------------------------
            const TAX_RATE = 0.16; // ⚠️ OJO: Esto debería venir de config DB

            let calculatedSubTotal = 0;
            let calculatedTax = 0;

            // Recorremos los items para calcular montos reales
            const processedItems = data.items.map(item => {
                const product = products.find(p => p.id === item.productId);
                // Aquí podrías validar si el precio coincide con DB, pero asumimos precio libre por ahora.
                
                const subTotal = item.quantity * item.unitPrice;
                const tax = subTotal * TAX_RATE; // Aquí aplicas exenciones si el producto lo requiere
                
                calculatedSubTotal += subTotal;
                calculatedTax += tax;

                return {
                    ...item,
                    isService: product?.isService || false, // Guardamos esto para usarlo luego
                    calculatedSubTotal: subTotal,
                    calculatedTax: tax
                };
            });

            const finalTotalAmount = calculatedSubTotal + calculatedTax;

            // Validación Anti-Hackeo: ¿El frontend calculó bien?
            if (Math.abs(finalTotalAmount - data.totalAmount) > 0.05) {
                return {
                    status: 400,
                    message: `Error en montos. Frontend envió ${data.totalAmount}, pero el cálculo real es ${finalTotalAmount}`,
                    data: null
                };
            }
            // A. Normalizar Pagos a Moneda Base (USD)
            const totalPaidInBaseCurrency = data.payments.reduce((acc, payment) => {
                if (payment.currency === 'USD') {
                    return acc + payment.amount;
                } else {
                    // Validación de seguridad por si la tasa es 0 o null
                    const rate = Number(exchangeRate.rate);
                    if (!rate || rate <= 0) throw new Error("Tasa de cambio inválida para conversión");
                    
                    return acc + (payment.amount / rate);
                }
            }, 0);

            // Redondeo de seguridad
            const totalPaidFinal = Math.round(totalPaidInBaseCurrency * 100) / 100;

            // B. Validar Montos según Condición (CASH vs CREDIT)
            let initialPaymentStatus: PaymentStatus = PaymentStatus.PENDING;

            if (data.conditions === SaleConditions.CASH) {
                // Si es Contado, deben pagar TODO (+/- 0.05 por redondeo)
                if (Math.abs(data.totalAmount - totalPaidFinal) > 0.05) {
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
                initialPaymentStatus = totalPaidFinal > 0.5 ? PaymentStatus.PARTIAL : PaymentStatus.PENDING;
                
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
                        taxAmount: calculatedTax,
                        discount: data.discount || 0,
                        totalAmount: finalTotalAmount,

                        remainingBalance: data.conditions === SaleConditions.CREDIT 
                        ? finalTotalAmount - totalPaidFinal
                        : 0,
                        paymentDueDate: data.paymentDueDate ? new Date(data.paymentDueDate) : null
                    }
                });

                // C. Insertar Items y manejar lotes (FIFO)
                for (const item of data.items) {
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

                    // Para productos físicos: usar FIFO
                    let remainingQuantity = item.quantity;
                    
                    // Obtener lotes ordenados por fecha de expiración (FIFO/FEFO)
                    const availableLots = await tx.stockLot.findMany({
                        where: { productId: item.productId },
                        orderBy: [
                            { expirationDate: 'asc' }, // Más antiguos primero
                            { createdAt: 'asc' } // Si misma fecha, más antiguos primero
                        ]
                    });

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
                                
                                // CORRECCIÓN: Usamos el depot del lote actual
                                depotId: lot.depotId, 
                                
                                type: 'OUT',
                                quantity: quantityToTake,
                                
                                // CLAVE FINANCIERA: Usamos el costo real de este lote específico
                                historicalCost: lot.lotCost, // Asegúrate que este campo exista en tu DB
                                
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

        } catch (error) {
            console.error('Error al crear la venta:', error);
            
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
