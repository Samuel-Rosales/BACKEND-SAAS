import { prisma } from '@/configs';
import { BusinessError } from '@/utils/catch-errors.util';
import { CreateDispatchDto, ReceiveTransferDto } from './inter-branch-transfer.interface';
import { MovementType, TransferStatus, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { HashId } from '@/utils/hash-id';

export class InterBranchTransferService {

    /**
     * 1. DESPACHO: Crea la nota de despacho y descuenta inventario del almacén origen
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

            // Validar existencia de negocios
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

            // Transacción atómica
            const result = await prisma.$transaction(async (tx) => {
                // 1. Crear cabecera de la transferencia
                const transfer = await tx.interBranchTransfer.create({
                    data: {
                        transferNumber,
                        originBusinessId,
                        destinationBusinessId,
                        createdById: memberId,
                        status: TransferStatus.PENDING_RECEIPT,
                        notes: data.notes || `Despacho hacia ${destBusiness.name}`
                    }
                });

                // 2. Procesar cada artículo (validar stock, descontar FEFO y crear ítems)
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

                    // Descontar por lotes
                    let remaining = new Decimal(qty);
                    let lastUnitCost = product.costPrice;

                    for (const lot of lots) {
                        if (remaining.isZero()) break;
                        const lotQty = new Decimal(lot.quantity);
                        const deduct = Decimal.min(lotQty, remaining);

                        await tx.stockLot.update({
                            where: { id: lot.id },
                            data: { quantity: lotQty.sub(deduct) }
                        });

                        lastUnitCost = lot.lotCost;

                        // Registrar movimiento de salida
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

                    // Crear ítem de transferencia
                    await tx.interBranchTransferItem.create({
                        data: {
                            transferId: transfer.id,
                            productId: product.id,
                            productName: product.name,
                            sku: product.sku,
                            quantitySent: qty,
                            unitCost: lastUnitCost
                        }
                    });
                }

                return transfer;
            });

            return {
                status: 201,
                message: `Despacho ${result.transferNumber} generado exitosamente`,
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

            return { status: 200, message: 'Despachos pendientes obtenidos', data: transfers };
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

            return { status: 200, message: 'Despachos enviados obtenidos', data: transfers };
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
            return { status: 200, message: 'Detalle de despacho obtenido', data: transfer };
        } catch (error: any) {
            console.error('InterBranchTransferService.getTransferById error:', error);
            return { status: 500, message: 'Error al obtener detalle de despacho', data: null };
        }
    }

    /**
     * 5. RECEPCIÓN Y AUDITORÍA: El receptor inspecciona, ingresa conformes, dañados y faltantes,
     * y se carga el inventario únicamente con los artículos en buen estado.
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

            // Buscar categoría y unidad base en la sucursal receptora para posibles productos nuevos
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
                                    costPrice: originalItem.unitCost,
                                    salePrice: originProd?.salePrice || new Decimal(originalItem.unitCost).mul(1.3),
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
                                lotCost: originalItem.unitCost,
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
                                historicalCost: originalItem.unitCost,
                                reason: `Recepción ${transfer.transferNumber} desde ${transfer.originBusiness.name}`,
                                date: new Date()
                            }
                        });
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
                message: `Despacho ${updatedTransfer.transferNumber} recibido y cargado a inventario exitosamente (${updatedTransfer.status === TransferStatus.RECEIVED_FULL ? '100% Conforme' : 'Con Discrepancias/Averías Registradas'})`,
                data: updatedTransfer
            };
        } catch (error: any) {
            console.error('InterBranchTransferService.receiveTransfer error:', error);
            if (error instanceof BusinessError) return { status: error.status, message: error.message, data: null };
            return { status: 500, message: error.message || 'Error interno al procesar recepción', data: null };
        }
    }
}
