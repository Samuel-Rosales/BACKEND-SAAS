import { prisma } from '@/configs';
import { CreatePurchaseOrderDto, FindPurchaseOrdersQuery, ReceivePurchaseOrderDto } from './interfaces';
import { PurchaseOrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';
import { resolveBusinessExchangeRate } from '@/utils';
import { PurchaseService } from '../purchase/purchase.service';

const purchaseService = new PurchaseService();

export class PurchaseOrderService {

    async create(businessId: number, memberId: number, data: CreatePurchaseOrderDto) {
        try {
            if (!data.items || data.items.length === 0) {
                return { status: 400, message: 'Debe incluir al menos un producto en el pedido.', data: null };
            }

            // Validar proveedor
            const supplier = await prisma.supplier.findFirst({
                where: { id: data.supplierId, businessId }
            });
            if (!supplier) {
                return { status: 404, message: 'Proveedor no encontrado en este negocio.', data: null };
            }

            // Validar almacén
            const depot = await prisma.depot.findFirst({
                where: { id: data.depotId, businessId }
            });
            if (!depot) {
                return { status: 404, message: 'Almacén destino no encontrado.', data: null };
            }

            // Validar productos
            const productIds = data.items.map(i => i.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, businessId },
                select: { id: true, name: true, sku: true }
            });
            if (products.length !== productIds.length) {
                return { status: 404, message: 'Uno o más productos no existen en este negocio.', data: null };
            }

            // Tasa actual
            const rateRecord = await resolveBusinessExchangeRate(businessId, prisma);

            // Correlativo
            const lastOrder = await prisma.purchaseOrder.findFirst({
                where: { businessId },
                orderBy: { orderNumber: 'desc' },
                select: { orderNumber: true }
            });
            const nextOrderNumber = (lastOrder?.orderNumber || 0) + 1;

            // Calcular subtotales
            let calculatedSubTotal = new Decimal(0);
            const itemsToCreate = data.items.map(item => {
                const qty = new Decimal(item.quantity);
                const cost = new Decimal(item.unitCost);
                const itemSubTotal = qty.mul(cost);
                calculatedSubTotal = calculatedSubTotal.add(itemSubTotal);

                return {
                    productId: item.productId,
                    productPresentationId: item.productPresentationId || null,
                    quantity: qty,
                    unitCost: cost,
                    subTotal: itemSubTotal
                };
            });

            const totalCost = calculatedSubTotal; // Sin IVA por defecto en orden, o IVA referencial

            const newOrder = await prisma.purchaseOrder.create({
                data: {
                    businessId,
                    orderNumber: nextOrderNumber,
                    memberId,
                    supplierId: data.supplierId,
                    depotId: data.depotId,
                    exchangeRateId: rateRecord.id,
                    status: PurchaseOrderStatus.PENDING,
                    subTotal: calculatedSubTotal,
                    taxAmount: new Decimal(0),
                    totalCost,
                    expectedDeliveryDate: data.expectedDeliveryDate ? new Date(data.expectedDeliveryDate) : null,
                    notes: data.notes || null,
                    items: {
                        create: itemsToCreate
                    }
                },
                include: {
                    supplier: true,
                    depot: true,
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true } },
                            productPresentation: { select: { id: true, name: true, factor: true } }
                        }
                    }
                }
            });

            return {
                status: 201,
                message: `Orden de Compra #OC-${String(nextOrderNumber).padStart(4, '0')} creada con éxito.`,
                data: newOrder
            };
        } catch (error: any) {
            console.error('Error in PurchaseOrderService.create:', error);
            return { status: 500, message: 'Error interno al crear orden de compra.', data: null };
        }
    }

    async findAll(businessId: number, query: FindPurchaseOrdersQuery) {
        try {
            const page = Math.max(1, Number(query.page) || 1);
            const limit = Math.max(1, Math.min(100, Number(query.limit) || 15));
            const skip = (page - 1) * limit;

            const where: any = { businessId };

            if (query.status && query.status !== 'ALL') {
                where.status = query.status;
            }

            if (query.supplierId) {
                where.supplierId = Number(query.supplierId);
            }

            if (query.search) {
                const s = query.search.trim();
                const num = Number(s.replace(/\D/g, ''));
                where.OR = [
                    { supplier: { nameCompany: { contains: s, mode: 'insensitive' } } },
                    { notes: { contains: s, mode: 'insensitive' } }
                ];
                if (!isNaN(num) && num > 0) {
                    where.OR.push({ orderNumber: num });
                }
            }

            const [total, orders] = await Promise.all([
                prisma.purchaseOrder.count({ where }),
                prisma.purchaseOrder.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { id: 'desc' },
                    include: {
                        supplier: { select: { id: true, nameCompany: true, contactName: true, phone: true } },
                        depot: { select: { id: true, name: true } },
                        member: { select: { id: true, user: { select: { name: true } } } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true, sku: true } },
                                productPresentation: { select: { id: true, name: true, factor: true } }
                            }
                        },
                        purchase: { select: { id: true, reference: true, createdAt: true, conditions: true } }
                    }
                })
            ]);

            return {
                status: 200,
                message: 'Órdenes de compra obtenidas.',
                data: orders,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error: any) {
            console.error('Error in PurchaseOrderService.findAll:', error);
            return { status: 500, message: 'Error al consultar órdenes de compra.', data: null };
        }
    }

    async findOne(businessId: number, id: number) {
        try {
            const order = await prisma.purchaseOrder.findFirst({
                where: { id, businessId },
                include: {
                    supplier: true,
                    depot: true,
                    member: { select: { id: true, user: { select: { name: true } } } },
                    exchangeRate: true,
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true, costPrice: true, salePrice: true, isPerishable: true } },
                            productPresentation: true
                        }
                    },
                    purchase: {
                        select: {
                            id: true,
                            reference: true,
                            createdAt: true,
                            conditions: true,
                            totalCost: true
                        }
                    }
                }
            });

            if (!order) {
                return { status: 404, message: 'Orden de compra no encontrada.', data: null };
            }

            return { status: 200, message: 'Orden encontrada.', data: order };
        } catch (error: any) {
            console.error('Error in PurchaseOrderService.findOne:', error);
            return { status: 500, message: 'Error al consultar orden de compra.', data: null };
        }
    }

    async updateStatus(businessId: number, id: number, status: PurchaseOrderStatus) {
        try {
            const order = await prisma.purchaseOrder.findFirst({
                where: { id, businessId }
            });

            if (!order) {
                return { status: 404, message: 'Orden de compra no encontrada.', data: null };
            }

            if (order.status === PurchaseOrderStatus.RECEIVED) {
                return { status: 400, message: 'Una orden ya recibida no puede cambiar de estado.', data: null };
            }

            const updated = await prisma.purchaseOrder.update({
                where: { id },
                data: { status }
            });

            return { status: 200, message: `Estado actualizado a ${status}.`, data: updated };
        } catch (error: any) {
            console.error('Error in PurchaseOrderService.updateStatus:', error);
            return { status: 500, message: 'Error al actualizar estado.', data: null };
        }
    }

    async receive(businessId: number, memberId: number, id: number, data: ReceivePurchaseOrderDto) {
        try {
            const order = await prisma.purchaseOrder.findFirst({
                where: { id, businessId },
                include: { items: true, supplier: true }
            });

            if (!order) {
                return { status: 404, message: 'Orden de compra no encontrada.', data: null };
            }

            if (order.status === PurchaseOrderStatus.RECEIVED) {
                return { status: 400, message: 'Esta orden ya fue recibida e ingresada al inventario anteriormente.', data: null };
            }

            if (!data.items || data.items.length === 0) {
                return { status: 400, message: 'Debe especificar los artículos recibidos.', data: null };
            }

            // Resolver tasa
            const rateRecord = await resolveBusinessExchangeRate(businessId, prisma);

            // Calcular totales de la compra
            let subTotal = new Decimal(0);
            for (const item of data.items) {
                const q = new Decimal(item.quantity);
                const c = new Decimal(item.unitCost);
                subTotal = subTotal.add(q.mul(c));
            }

            // Resolver impuesto si aplica
            let taxAmount = new Decimal(0);
            const tax = await prisma.tax.findUnique({ where: { id: data.taxId } });
            if (tax && Number(tax.rate) > 0) {
                taxAmount = subTotal.mul(new Decimal(tax.rate)).div(100);
            }
            const totalCost = subTotal.add(taxAmount);

            // Crear la compra formal reutilizando el motor completo de PurchaseService
            const purchasePayload: any = {
                supplierId: order.supplierId,
                exchangeRateId: rateRecord.id,
                taxId: data.taxId,
                subTotal: Number(subTotal),
                taxAmount: Number(taxAmount),
                totalCost: Number(totalCost),
                reference: data.reference || `OC-${String(order.orderNumber).padStart(4, '0')}`,
                observation: data.observation || `Ingreso desde Orden de Compra #OC-${String(order.orderNumber).padStart(4, '0')}`,
                condition: data.condition,
                items: data.items.map(i => ({
                    productId: i.productId,
                    depotId: i.depotId,
                    productPresentationId: i.productPresentationId || undefined,
                    quantity: Number(i.quantity),
                    unitCost: Number(i.unitCost),
                    expirationDate: i.expirationDate
                })),
                payments: data.payments || [],
                installments: data.installments || []
            };

            const purchaseResult = await purchaseService.create(businessId, memberId, purchasePayload);

            if (purchaseResult.status !== 201 || !purchaseResult.data) {
                return {
                    status: purchaseResult.status,
                    message: purchaseResult.message || 'Error al procesar la compra.',
                    data: null
                };
            }

            const createdPurchaseId = (purchaseResult.data as any).id;

            // Actualizar la orden de compra a RECIBIDA y vincular el purchaseId
            const updatedOrder = await prisma.purchaseOrder.update({
                where: { id },
                data: {
                    status: PurchaseOrderStatus.RECEIVED,
                    purchaseId: createdPurchaseId
                },
                include: {
                    purchase: true
                }
            });

            return {
                status: 200,
                message: `Mercancía verificada y cargada al inventario con éxito. Se generó la Compra N° ${createdPurchaseId}.`,
                data: {
                    purchaseOrder: updatedOrder,
                    purchase: purchaseResult.data
                }
            };
        } catch (error: any) {
            console.error('Error in PurchaseOrderService.receive:', error);
            return { status: 500, message: 'Error interno al procesar recepción de orden de compra.', data: null };
        }
    }

    async getPdfData(businessId: number, id: number) {
        const order = await prisma.purchaseOrder.findFirst({
            where: { id, businessId },
            include: {
                business: true,
                supplier: true,
                depot: true,
                member: { select: { user: { select: { name: true } } } },
                exchangeRate: true,
                items: {
                    include: {
                        product: { select: { name: true, sku: true } },
                        productPresentation: { select: { name: true } }
                    }
                }
            }
        });

        if (!order) return null;

        return {
            businessName: order.business.name,
            businessAddress: order.business.address,
            businessPhone: (order.business as any).phone || null,
            businessLogo: order.business.logoUrl,
            businessDocument: order.business.document,
            orderNumber: order.orderNumber,
            createdAt: order.createdAt.toISOString().split('T')[0],
            expectedDeliveryDate: order.expectedDeliveryDate ? order.expectedDeliveryDate.toISOString().split('T')[0] : null,
            supplier: {
                nameCompany: order.supplier.nameCompany,
                contactName: order.supplier.contactName,
                rifOrCi: null,
                phone: order.supplier.phone,
                address: order.supplier.address
            },
            depotName: order.depot.name,
            buyerName: order.member.user.name,
            items: order.items.map(item => ({
                productName: item.product.name,
                presentationName: item.productPresentation?.name || null,
                quantity: Number(item.quantity),
                unitCost: Number(item.unitCost),
                subTotal: Number(item.subTotal)
            })),
            subTotal: Number(order.subTotal),
            taxAmount: Number(order.taxAmount),
            totalCost: Number(order.totalCost),
            rate: Number(order.exchangeRate.rate),
            notes: order.notes
        };
    }
}
