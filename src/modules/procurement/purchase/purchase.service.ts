import { prisma } from '@/configs';
import { CreatePurchaseInterface } from './interfaces';

const NON_PERISHABLE_DATE = new Date('2099-12-31');

export class PurchaseService {

    async create(businessId: number, userId: number, data: CreatePurchaseInterface) {
        try {
            // =================================================================
            // FASE 1: VALIDACIONES PARALELAS (Mucho más rápido) ⚡
            // =================================================================
            
            const productIds = [...new Set(data.items.map(i => i.productId))];
            const depotIds = [...new Set(data.items.map(i => i.depotId))];
            const paymentMethodIds = [...new Set(data.payments.map(p => p.paymentMethodId))];

            // LANZAMOS TODAS LAS CONSULTAS DE LECTURA AL MISMO TIEMPO
            const [exchangeRate, supplier, products, depots, validPaymentMethods] = await Promise.all([
                // 1. Tasa
                prisma.exchangeRate.findUnique({ where: { id: data.exchangeRateId } }),
                // 2. Proveedor
                prisma.supplier.findUnique({ where: { id: data.supplierId } }),
                // 3. Productos
                prisma.product.findMany({ 
                    where: { id: { in: productIds } }, 
                    select: { id: true, name: true, isPerishable: true } 
                }),
                // 4. Almacenes
                prisma.depot.findMany({ where: { id: { in: depotIds } }, select: { id: true } }),
                // 5. Métodos de Pago (si hay)
                data.payments.length > 0 
                    ? prisma.paymentMethod.findMany({ where: { id: { in: paymentMethodIds } }, select: { id: true } })
                    : Promise.resolve([]) 
            ]);

            // --- A PARTIR DE AQUÍ HACEMOS LOS CHEQUEOS EN MEMORIA (Es instantáneo) ---

            // Chequeo Tasa
            if (!exchangeRate) {
                return { message: 'La tasa de cambio no existe', status: 404, data: null };
            }

            // Chequeo Proveedor
            if (!supplier) {
                return { message: 'El proveedor no existe', status: 404, data: null };
            }
            if (!supplier.isActive) {
                return { message: 'El proveedor está inactivo', status: 400, data: null };
            }

            // Chequeo Productos
            if (products.length !== productIds.length) {
                const foundIds = products.map(p => p.id);
                const missingIds = productIds.filter(id => !foundIds.includes(id));
                return { message: `Los productos [${missingIds.join(', ')}] no existen`, status: 404, data: null };
            }

            // Chequeo Almacenes
            if (depots.length !== depotIds.length) {
                return { message: 'Uno o más almacenes no existen', status: 404, data: null };
            }

            // Chequeo Métodos de Pago
            if (data.payments.length > 0 && validPaymentMethods.length !== paymentMethodIds.length) {
                return { message: 'Uno o más métodos de pago no existen', status: 404, data: null };
            }

            // 4. Validación Matemática (Backend vs Frontend)
            const calculatedSubTotal = data.items.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

            const difference = Math.abs(calculatedSubTotal - data.subTotal);

            if (difference > 0.05) {
                return {
                    message: `Error matemático: La suma de items (${calculatedSubTotal}) no coincide con el SubTotal enviado (${data.subTotal})`,
                    status: 400,
                    data: null
                };
            }

            // 5. Validar Perecederos
            for (const item of data.items) {

                const productInfo = products.find(p => p.id === item.productId);

                if (productInfo?.isPerishable && !item.expirationDate) {
                    return {
                        message: `El producto "${productInfo.name}" es perecedero y requiere fecha de vencimiento`,
                        status: 400,
                        data: null
                    };
                }
            }

            // =================================================================
            // FASE 2: TRANSACCIÓN (Escritura segura)
            // =================================================================
            
            const result = await prisma.$transaction(async (tx) => {
                
                // A. Crear Cabecera
                const purchase = await tx.purchase.create({
                    data: {
                        businessId,
                        memberId: userId,
                        supplierId: data.supplierId,
                        exchangeRateId: data.exchangeRateId,
                        subTotal: data.subTotal,
                        taxAmount: data.taxAmount,
                        totalCost: data.totalCost,
                        status: 'COMPLETED',
                        reference: data.reference || "N/A",
                        observation: data.observation || "N/A",
                    }
                });

                // B. Insertar Items (Bulk)
                if (data.items.length > 0) {
                    await tx.purchaseItem.createMany({
                        data: data.items.map(item => ({
                            purchaseId: purchase.id,
                            productId: item.productId,
                            depotId: item.depotId,
                            quantity: item.quantity,
                            unitCost: item.unitCost,
                            expirationDate: item.expirationDate 
                                ? new Date(item.expirationDate) 
                                : NON_PERISHABLE_DATE
                        }))
                    });
                }

                // C. Insertar Pagos (Bulk)
                if (data.payments.length > 0) {
                    await tx.purchasePayment.createMany({
                        data: data.payments.map(pay => ({
                            purchaseId: purchase.id,
                            paymentMethodId: pay.paymentMethodId,
                            amount: pay.amount,
                            currency: pay.currency,
                            exchangeRateId: data.exchangeRateId,
                            reference: pay.reference || "N/A"
                        }))
                    });
                }

                // D. Actualizar Inventario (Loop lógico)
                for (const item of data.items) {
                    const finalDate = item.expirationDate 
                        ? new Date(item.expirationDate) 
                        : NON_PERISHABLE_DATE;

                    // Buscar lote existente (Mismo producto, almacén, fecha y costo)
                    const existingLot = await tx.stockLot.findFirst({
                        where: {
                            productId: item.productId,
                            depotId: item.depotId,
                            expirationDate: finalDate,
                            lotCost: item.unitCost
                        }
                    });

                    // Upsert (Crear o Actualizar)
                    if (existingLot) {
                        await tx.stockLot.update({
                            where: { id: existingLot.id },
                            data: { quantity: { increment: item.quantity } }
                        });
                    } else {
                        await tx.stockLot.create({
                            data: {
                                productId: item.productId,
                                depotId: item.depotId,
                                quantity: item.quantity,
                                expirationDate: finalDate,
                                lotCost: item.unitCost
                            }
                        });
                    }

                    // Registrar Kardex
                    await tx.stockMovement.create({
                        data: {
                            businessId,
                            productId: item.productId,
                            depotId: item.depotId,
                            memberId: userId,
                            type: 'IN',
                            quantity: item.quantity,
                            historicalCost: item.unitCost,
                            reason: `Compra #${purchase.id}`,
                        }
                    });
                }

                // Retornar la compra creada con relaciones
                return await tx.purchase.findUnique({
                    where: { id: purchase.id },
                    include: {
                        items: { include: { product: true } },
                        payments: true
                    }
                });
            });

            // Si la transacción fue exitosa:
            return {
                message: 'Compra registrada exitosamente',
                status: 201,
                data: result
            };

        } catch (error) {
            console.error('Error al crear la compra:', error);
            
            return {
                message: 'Error interno al procesar la compra',
                status: 500,
                data: null
            };
        }
    }

    // 2. LISTAR COMPRAS (CON PAGINACIÓN Y FILTROS)
    // Agregamos argumentos opcionales para filtrar
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
                        exchangeRate: { select: { rate: true, currency: true } }, 
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
}