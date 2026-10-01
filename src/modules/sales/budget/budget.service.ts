import { prisma } from '@/configs';
import { resolveBusinessExchangeRate } from '@/utils';
import { BudgetStatus, Prisma } from '@prisma/client';
import {
    CreateBudgetDto,
    UpdateBudgetDto,
    BudgetFilterQuery,
    ConvertBudgetToSaleDto,
    PriceCheckResult,
    PriceCheckItem
} from './budget.interface';
import { SaleService } from '../sale/sale.service';
import { CreateSaleInterface } from '../sale/interfaces/create-sale.interface';

const saleService = new SaleService();

export class BudgetService {

    async create(businessId: number, memberId: number, data: CreateBudgetDto) {
        try {
            // 0. Resolver tasa de cambio activa para el negocio si no se proporciona
            let finalExchangeRateId = data.exchangeRateId;
            if (!finalExchangeRateId) {
                const currentRate = await resolveBusinessExchangeRate(businessId, prisma);
                finalExchangeRateId = currentRate.id;
            }

            // 1. Obtener siguiente número de presupuesto para el negocio
            const lastBudget = await prisma.budget.findFirst({
                where: { businessId },
                orderBy: { budgetNumber: 'desc' }
            });
            const nextNumber = (lastBudget?.budgetNumber || 0) + 1;

            // 2. Obtener productos para calcular subtotales e impuestos
            const productIds = Array.from(new Set(data.items.map(item => item.productId)));
            const products = await prisma.product.findMany({
                where: { id: { in: productIds }, businessId },
                include: { tax: true, presentations: true }
            });
            const productMap = new Map(products.map(p => [p.id, p]));

            let subTotal = new Prisma.Decimal(0);
            let taxAmount = new Prisma.Decimal(0);

            const preparedItems = data.items.map(item => {
                const product = productMap.get(item.productId);
                if (!product) {
                    throw new Error(`Producto con ID ${item.productId} no encontrado en este negocio`);
                }

                const quantity = new Prisma.Decimal(item.quantity);
                const unitPrice = new Prisma.Decimal(item.unitPrice);
                const discountPercentage = new Prisma.Decimal(item.discountPercentage || 0);

                // Descuento por item
                const discountFactor = new Prisma.Decimal(1).minus(discountPercentage.dividedBy(100));
                const effectivePrice = unitPrice.times(discountFactor);
                const itemSubTotal = effectivePrice.times(quantity);

                // Impuestos
                const taxRate = product.tax?.rate ? new Prisma.Decimal(product.tax.rate) : new Prisma.Decimal(0);
                const itemTax = itemSubTotal.times(taxRate);

                subTotal = subTotal.plus(itemSubTotal);
                taxAmount = taxAmount.plus(itemTax);

                return {
                    productId: item.productId,
                    productPresentationId: item.productPresentationId || null,
                    quantity,
                    unitPrice,
                    discountPercentage,
                    subTotal: itemSubTotal,
                    notes: item.notes || null
                };
            });

            // Descuento global
            const globalDiscount = new Prisma.Decimal(data.discount || 0);
            const totalAmount = subTotal.minus(globalDiscount).plus(taxAmount);

            // Vigencia predeterminada: 15 días continuos si no se especifica
            const validUntil = data.validUntil
                ? new Date(data.validUntil)
                : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000);

            // Crear presupuesto sin afectar inventario ni caja
            const budget = await prisma.budget.create({
                data: {
                    businessId,
                    budgetNumber: nextNumber,
                    memberId,
                    clientId: data.clientId,
                    exchangeRateId: finalExchangeRateId,
                    status: BudgetStatus.PENDING,
                    subTotal,
                    taxAmount,
                    discount: globalDiscount,
                    totalAmount,
                    validUntil,
                    notes: data.notes || null,
                    items: {
                        create: preparedItems
                    }
                },
                include: {
                    client: true,
                    member: {
                        select: {
                            id: true,
                            user: { select: { id: true, name: true, ci: true } }
                        }
                    },
                    exchangeRate: true,
                    items: {
                        include: {
                            product: true,
                            productPresentation: true
                        }
                    }
                }
            });

            return {
                status: 201,
                message: `Presupuesto #${nextNumber} emitido exitosamente`,
                data: budget
            };

        } catch (error: any) {
            console.error('Error en BudgetService.create:', error);
            return {
                status: error.status || 500,
                message: error.message || 'Error interno al emitir el presupuesto',
                data: null
            };
        }
    }

    async findAll(businessId: number, query: BudgetFilterQuery) {
        try {
            const page = Math.max(1, Number(query.page) || 1);
            const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));
            const skip = (page - 1) * limit;

            const now = new Date();

            // Marcado automático de presupuestos vencidos que siguen en PENDING
            await prisma.budget.updateMany({
                where: {
                    businessId,
                    status: BudgetStatus.PENDING,
                    validUntil: { lt: now }
                },
                data: { status: BudgetStatus.EXPIRED }
            });

            const where: Prisma.BudgetWhereInput = {
                businessId
            };

            // Filtro por Estado
            if (query.status) {
                if (query.status === 'ACTIVE') {
                    where.status = { in: [BudgetStatus.PENDING, BudgetStatus.ACCEPTED, BudgetStatus.DRAFT] };
                } else if (query.status === 'PURGEABLE') {
                    where.status = { in: [BudgetStatus.CONVERTED, BudgetStatus.CANCELLED, BudgetStatus.REJECTED, BudgetStatus.EXPIRED] };
                } else {
                    where.status = query.status as BudgetStatus;
                }
            }

            // Filtro por Cliente
            if (query.clientId) {
                where.clientId = Number(query.clientId);
            }

            // Filtro por Fechas
            if (query.fromDate || query.toDate) {
                where.createdAt = {};
                if (query.fromDate) {
                    where.createdAt.gte = new Date(query.fromDate);
                }
                if (query.toDate) {
                    const toDate = new Date(query.toDate);
                    toDate.setHours(23, 59, 59, 999);
                    where.createdAt.lte = toDate;
                }
            }

            // Filtro por Búsqueda (Número de presupuesto o datos del cliente)
            if (query.search && query.search.trim() !== '') {
                const term = query.search.trim();
                const numericTerm = Number(term.replace('#', ''));

                const orConditions: Prisma.BudgetWhereInput[] = [
                    { client: { name: { contains: term, mode: 'insensitive' } } },
                    { client: { ci: { contains: term, mode: 'insensitive' } } }
                ];

                if (!isNaN(numericTerm)) {
                    orConditions.push({ budgetNumber: numericTerm });
                }

                where.OR = orConditions;
            }

            const [total, budgets] = await Promise.all([
                prisma.budget.count({ where }),
                prisma.budget.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { createdAt: 'desc' },
                    include: {
                        client: {
                            select: { id: true, name: true, ci: true, phone: true, email: true }
                        },
                        member: {
                            select: {
                                id: true,
                                user: { select: { id: true, name: true } }
                            }
                        },
                        exchangeRate: {
                            select: { id: true, rate: true }
                        },
                        sale: {
                            select: { id: true, receiptNumber: true, status: true, totalAmount: true }
                        },
                        _count: {
                            select: { items: true }
                        }
                    }
                })
            ]);

            const totalPages = Math.ceil(total / limit);

            return {
                status: 200,
                message: 'Presupuestos obtenidos exitosamente',
                data: budgets,
                pagination: {
                    total,
                    page,
                    limit,
                    totalPages
                }
            };

        } catch (error: any) {
            console.error('Error en BudgetService.findAll:', error);
            return {
                status: 500,
                message: error.message || 'Error interno al consultar los presupuestos',
                data: null
            };
        }
    }

    async findOne(businessId: number, id: number) {
        try {
            const budget = await prisma.budget.findFirst({
                where: { id, businessId },
                include: {
                    client: true,
                    member: {
                        select: {
                            id: true,
                            user: { select: { id: true, name: true, ci: true } }
                        }
                    },
                    exchangeRate: true,
                    sale: {
                        select: { id: true, receiptNumber: true, createdAt: true, status: true, totalAmount: true }
                    },
                    items: {
                        include: {
                            product: {
                                include: { tax: true }
                            },
                            productPresentation: true
                        }
                    }
                }
            });

            if (!budget) {
                return {
                    status: 404,
                    message: 'Presupuesto no encontrado',
                    data: null
                };
            }

            return {
                status: 200,
                message: 'Presupuesto encontrado',
                data: budget
            };

        } catch (error: any) {
            console.error('Error en BudgetService.findOne:', error);
            return {
                status: 500,
                message: error.message || 'Error interno al obtener el presupuesto',
                data: null
            };
        }
    }

    /**
     * Compara los precios cotizados originalmente contra los precios actuales de catálogo
     * y recalcula los totales utilizando la tasa de cambio activa del día.
     */
    async checkPriceUpdates(businessId: number, id: number): Promise<{ status: number; message: string; data: PriceCheckResult | null }> {
        try {
            const budget = await prisma.budget.findFirst({
                where: { id, businessId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: { tax: true, presentations: true }
                            },
                            productPresentation: true
                        }
                    },
                    exchangeRate: true
                }
            });

            if (!budget) {
                return { status: 404, message: 'Presupuesto no encontrado', data: null };
            }

            // Obtener tasa activa de cambio del negocio
            let activeExchangeRate = Number(budget.exchangeRate.rate);
            try {
                const currentRate = await resolveBusinessExchangeRate(businessId, prisma);
                if (currentRate?.rate) {
                    activeExchangeRate = Number(currentRate.rate);
                }
            } catch {
                // Si no se encuentra, usar la guardada en el presupuesto
            }

            // Obtener stock actual de los productos
            const productIds = budget.items.map(item => item.productId);
            const stockLots = await prisma.stockLot.groupBy({
                by: ['productId'],
                where: { productId: { in: productIds } },
                _sum: { quantity: true }
            });
            const stockMap = new Map(stockLots.map(s => [s.productId, Number(s._sum.quantity || 0)]));

            let hasPriceChanges = false;
            let newSubTotal = 0;
            let newTaxAmount = 0;

            const items: PriceCheckItem[] = budget.items.map(item => {
                const product = item.product;
                let currentPrice = Number(product.salePrice);
                let presentationName: string | null = null;

                if (item.productPresentationId && product.presentations) {
                    const pres = product.presentations.find(p => p.id === item.productPresentationId);
                    if (pres) {
                        currentPrice = Number(pres.price);
                        presentationName = pres.name;
                    }
                }

                const quotedPrice = Number(item.unitPrice);
                const difference = Number((currentPrice - quotedPrice).toFixed(2));
                const itemChanged = Math.abs(difference) >= 0.01;

                if (itemChanged) {
                    hasPriceChanges = true;
                }

                const quantity = Number(item.quantity);
                const discountPercentage = Number(item.discountPercentage || 0);

                const subTotalQuoted = Number(item.subTotal);
                const effectiveCurrentPrice = currentPrice * (1 - discountPercentage / 100);
                const subTotalCurrent = Number((effectiveCurrentPrice * quantity).toFixed(2));

                const taxRate = product.tax?.rate ? Number(product.tax.rate) : 0;
                const itemTax = subTotalCurrent * taxRate;

                newSubTotal += subTotalCurrent;
                newTaxAmount += itemTax;

                return {
                    productId: item.productId,
                    productPresentationId: item.productPresentationId,
                    productName: product.name,
                    presentationName,
                    quantity,
                    quotedPrice,
                    currentPrice,
                    difference,
                    hasChanged: itemChanged,
                    currentStock: stockMap.get(item.productId) || 0,
                    discountPercentage,
                    subTotalQuoted,
                    subTotalCurrent
                };
            });

            const discount = Number(budget.discount || 0);
            const newTotalAmount = Number((newSubTotal - discount + newTaxAmount).toFixed(2));
            const newTotalBs = Number((newTotalAmount * activeExchangeRate).toFixed(2));

            const result: PriceCheckResult = {
                hasPriceChanges,
                currentExchangeRate: activeExchangeRate,
                quotedExchangeRate: Number(budget.exchangeRate.rate),
                items,
                originalTotal: Number(budget.totalAmount),
                newSubTotal: Number(newSubTotal.toFixed(2)),
                newTaxAmount: Number(newTaxAmount.toFixed(2)),
                newTotalAmount,
                newTotalBs
            };

            return {
                status: 200,
                message: 'Verificación de precios realizada exitosamente',
                data: result
            };

        } catch (error: any) {
            console.error('Error en BudgetService.checkPriceUpdates:', error);
            return {
                status: 500,
                message: error.message || 'Error al verificar precios actuales',
                data: null
            };
        }
    }

    async update(businessId: number, id: number, data: UpdateBudgetDto) {
        try {
            const existing = await prisma.budget.findFirst({
                where: { id, businessId }
            });

            if (!existing) {
                return { status: 404, message: 'Presupuesto no encontrado', data: null };
            }

            if (existing.status === BudgetStatus.CONVERTED) {
                return {
                    status: 400,
                    message: 'No se puede editar un presupuesto que ya ha sido convertido en venta',
                    data: null
                };
            }

            // Si se envían items nuevos, recalcular subtotales
            if (data.items && data.items.length > 0) {
                const productIds = Array.from(new Set(data.items.map(item => item.productId)));
                const products = await prisma.product.findMany({
                    where: { id: { in: productIds }, businessId },
                    include: { tax: true }
                });
                const productMap = new Map(products.map(p => [p.id, p]));

                let subTotal = new Prisma.Decimal(0);
                let taxAmount = new Prisma.Decimal(0);

                const preparedItems = data.items.map(item => {
                    const product = productMap.get(item.productId);
                    if (!product) throw new Error(`Producto ${item.productId} no encontrado`);

                    const quantity = new Prisma.Decimal(item.quantity);
                    const unitPrice = new Prisma.Decimal(item.unitPrice);
                    const discountPercentage = new Prisma.Decimal(item.discountPercentage || 0);

                    const discountFactor = new Prisma.Decimal(1).minus(discountPercentage.dividedBy(100));
                    const effectivePrice = unitPrice.times(discountFactor);
                    const itemSubTotal = effectivePrice.times(quantity);

                    const taxRate = product.tax?.rate ? new Prisma.Decimal(product.tax.rate) : new Prisma.Decimal(0);
                    const itemTax = itemSubTotal.times(taxRate);

                    subTotal = subTotal.plus(itemSubTotal);
                    taxAmount = taxAmount.plus(itemTax);

                    return {
                        productId: item.productId,
                        productPresentationId: item.productPresentationId || null,
                        quantity,
                        unitPrice,
                        discountPercentage,
                        subTotal: itemSubTotal,
                        notes: item.notes || null
                    };
                });

                const globalDiscount = new Prisma.Decimal(data.discount ?? existing.discount);
                const totalAmount = subTotal.minus(globalDiscount).plus(taxAmount);

                const updated = await prisma.$transaction(async (tx) => {
                    await tx.budgetItem.deleteMany({ where: { budgetId: id } });

                    return await tx.budget.update({
                        where: { id },
                        data: {
                            clientId: data.clientId ?? existing.clientId,
                            exchangeRateId: data.exchangeRateId ?? existing.exchangeRateId,
                            discount: globalDiscount,
                            subTotal,
                            taxAmount,
                            totalAmount,
                            validUntil: data.validUntil ? new Date(data.validUntil) : existing.validUntil,
                            notes: data.notes !== undefined ? data.notes : existing.notes,
                            items: {
                                create: preparedItems
                            }
                        },
                        include: { client: true, items: true }
                    });
                });

                return { status: 200, message: 'Presupuesto actualizado exitosamente', data: updated };
            }

            // Actualización sin cambiar items
            const updated = await prisma.budget.update({
                where: { id },
                data: {
                    clientId: data.clientId ?? existing.clientId,
                    exchangeRateId: data.exchangeRateId ?? existing.exchangeRateId,
                    discount: data.discount !== undefined ? new Prisma.Decimal(data.discount) : existing.discount,
                    validUntil: data.validUntil ? new Date(data.validUntil) : existing.validUntil,
                    notes: data.notes !== undefined ? data.notes : existing.notes
                }
            });

            return { status: 200, message: 'Presupuesto actualizado exitosamente', data: updated };

        } catch (error: any) {
            console.error('Error en BudgetService.update:', error);
            return {
                status: 500,
                message: error.message || 'Error al actualizar presupuesto',
                data: null
            };
        }
    }

    async changeStatus(businessId: number, id: number, status: BudgetStatus) {
        try {
            const existing = await prisma.budget.findFirst({
                where: { id, businessId }
            });

            if (!existing) {
                return { status: 404, message: 'Presupuesto no encontrado', data: null };
            }

            if (existing.status === BudgetStatus.CONVERTED) {
                return {
                    status: 400,
                    message: 'No se puede cambiar el estado de un presupuesto ya convertido a venta',
                    data: null
                };
            }

            const dataToUpdate: Prisma.BudgetUpdateInput = { status };
            if (status === BudgetStatus.CANCELLED || status === BudgetStatus.REJECTED) {
                dataToUpdate.cancelledAt = new Date();
            }

            const updated = await prisma.budget.update({
                where: { id },
                data: dataToUpdate
            });

            return {
                status: 200,
                message: `Estado actualizado a ${status}`,
                data: updated
            };

        } catch (error: any) {
            console.error('Error en BudgetService.changeStatus:', error);
            return {
                status: 500,
                message: error.message || 'Error al cambiar estado',
                data: null
            };
        }
    }

    /**
     * Convierte un presupuesto en venta formal cobrando directamente.
     * Aplica los precios vigentes de catálogo y la tasa activa del día.
     */
    async convertToSale(businessId: number, memberId: number, id: number, payload: ConvertBudgetToSaleDto) {
        try {
            const budget = await prisma.budget.findFirst({
                where: { id, businessId },
                include: {
                    items: {
                        include: {
                            product: {
                                include: { presentations: true, tax: true }
                            }
                        }
                    }
                }
            });

            if (!budget) {
                return { status: 404, message: 'Presupuesto no encontrado', data: null };
            }

            if (budget.status === BudgetStatus.CONVERTED) {
                return {
                    status: 400,
                    message: 'Este presupuesto ya fue convertido en una venta anteriormente',
                    data: null
                };
            }

            // 1. Obtener tasa activa de la empresa
            let exchangeRateId = budget.exchangeRateId;
            try {
                const activeRate = await resolveBusinessExchangeRate(businessId, prisma);
                if (activeRate?.id) {
                    exchangeRateId = activeRate.id;
                }
            } catch {
                // Fallback a la tasa original del presupuesto si no se pudo resolver
            }

            // 2. Preparar items con los precios actuales de catálogo
            const saleItems = budget.items.map(item => {
                let currentPrice = item.product.salePrice;

                if (item.productPresentationId && item.product.presentations) {
                    const pres = item.product.presentations.find(p => p.id === item.productPresentationId);
                    if (pres) {
                        currentPrice = pres.price;
                    }
                }

                return {
                    productId: item.productId,
                    productPresentationId: item.productPresentationId || undefined,
                    quantity: Number(item.quantity),
                    price: currentPrice,
                    depotId: payload.depotId || 0
                };
            });

            // 3. Preparar payload para SaleService.create
            const saleInput: CreateSaleInterface = {
                clientId: payload.clientId || budget.clientId,
                exchangeRateId,
                type: 'RETAIL',
                depotId: payload.depotId || 0,
                condition: payload.condition,
                discount: budget.discount,
                items: saleItems,
                payments: payload.payments.map(p => ({
                    paymentMethodId: p.paymentMethodId,
                    amount: p.amount,
                    reference: p.reference,
                    exchangeRateId: p.exchangeRateId || exchangeRateId,
                    paymentProofUrl: p.paymentProofUrl
                })),
                installments: payload.installments?.map(inst => ({
                    number: inst.number,
                    amount: new Prisma.Decimal(inst.amount),
                    dueDate: inst.dueDate
                })),
                paymentDueDate: payload.paymentDueDate,
                budgetId: id // Vincula el presupuesto y lo marca como CONVERTED
            };

            // 4. Crear venta con descuento de inventario y caja
            const saleResult = await saleService.create(businessId, memberId, saleInput);

            if (saleResult.status !== 201) {
                return {
                    status: saleResult.status,
                    message: saleResult.message || 'No se pudo crear la venta a partir del presupuesto',
                    data: null
                };
            }

            return {
                status: 201,
                message: `Presupuesto #${budget.budgetNumber} convertido en Venta con éxito`,
                data: saleResult.data
            };

        } catch (error: any) {
            console.error('Error en BudgetService.convertToSale:', error);
            return {
                status: 500,
                message: error.message || 'Error interno al convertir presupuesto a venta',
                data: null
            };
        }
    }

    async delete(businessId: number, id: number) {
        try {
            const budget = await prisma.budget.findFirst({
                where: { id, businessId }
            });

            if (!budget) {
                return { status: 404, message: 'Presupuesto no encontrado', data: null };
            }

            await prisma.budget.delete({
                where: { id }
            });

            return {
                status: 200,
                message: 'Presupuesto eliminado exitosamente',
                data: null
            };

        } catch (error: any) {
            console.error('Error en BudgetService.delete:', error);
            return {
                status: 500,
                message: error.message || 'Error al eliminar presupuesto',
                data: null
            };
        }
    }
}
