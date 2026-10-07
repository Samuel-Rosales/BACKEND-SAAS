import { prisma } from '@/configs';
import { CreateQuotationDto, FindQuotationsQuery, UpdateQuotationStatusDto } from './interfaces';
import { QuotationStatus, Prisma } from '@prisma/client';
import { resolveBusinessExchangeRate } from '@/utils';

export class QuotationService {
    // =================================================================
    // 1. CREAR COTIZACIÓN
    // =================================================================
    async create(businessId: number, memberId: number, data: CreateQuotationDto) {
        try {
            // A. Validar que el cliente exista y pertenezca al negocio
            const client = await prisma.client.findFirst({
                where: { id: data.clientId, businessId, isActive: true }
            });

            if (!client) {
                return {
                    status: 404,
                    message: 'El cliente no existe o está inactivo en este negocio.',
                    data: null
                };
            }

            // B. Resolver tasa de cambio activa
            const exchangeRateRecord = await resolveBusinessExchangeRate(businessId, prisma);
            if (!exchangeRateRecord) {
                return {
                    status: 400,
                    message: 'No hay una tasa de cambio activa para este negocio.',
                    data: null
                };
            }
            const exchangeRateId = data.exchangeRateId || exchangeRateRecord.id;

            // C. Obtener productos para calcular precios e impuestos
            const productIds = data.items.map((i) => i.productId);
            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, businessId, isActive: true },
                include: {
                    tax: true,
                    presentations: { where: { isActive: true } }
                }
            });

            if (products.length !== productIds.length) {
                return {
                    status: 400,
                    message: 'Uno o más productos no existen o no pertenecen a este negocio.',
                    data: null
                };
            }

            const productMap = new Map(products.map((p) => [p.id, p]));

            // D. Calcular subtotales e impuestos
            let subTotal = new Prisma.Decimal(0);
            let taxAmount = new Prisma.Decimal(0);

            const itemsToCreate = data.items.map((item) => {
                const product = productMap.get(item.productId)!;
                let unitPrice = new Prisma.Decimal(item.price ?? product.salePrice);

                // Si seleccionó una presentación con precio específico
                if (item.productPresentationId) {
                    const pres = product.presentations.find((p) => p.id === item.productPresentationId);
                    if (pres && item.price === undefined) {
                        unitPrice = new Prisma.Decimal(pres.price);
                    }
                }

                const quantity = new Prisma.Decimal(item.quantity);
                const lineSubtotal = unitPrice.mul(quantity);
                subTotal = subTotal.add(lineSubtotal);

                // Impuesto si aplica
                if (product.tax && Number(product.tax.rate) > 0) {
                    const lineTax = lineSubtotal.mul(new Prisma.Decimal(product.tax.rate)).div(100);
                    taxAmount = taxAmount.add(lineTax);
                }

                return {
                    productId: item.productId,
                    productPresentationId: item.productPresentationId || null,
                    quantity,
                    unitPrice,
                    subTotal: lineSubtotal
                };
            });

            const discount = new Prisma.Decimal(data.discount || 0);
            const totalAmount = subTotal.sub(discount).add(taxAmount);

            // E. Obtener correlativo de cotización
            const lastQuote = await prisma.quotation.findFirst({
                where: { businessId },
                orderBy: { receiptNumber: 'desc' },
                select: { receiptNumber: true }
            });
            const receiptNumber = (lastQuote?.receiptNumber || 0) + 1;

            // F. Guardar en Base de Datos dentro de una transacción
            const quotation = await prisma.$transaction(async (tx) => {
                return tx.quotation.create({
                    data: {
                        businessId,
                        memberId,
                        clientId: data.clientId,
                        exchangeRateId,
                        receiptNumber,
                        subTotal,
                        taxAmount,
                        discount,
                        totalAmount,
                        validUntil: data.validUntil ? new Date(data.validUntil) : null,
                        notes: data.notes || null,
                        status: QuotationStatus.PENDING,
                        items: {
                            create: itemsToCreate
                        }
                    },
                    include: {
                        client: true,
                        member: { select: { user: { select: { name: true } } } },
                        exchangeRate: true,
                        items: {
                            include: {
                                product: { select: { id: true, name: true, sku: true } },
                                productPresentation: { select: { id: true, name: true, barCode: true } }
                            }
                        }
                    }
                });
            });

            // G. Formatear totales bimonetarios para visualización y WhatsApp
            const rate = Number(exchangeRateRecord.rate);
            const totalUsd = Number(quotation.totalAmount);
            const totalVes = totalUsd * rate;

            return {
                status: 201,
                message: `Cotización #${receiptNumber} generada exitosamente.`,
                data: {
                    ...quotation,
                    rate,
                    totalUsd,
                    totalVes: Number(totalVes.toFixed(2))
                }
            };
        } catch (error) {
            console.error('Error al crear cotización:', error);
            return {
                status: 500,
                message: 'Error interno al generar la cotización.',
                data: null
            };
        }
    }

    // =================================================================
    // 2. LISTAR COTIZACIONES
    // =================================================================
    async findAll(businessId: number, query: FindQuotationsQuery) {
        try {
            const page = Math.max(1, Number(query.page) || 1);
            const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
            const skip = (page - 1) * limit;

            const where: Prisma.QuotationWhereInput = {
                businessId,
                deletedAt: null
            };

            if (query.status && query.status !== 'ALL') {
                where.status = query.status as QuotationStatus;
            }

            if (query.clientId) {
                where.clientId = Number(query.clientId);
            }

            if (query.search) {
                const term = String(query.search).trim();
                const numericTerm = Number(term);
                where.OR = [
                    { client: { name: { contains: term, mode: 'insensitive' } } },
                    { client: { ci: { contains: term, mode: 'insensitive' } } },
                    ...(Number.isInteger(numericTerm) ? [{ receiptNumber: numericTerm }] : [])
                ];
            }

            if (query.fromDate || query.toDate) {
                where.createdAt = {};
                if (query.fromDate) where.createdAt.gte = new Date(query.fromDate);
                if (query.toDate) {
                    const to = new Date(query.toDate);
                    to.setHours(23, 59, 59, 999);
                    where.createdAt.lte = to;
                }
            }

            const [total, quotations] = await Promise.all([
                prisma.quotation.count({ where }),
                prisma.quotation.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: { select: { id: true, name: true, ci: true, phone: true, email: true } },
                        member: { select: { user: { select: { name: true } } } },
                        exchangeRate: { select: { id: true, rate: true } },
                        items: {
                            include: {
                                product: { select: { id: true, name: true } },
                                productPresentation: { select: { id: true, name: true } }
                            }
                        }
                    }
                })
            ]);

            const data = quotations.map((q) => {
                const rate = Number(q.exchangeRate?.rate || 1);
                const totalUsd = Number(q.totalAmount);
                return {
                    ...q,
                    rate,
                    totalUsd,
                    totalVes: Number((totalUsd * rate).toFixed(2))
                };
            });

            return {
                status: 200,
                message: 'Cotizaciones obtenidas exitosamente.',
                data,
                meta: {
                    total,
                    page,
                    limit,
                    totalPages: Math.ceil(total / limit)
                }
            };
        } catch (error) {
            console.error('Error al listar cotizaciones:', error);
            return {
                status: 500,
                message: 'Error al consultar las cotizaciones.',
                data: []
            };
        }
    }

    // =================================================================
    // 3. OBTENER UNA COTIZACIÓN
    // =================================================================
    async findOne(businessId: number, id: number) {
        try {
            const quotation = await prisma.quotation.findFirst({
                where: { id, businessId, deletedAt: null },
                include: {
                    business: { select: { name: true, address: true, logoUrl: true, closingNotificationPhone: true } },
                    client: true,
                    member: { select: { user: { select: { name: true } } } },
                    exchangeRate: true,
                    sale: { select: { id: true, receiptNumber: true, createdAt: true } },
                    items: {
                        include: {
                            product: { select: { id: true, name: true, sku: true } },
                            productPresentation: { select: { id: true, name: true, barCode: true } }
                        }
                    }
                }
            });

            if (!quotation) {
                return {
                    status: 404,
                    message: 'Cotización no encontrada.',
                    data: null
                };
            }

            const rate = Number(quotation.exchangeRate?.rate || 1);
            const totalUsd = Number(quotation.totalAmount);

            return {
                status: 200,
                message: 'Cotización obtenida exitosamente.',
                data: {
                    ...quotation,
                    rate,
                    totalUsd,
                    totalVes: Number((totalUsd * rate).toFixed(2))
                }
            };
        } catch (error) {
            console.error('Error al obtener cotización:', error);
            return {
                status: 500,
                message: 'Error al buscar la cotización.',
                data: null
            };
        }
    }

    // =================================================================
    // 4. ACTUALIZAR ESTADO (APROBAR / RECHAZAR)
    // =================================================================
    async updateStatus(businessId: number, id: number, dto: UpdateQuotationStatusDto) {
        try {
            const quotation = await prisma.quotation.findFirst({
                where: { id, businessId, deletedAt: null }
            });

            if (!quotation) {
                return {
                    status: 404,
                    message: 'Cotización no encontrada.',
                    data: null
                };
            }

            if (quotation.status === QuotationStatus.CONVERTED) {
                return {
                    status: 400,
                    message: 'Esta cotización ya fue facturada y convertida en venta.',
                    data: null
                };
            }

            const updated = await prisma.quotation.update({
                where: { id },
                data: {
                    status: dto.status,
                    notes: dto.notes ? `${quotation.notes ? quotation.notes + ' | ' : ''}${dto.notes}` : quotation.notes
                }
            });

            const statusLabels: Record<string, string> = {
                APPROVED: 'aprobada',
                REJECTED: 'rechazada',
                PENDING: 'puesta en pendiente',
                EXPIRED: 'marcada como vencida',
                CONVERTED: 'facturada y convertida en venta'
            };

            return {
                status: 200,
                message: `Cotización #${quotation.receiptNumber} ${statusLabels[dto.status] || 'actualizada'}.`,
                data: updated
            };
        } catch (error) {
            console.error('Error al actualizar estado de cotización:', error);
            return {
                status: 500,
                message: 'Error al actualizar el estado de la cotización.',
                data: null
            };
        }
    }
}
