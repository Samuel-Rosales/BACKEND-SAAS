import { prisma } from '@/configs';
import { BusinessError } from '@/utils/catch-errors.util';
import { CreateDispatchDto, ReceiveTransferDto } from './inter-branch-transfer.interface';
import {
    MovementType,
    TransferStatus,
    SaleType,
    SaleStatus,
    Conditions,
    PaymentStatus,
    PaymentType,
    PurchaseStatus,
    InstallmentStatus,
    Prisma
} from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { HashId } from '@/utils/hash-id';

export class InterBranchTransferService {

    /**
     * 1. DESPACHO: Crea la nota de despacho, descuenta inventario del almacén origen
     * y genera automáticamente la VENTA en el Depósito Central para reflejarse en Reportes de Ventas.
     */
    async createDispatch(originBusinessId: number, memberId: number, data: CreateDispatchDto) {
        try {
            if (!data.items || data.items.length === 0) {
                throw new BusinessError('Debe incluir al menos un artículo para despachar', 400);
            }

            let destinationBusinessId = Number(data.destinationBusinessId);
            if (isNaN(destinationBusinessId) || String(data.destinationBusinessId).length > 6) {
                const hashId = new HashId();
                const decoded = hashId.decode(String(data.destinationBusinessId));
                if (decoded) destinationBusinessId = Number(decoded);
            }

            if (originBusinessId === destinationBusinessId) {
                throw new BusinessError('La sucursal de destino no puede ser el mismo depósito origen', 400);
            }

            // Validar existencia de negocios y almacén
            const [originBusiness, destBusiness, originDepot] = await Promise.all([
                prisma.business.findUnique({ where: { id: originBusinessId } }),
                prisma.business.findUnique({ where: { id: destinationBusinessId } }),
                prisma.depot.findFirst({ where: { id: data.originDepotId, businessId: originBusinessId, isActive: true } })
            ]);

            if (!originBusiness) throw new BusinessError('Negocio origen no encontrado o inactivo', 404);
            if (!destBusiness) throw new BusinessError('Sucursal de destino no encontrada o inactiva', 404);
            if (!originDepot) throw new BusinessError('Almacén/Depósito de origen no válido', 404);

            // Generar número correlativo de despacho
            const count = await prisma.interBranchTransfer.count();
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const transferNumber = `DESP-${dateStr}-${String(count + 1).padStart(4, '0')}`;

            // Transacción atómica integral
            const result = await prisma.$transaction(async (tx) => {
                // 1. Obtener o crear Cliente en el Negocio Origen que represente a la Sucursal Destino
                let client = await tx.client.findFirst({
                    where: { businessId: originBusinessId, name: destBusiness.name }
                });
                if (!client) {
                    client = await tx.client.create({
                        data: {
                            businessId: originBusinessId,
                            name: destBusiness.name,
                            ci: destBusiness.document || `RIF-${destBusiness.id}`,
                            address: destBusiness.address || 'Sucursal Receptora',
                            phone: destBusiness.closingNotificationPhone || '',
                            email: `sucursal_${destBusiness.id}@guardian.com.ve`,
                            isActive: true
                        }
                    });
                }

                // 2. Obtener o crear Tasa de Cambio en Negocio Origen
                let exchangeRate = await tx.exchangeRate.findFirst({
                    where: { businessId: originBusinessId, isActive: true },
                    orderBy: { createdAt: 'desc' }
                });
                if (!exchangeRate) {
                    exchangeRate = await tx.exchangeRate.create({
                        data: {
                            businessId: originBusinessId,
                            rate: new Decimal(1),
                            source: 'MANUAL',
                            isActive: true
                        }
                    });
                }

                // 3. Obtener Método de Pago activo
                let paymentMethod = await tx.paymentMethod.findFirst({
                    where: { isActive: true }
                });

                // 4. Pre-calcular importes y verificar stock de todos los productos
                let totalSaleAmount = new Decimal(0);
                const itemsToProcess: {
                    product: any;
                    qty: Decimal;
                    unitPrice: Decimal;
                    subTotal: Decimal;
                    lots: any[];
                }[] = [];

                for (const item of data.items) {
                    const qty = new Decimal(item.quantity).abs();
                    if (qty.isZero() || qty.isNegative()) {
                        throw new BusinessError(`Cantidad inválida para el producto ID ${item.productId}`, 400);
                    }

                    const product = await tx.product.findFirst({
                        where: { id: item.productId, businessId: originBusinessId, isActive: true }
                    });
                    if (!product) {
                        throw new BusinessError(`Producto ID ${item.productId} no encontrado en almacén origen`, 404);
                    }

                    // Obtener lotes disponibles en el depósito de origen (FEFO)
                    const lots = await tx.stockLot.findMany({
                        where: {
                            depotId: originDepot.id,
                            productId: product.id,
                            quantity: { gt: 0 }
                        },
                        orderBy: { expirationDate: 'asc' }
                    });

                    const totalAvailable = lots.reduce((acc, l) => acc.add(new Decimal(l.quantity)), new Decimal(0));
                    if (totalAvailable.lt(qty)) {
                        throw new BusinessError(
                            `Stock insuficiente para "${product.name}". Solicitado: ${qty}, Disponible en almacén: ${totalAvailable}`,
                            409
                        );
                    }

                    // Determinar precio de transferencia/venta (precio de venta del depósito, o costo)
                    const unitPrice = (product.salePrice && new Decimal(product.salePrice).gt(0))
                        ? new Decimal(product.salePrice)
                        : (product.costPrice && new Decimal(product.costPrice).gt(0))
                        ? new Decimal(product.costPrice)
                        : new Decimal(1);

                    const subTotal = unitPrice.mul(qty);
                    totalSaleAmount = totalSaleAmount.add(subTotal);

                    itemsToProcess.push({
                        product,
                        qty,
                        unitPrice,
                        subTotal,
                        lots
                    });
                }

                // 5. Correlativo de Factura / Venta
                const lastSale = await tx.sale.findFirst({
                    where: { businessId: originBusinessId },
                    orderBy: { receiptNumber: 'desc' }
                });
                const receiptNumber = (lastSale?.receiptNumber || 0) + 1;

                // Determinar si el despacho es a Crédito o de Contado
                const isCredit = data.conditions === 'CREDIT';
                const creditDays = data.creditDays && Number(data.creditDays) > 0 ? Number(data.creditDays) : 30;
                const dueDate = data.paymentDueDate 
                    ? new Date(data.paymentDueDate) 
                    : new Date(Date.now() + creditDays * 24 * 60 * 60 * 1000);

                // 6. Registrar VENTA en el Depósito Central
                const sale = await tx.sale.create({
                    data: {
                        businessId: originBusinessId,
                        receiptNumber,
                        memberId,
                        clientId: client.id,
                        exchangeRateId: exchangeRate.id,
                        type: SaleType.WHOLESALE,
                        status: SaleStatus.COMPLETED,
                        conditions: isCredit ? Conditions.CREDIT : Conditions.CASH,
                        paymentStatus: isCredit ? PaymentStatus.PENDING : PaymentStatus.PAID,
                        subTotal: totalSaleAmount,
                        taxAmount: new Decimal(0),
                        discount: new Decimal(0),
                        totalAmount: totalSaleAmount,
                        remainingBalance: isCredit ? totalSaleAmount : new Decimal(0),
                        paymentDueDate: isCredit ? dueDate : null,
                        createdAt: new Date()
                    }
                });

                if (isCredit) {
                    // Si es a Crédito: Crear cuota en Cuentas por Cobrar (NO crear SalePayment)
                    await tx.saleInstallment.create({
                        data: {
                            saleId: sale.id,
                            number: 1,
                            amount: totalSaleAmount,
                            dueDate: dueDate,
                            status: InstallmentStatus.PENDING,
                            amountPaid: new Decimal(0),
                            paidAt: null
                        }
                    });
                } else if (paymentMethod) {
                    // Si es de Contado: Registrar pago de la venta para que compute en ingresos y caja
                    await tx.salePayment.create({
                        data: {
                            saleId: sale.id,
                            paymentMethodId: paymentMethod.id,
                            amount: totalSaleAmount,
                            exchangeRateId: exchangeRate.id,
                            reference: transferNumber,
                            date: new Date()
                        }
                    });
                }

                // 7. Crear cabecera de la transferencia vinculada a la Venta
                const transfer = await tx.interBranchTransfer.create({
                    data: {
                        transferNumber,
                        originBusinessId,
                        destinationBusinessId,
                        saleId: sale.id,
                        createdById: memberId,
                        status: TransferStatus.PENDING_RECEIPT,
                        notes: data.notes || `Despacho hacia ${destBusiness.name}`
                    }
                });

                // 8. Procesar ítems (descontar lotes, registrar movimientos de almacén, ítems de venta e ítems de despacho)
                for (const itemData of itemsToProcess) {
                    const { product, qty, unitPrice, subTotal, lots } = itemData;

                    // Descontar por lotes
                    let remaining = new Decimal(qty);

                    for (const lot of lots) {
                        if (remaining.isZero()) break;
                        const lotQty = new Decimal(lot.quantity);
                        const deduct = Decimal.min(lotQty, remaining);

                        await tx.stockLot.update({
                            where: { id: lot.id },
                            data: { quantity: lotQty.sub(deduct) }
                        });

                        // Registrar movimiento de salida en almacén
                        await tx.stockMovement.create({
                            data: {
                                businessId: originBusinessId,
                                depotId: originDepot.id,
                                productId: product.id,
                                memberId,
                                stockLotId: lot.id,
                                quantity: deduct.negated(),
                                type: MovementType.TRANSFER,
                                historicalCost: lot.lotCost,
                                reason: `Despacho ${transferNumber} hacia ${destBusiness.name}`,
                                date: new Date()
                            }
                        });

                        remaining = remaining.sub(deduct);
                    }

                    // Crear ítem de Venta
                    await tx.saleItem.create({
                        data: {
                            saleId: sale.id,
                            productId: product.id,
                            quantity: qty,
                            unitPrice,
                            subTotal
                        }
                    });

                    // Crear ítem de transferencia con el precio pactado de venta
                    await tx.interBranchTransferItem.create({
                        data: {
                            transferId: transfer.id,
                            productId: product.id,
                            productName: product.name,
                            sku: product.sku,
                            quantitySent: qty,
                            unitCost: unitPrice // El precio de venta del depósito es el costo unitario de la sucursal
                        }
                    });
                }

                return transfer;
            });

            return {
                status: 201,
                message: `Despacho ${result.transferNumber} generado exitosamente y registrado como Venta en el Depósito`,
                data: result
            };
        } catch (error: any) {
            console.error('InterBranchTransferService.createDispatch error:', error);
            if (error instanceof BusinessError) return { status: error.status, message: error.message, data: null };
            return { status: 500, message: error.message || 'Error interno al generar despacho', data: null };
        }
    }

    /**
     * 2. LISTAR DESPACHOS PENDIENTES (Para la sucursal receptora)
     */
    async getPendingTransfers(destinationBusinessId: number) {
        try {
            const transfers = await prisma.interBranchTransfer.findMany({
                where: {
                    destinationBusinessId,
                    status: TransferStatus.PENDING_RECEIPT
                },
                include: {
                    originBusiness: {
                        select: { id: true, name: true, document: true, address: true }
                    },
                    items: true
                },
                orderBy: { createdAt: 'desc' }
            });

            // Enriquecer con información de la venta vinculada (Condición de pago: CONTADO vs CRÉDITO)
            const saleIds = transfers.map(t => t.saleId).filter(Boolean) as number[];
            const sales = saleIds.length > 0 ? await prisma.sale.findMany({
                where: { id: { in: saleIds } },
                select: { id: true, conditions: true, paymentStatus: true, paymentDueDate: true, totalAmount: true }
            }) : [];
            const saleMap = new Map(sales.map(s => [s.id, s]));

            const enriched = transfers.map(t => ({
                ...t,
                sale: t.saleId ? saleMap.get(t.saleId) || null : null
            }));

            return { status: 200, message: 'Despachos pendientes obtenidos', data: enriched };
        } catch (error: any) {
            console.error('InterBranchTransferService.getPendingTransfers error:', error);
            return { status: 500, message: 'Error al obtener despachos pendientes', data: [] };
        }
    }

    /**
     * 3. LISTAR HISTORIAL DE DESPACHOS ENVIADOS (Para el depósito origen)
     */
    async getSentTransfers(originBusinessId: number) {
        try {
            const transfers = await prisma.interBranchTransfer.findMany({
                where: { originBusinessId },
                include: {
                    destinationBusiness: {
                        select: { id: true, name: true, document: true, address: true }
                    },
                    items: true
                },
                orderBy: { createdAt: 'desc' }
            });

            const saleIds = transfers.map(t => t.saleId).filter(Boolean) as number[];
            const sales = saleIds.length > 0 ? await prisma.sale.findMany({
                where: { id: { in: saleIds } },
                select: { id: true, conditions: true, paymentStatus: true, paymentDueDate: true, totalAmount: true }
            }) : [];
            const saleMap = new Map(sales.map(s => [s.id, s]));

            const enriched = transfers.map(t => ({
                ...t,
                sale: t.saleId ? saleMap.get(t.saleId) || null : null
            }));

            return { status: 200, message: 'Despachos enviados obtenidos', data: enriched };
        } catch (error: any) {
            console.error('InterBranchTransferService.getSentTransfers error:', error);
            return { status: 500, message: 'Error al obtener despachos enviados', data: [] };
        }
    }

    /**
     * 4. OBTENER DETALLE DE UN DESPACHO
     */
    async getTransferById(transferId: number) {
        try {
            const transfer = await prisma.interBranchTransfer.findUnique({
                where: { id: transferId },
                include: {
                    originBusiness: { select: { id: true, name: true, document: true, address: true } },
                    destinationBusiness: { select: { id: true, name: true, document: true, address: true } },
                    items: true
                }
            });

            if (!transfer) return { status: 404, message: 'Despacho no encontrado', data: null };

            let sale = null;
            if (transfer.saleId) {
                sale = await prisma.sale.findUnique({
                    where: { id: transfer.saleId },
                    select: { id: true, conditions: true, paymentStatus: true, paymentDueDate: true, totalAmount: true }
                });
            }

            return { status: 200, message: 'Detalle de despacho obtenido', data: { ...transfer, sale } };
        } catch (error: any) {
            console.error('InterBranchTransferService.getTransferById error:', error);
            return { status: 500, message: 'Error al obtener detalle de despacho', data: null };
        }
    }

    /**
     * 5. RECEPCIÓN Y AUDITORÍA: El receptor inspecciona, ingresa conformes, dañados y faltantes.
     * Carga el inventario únicamente con los artículos en buen estado, y genera automáticamente
     * la COMPRA correspondiente en la sucursal para que coincida exactamente con la VENTA del depósito.
     */
    async receiveTransfer(destinationBusinessId: number, memberId: number, transferId: number, data: ReceiveTransferDto) {
        try {
            const transfer = await prisma.interBranchTransfer.findFirst({
                where: { id: transferId, destinationBusinessId },
                include: {
                    originBusiness: true,
                    items: true
                }
            });

            if (!transfer) {
                throw new BusinessError('Despacho no encontrado o no pertenece a esta sucursal', 404);
            }

            if (transfer.status !== TransferStatus.PENDING_RECEIPT) {
                throw new BusinessError(`Este despacho ya fue procesado anteriormente con estado: ${transfer.status}`, 400);
            }

            // Validar depósito destino
            const destDepot = await prisma.depot.findFirst({
                where: { id: data.destinationDepotId, businessId: destinationBusinessId, isActive: true }
            });
            if (!destDepot) {
                throw new BusinessError('Depósito destino de recepción no válido o inactivo', 404);
            }

            // Buscar o crear categoría y unidad base en la sucursal receptora
            let destCategory = await prisma.category.findFirst({
                where: { businessId: destinationBusinessId, isActive: true }
            });
            if (!destCategory) {
                destCategory = await prisma.category.create({
                    data: { name: 'General', businessId: destinationBusinessId, isActive: true }
                });
            }

            const defaultUnit = await prisma.measurementUnit.findFirst({ where: { isActive: true } });
            const defaultTax = await prisma.tax.findFirst({ where: { isActive: true } });

            // Procesar en transacción atómica
            const updatedTransfer = await prisma.$transaction(async (tx) => {
                let hasDiscrepancy = false;
                let totalPurchaseCost = new Decimal(0);
                const conformingProductsToPurchase: {
                    destProduct: any;
                    qtyReceived: Decimal;
                    unitCost: Decimal;
                }[] = [];

                for (const itemInput of data.items) {
                    const originalItem = transfer.items.find((i) => i.id === itemInput.itemId);
                    if (!originalItem) {
                        throw new BusinessError(`Ítem ID ${itemInput.itemId} no pertenece a este despacho`, 400);
                    }

                    const qtySent = new Decimal(originalItem.quantitySent);
                    const qtyReceived = new Decimal(itemInput.quantityReceived || 0).abs();
                    const qtyDamaged = new Decimal(itemInput.quantityDamaged || 0).abs();
                    const qtyMissing = new Decimal(itemInput.quantityMissing || 0).abs();

                    const sumTotal = qtyReceived.add(qtyDamaged).add(qtyMissing);
                    if (sumTotal.gt(qtySent)) {
                        throw new BusinessError(
                            `La suma de recibidos (${qtyReceived}) + dañados (${qtyDamaged}) + faltantes (${qtyMissing}) no puede ser mayor que lo enviado (${qtySent}) para "${originalItem.productName}"`,
                            400
                        );
                    }

                    if (qtyDamaged.gt(0) || qtyMissing.gt(0) || qtyReceived.lt(qtySent)) {
                        hasDiscrepancy = true;
                    }

                    // Actualizar el ítem de transferencia con las cantidades auditadas
                    await tx.interBranchTransferItem.update({
                        where: { id: originalItem.id },
                        data: {
                            quantityReceived: qtyReceived,
                            quantityDamaged: qtyDamaged,
                            quantityMissing: qtyMissing,
                            damagedReason: itemInput.damagedReason || null
                        }
                    });

                    // Si hay mercancía recibida conforme, ingresarla al inventario de la sucursal
                    if (qtyReceived.gt(0)) {
                        const itemCost = new Decimal(originalItem.unitCost);
                        totalPurchaseCost = totalPurchaseCost.add(itemCost.mul(qtyReceived));

                        // Buscar o sincronizar el producto en la sucursal receptora
                        let destProduct = await tx.product.findFirst({
                            where: {
                                businessId: destinationBusinessId,
                                OR: [
                                    ...(originalItem.sku ? [{ sku: originalItem.sku }] : []),
                                    { name: originalItem.productName }
                                ]
                            }
                        });

                        // Si no existe el producto en esta sucursal, lo creamos automáticamente
                        if (!destProduct) {
                            const originProd = await tx.product.findUnique({
                                where: { id: originalItem.productId }
                            });

                            destProduct = await tx.product.create({
                                data: {
                                    businessId: destinationBusinessId,
                                    name: originalItem.productName,
                                    sku: originalItem.sku || null,
                                    categoryId: destCategory!.id,
                                    unitId: originProd?.unitId || defaultUnit?.id || 1,
                                    taxId: originProd?.taxId || defaultTax?.id || 1,
                                    costPrice: itemCost,
                                    salePrice: originProd?.salePrice || itemCost.mul(1.3),
                                    isActive: true,
                                    type: 'SIMPLE'
                                }
                            });
                        }

                        // Crear lote en el depósito destino
                        const newLot = await tx.stockLot.create({
                            data: {
                                depotId: destDepot.id,
                                productId: destProduct.id,
                                quantity: qtyReceived,
                                lotCost: itemCost,
                                expirationDate: new Date('2099-12-31')
                            }
                        });

                        // Registrar movimiento de inventario de entrada
                        await tx.stockMovement.create({
                            data: {
                                businessId: destinationBusinessId,
                                depotId: destDepot.id,
                                productId: destProduct.id,
                                memberId,
                                stockLotId: newLot.id,
                                quantity: qtyReceived,
                                type: MovementType.IN,
                                historicalCost: itemCost,
                                reason: `Recepción ${transfer.transferNumber} desde ${transfer.originBusiness.name}`,
                                date: new Date()
                            }
                        });

                        conformingProductsToPurchase.push({
                            destProduct,
                            qtyReceived,
                            unitCost: itemCost
                        });
                    }
                }

                // REGISTRAR LA COMPRA en la sucursal receptora si hubo productos conformes
                if (totalPurchaseCost.gt(0)) {
                    // Buscar o crear Proveedor para el Depósito Central en esta sucursal
                    let supplier = await tx.supplier.findFirst({
                        where: { businessId: destinationBusinessId, nameCompany: transfer.originBusiness.name }
                    });
                    if (!supplier) {
                        supplier = await tx.supplier.create({
                            data: {
                                businessId: destinationBusinessId,
                                nameCompany: transfer.originBusiness.name,
                                contactName: 'Encargado de Depósito',
                                address: transfer.originBusiness.address || 'Depósito Central',
                                phone: transfer.originBusiness.closingNotificationPhone || '04120000000',
                                isActive: true
                            }
                        });
                    }

                    // Tasa de cambio de la sucursal
                    let destRate = await tx.exchangeRate.findFirst({
                        where: { businessId: destinationBusinessId, isActive: true },
                        orderBy: { createdAt: 'desc' }
                    });
                    if (!destRate) {
                        destRate = await tx.exchangeRate.create({
                            data: {
                                businessId: destinationBusinessId,
                                rate: new Decimal(1),
                                source: 'MANUAL',
                                isActive: true
                            }
                        });
                    }

                    const taxRecord = defaultTax || await tx.tax.findFirst({ where: { isActive: true } });

                    // Consultar venta de origen vinculada para conocer condición (CONTADO vs CRÉDITO) y fecha de vencimiento
                    let originSale = transfer.saleId ? await tx.sale.findUnique({ where: { id: transfer.saleId } }) : null;
                    const isCredit = originSale ? originSale.conditions === Conditions.CREDIT : false;
                    const purchaseDueDate = originSale?.paymentDueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

                    // Crear la COMPRA
                    const purchase = await tx.purchase.create({
                        data: {
                            businessId: destinationBusinessId,
                            supplierId: supplier.id,
                            memberId,
                            subTotal: totalPurchaseCost,
                            taxAmount: new Decimal(0),
                            totalCost: totalPurchaseCost,
                            status: PurchaseStatus.COMPLETED,
                            exchangeRateId: destRate.id,
                            reference: transfer.transferNumber,
                            observation: data.notes || `Despacho recibido desde ${transfer.originBusiness.name} (${transfer.transferNumber})`,
                            conditions: isCredit ? Conditions.CREDIT : Conditions.CASH,
                            paymentStatus: isCredit ? PaymentStatus.PENDING : PaymentStatus.PAID,
                            remainingBalance: isCredit ? totalPurchaseCost : new Decimal(0),
                            paymentDueDate: isCredit ? purchaseDueDate : new Date(),
                            taxId: taxRecord!.id,
                            createdAt: new Date()
                        }
                    });

                    // Registrar ítems de la compra
                    for (const conf of conformingProductsToPurchase) {
                        await tx.purchaseItem.create({
                            data: {
                                purchaseId: purchase.id,
                                productId: conf.destProduct.id,
                                depotId: destDepot.id,
                                quantity: conf.qtyReceived,
                                unitCost: conf.unitCost,
                                expirationDate: new Date('2099-12-31')
                            }
                        });
                    }

                    if (isCredit) {
                        // Si es a Crédito: Crear cuota en Cuentas por Pagar de la sucursal receptora (NO crear PurchasePayment)
                        await tx.purchaseInstallment.create({
                            data: {
                                purchaseId: purchase.id,
                                number: 1,
                                amount: totalPurchaseCost,
                                dueDate: purchaseDueDate,
                                status: InstallmentStatus.PENDING
                            }
                        });

                        // Si hubo discrepancia en la recepción y era a crédito, ajustar el saldo de la venta en el Depósito Central
                        if (hasDiscrepancy && originSale) {
                            await tx.sale.update({
                                where: { id: originSale.id },
                                data: {
                                    remainingBalance: totalPurchaseCost,
                                    totalAmount: totalPurchaseCost
                                }
                            });
                            await tx.saleInstallment.updateMany({
                                where: { saleId: originSale.id, number: 1 },
                                data: { amount: totalPurchaseCost }
                            });
                        }
                    } else {
                        // Si es de Contado: Registrar pago de la compra
                        const destPaymentMethod = await tx.paymentMethod.findFirst({ where: { isActive: true } });
                        if (destPaymentMethod) {
                            await tx.purchasePayment.create({
                                data: {
                                    purchaseId: purchase.id,
                                    paymentMethodId: destPaymentMethod.id,
                                    amount: totalPurchaseCost,
                                    exchangeRateId: destRate.id,
                                    reference: transfer.transferNumber,
                                    paymentDate: new Date()
                                }
                            });
                        }
                    }
                }

                // Determinar estado final de la transferencia
                const finalStatus = hasDiscrepancy ? TransferStatus.RECEIVED_PARTIAL : TransferStatus.RECEIVED_FULL;

                const result = await tx.interBranchTransfer.update({
                    where: { id: transfer.id },
                    data: {
                        status: finalStatus,
                        receivedAt: new Date(),
                        receivedById: memberId,
                        receivingNotes: data.notes || null
                    },
                    include: {
                        originBusiness: true,
                        destinationBusiness: true,
                        items: true
                    }
                });

                return result;
            });

            return {
                status: 200,
                message: `Despacho ${updatedTransfer.transferNumber} recibido, cargado a inventario y registrado como Compra en la sucursal exitosamente (${updatedTransfer.status === TransferStatus.RECEIVED_FULL ? '100% Conforme' : 'Con Discrepancias/Averías'})`,
                data: updatedTransfer
            };
        } catch (error: any) {
            console.error('InterBranchTransferService.receiveTransfer error:', error);
            if (error instanceof BusinessError) return { status: error.status, message: error.message, data: null };
            return { status: 500, message: error.message || 'Error interno al procesar recepción', data: null };
        }
    }
}
