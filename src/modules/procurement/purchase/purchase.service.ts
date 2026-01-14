import { prisma } from '@/configs';
import { CreatePurchaseInterface } from './interfaces';

const NON_PERISHABLE_DATE = new Date('2099-12-31');

export class PurchaseService {

    async create(businessId: number, userId: number, data: CreatePurchaseInterface) {
        try {
            // =================================================================
            // FASE 1: VALIDACIONES PARALELAS
            // =================================================================
            
            const productIds = [...new Set(data.items.map(i => i.productId))];
            const depotIds = [...new Set(data.items.map(i => i.depotId))];
            const paymentMethodIds = [...new Set(data.payments.map(p => p.paymentMethodId))];
            
            // CORRECCIÓN 1: Filtrar nulos en vez de usar "|| 1". 
            // Solo buscamos presentaciones si realmente enviaron un ID.
            const presentationIds = [...new Set(
                data.items.map(i => i.productPresentationId).filter((id): id is number => id != null)
            )];
    
            const [exchangeRate, supplier, products, depots, validPaymentMethods, presentations] = await Promise.all([
                prisma.exchangeRate.findUnique({ where: { id: data.exchangeRateId } }),
                prisma.supplier.findUnique({ where: { id: data.supplierId } }),
                prisma.product.findMany({ 
                    where: { id: { in: productIds } }, 
                    select: { id: true, name: true, isPerishable: true } 
                }),
                prisma.depot.findMany({ where: { id: { in: depotIds } }, select: { id: true } }),
                
                data.payments.length > 0 
                    ? prisma.paymentMethod.findMany({ where: { id: { in: paymentMethodIds } }, select: { id: true } })
                    : Promise.resolve([]),
                
                // CORRECCIÓN 2: Manejo seguro de array vacío
                presentationIds.length > 0 
                    ? prisma.productPresentation.findMany({ where: { id: { in: presentationIds } }, select: { id: true, factor: true } })
                    : Promise.resolve([]),
            ]);
    
            // --- VALIDACIONES DE EXISTENCIA ---
            if (!exchangeRate) return { message: 'Tasa de cambio no encontrada', status: 404, data: null };
            if (!supplier) return { message: 'Proveedor no encontrado', status: 404, data: null };
            if (!supplier.isActive) return { message: 'Proveedor inactivo', status: 400, data: null };
            
            if (products.length !== productIds.length) return { message: 'Uno o más productos no existen', status: 404, data: null };
            if (depots.length !== depotIds.length) return { message: 'Uno o más almacenes no existen', status: 404, data: null };
            if (presentations.length !== presentationIds.length) return { message: 'Una o más presentaciones no existen', status: 404, data: null };
            
            if (data.payments.length > 0 && validPaymentMethods.length !== paymentMethodIds.length) {
                return { message: 'Método de pago inválido', status: 404, data: null };
            }
    
            // --- VALIDACIONES LÓGICAS ---
    
            // 1. Matemática (Subtotal)
            // Asumimos: quantity (nominal) * unitCost (nominal) = Total Línea
            let calculatedSubTotal = 0;
            
            // 2. Perecederos
            for (const item of data.items) {
                const productInfo = products.find(p => p.id === item.productId);
                
                // Validar fecha de vencimiento
                if (productInfo?.isPerishable && !item.expirationDate) {
                    return { message: `El producto "${productInfo.name}" requiere fecha de vencimiento`, status: 400, data: null };
                }
    
                // Sumar al total calculado
                calculatedSubTotal += (item.quantity * item.unitCost);
            }
    
            if (Math.abs(calculatedSubTotal - data.subTotal) > 0.05) {
                return {
                    message: `Error en montos. Calculado: ${calculatedSubTotal}, Enviado: ${data.subTotal}`,
                    status: 400,
                    data: null
                };
            }
    
    
            // =================================================================
            // FASE 2: TRANSACCIÓN
            // =================================================================
            
            const result = await prisma.$transaction(async (tx) => {
                
                // A. Cabecera
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
    
                // B. Procesar Items e Inventario
                for (const item of data.items) {
                    
                    // 1. Calcular Cantidad Real (Unidades)
                    let finalQuantity = item.quantity;
                    if (item.productPresentationId) {
                        const pres = presentations.find(p => p.id === item.productPresentationId);
                        if (pres) finalQuantity = item.quantity * Number(pres.factor);
                    }
            
                    const expiration = item.expirationDate ? new Date(item.expirationDate) : NON_PERISHABLE_DATE;
            
                    // 2. Crear PurchaseItem (Registro histórico de la compra)
                    await tx.purchaseItem.create({
                        data: {
                            purchaseId: purchase.id,
                            productId: item.productId,
                            productPresentationId: item.productPresentationId || null,
                            quantity: finalQuantity, // Guardamos en unidades para estandarizar
                            unitCost: item.unitCost, // Costo nominal de lo que se compró
                            depotId: item.depotId || 1,
                            expirationDate: expiration
                        }
                    });
            
                    // 3. GESTIÓN DE LOTES (StockLot)
                    // Estrategia: Si ya tengo un lote del mismo producto, en el mismo almacén, 
                    // con la misma fecha y MISMO COSTO, lo sumo. Si cambia el costo, creo uno nuevo.
                    const existingLot = await tx.stockLot.findFirst({
                        where: {
                            productId: item.productId,
                            depotId: item.depotId || 1,
                            expirationDate: expiration,
                            // IMPORTANTE: Separar lotes por costo para cálculo real de ganancias luego
                            // Si tu modelo StockLot no tiene 'lotCost' o 'unitCost', quita esta línea
                            lotCost: item.unitCost 
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
                                depotId: item.depotId || 1,
                                quantity: finalQuantity,
                                lotCost: item.unitCost, // Costo de este lote
                                expirationDate: expiration,
                                createdAt: new Date()
                            }
                        });
                    }
    
                    // 4. Kardex (StockMovement)
                    await tx.stockMovement.create({
                        data: {
                            businessId,
                            productId: item.productId,
                            memberId: userId,
                            depotId: item.depotId || 1,
                            type: 'IN',
                            quantity: finalQuantity,
                            historicalCost: item.unitCost, // Costo de entrada
                            reason: `Compra #${purchase.id}` // O usa purchase.number si tienes consecutivo
                        }
                    });
                }
    
                // C. Pagos
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