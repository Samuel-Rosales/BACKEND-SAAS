import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
    /** Client timezone offset in minutes (Date.getTimezoneOffset()). */
    tzOffset?: number | string;
};

const parseDateOnlyStart = (value: string, tzOffsetMinutes: number) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);

    const utcMs = Date.UTC(year, month - 1, day, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000);
    return new Date(utcMs);
};

const parseDateOnlyEnd = (value: string, tzOffsetMinutes: number) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);

    // End of the local day = start of next local day - 1ms
    const utcMs = Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000) - 1;
    return new Date(utcMs);
};

const getLocalMonthRangeUtc = (baseDateUtc: Date, tzOffsetMinutes: number, monthDelta = 0) => {
    const local = new Date(baseDateUtc.getTime() - (tzOffsetMinutes * 60_000));
    const year = local.getUTCFullYear();
    const monthIndex = local.getUTCMonth() + monthDelta;

    const startUtcMs = Date.UTC(year, monthIndex, 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000);
    const endUtcMs = Date.UTC(year, monthIndex + 1, 1, 0, 0, 0, 0) + (tzOffsetMinutes * 60_000) - 1;

    const daysInMonth = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
    const localTodayDayOfMonth = local.getUTCDate();

    return {
        start: new Date(startUtcMs),
        end: new Date(endUtcMs),
        daysInMonth,
        localTodayDayOfMonth
    };
};

function getColorForPaymentType(type: string, isCashea = false): string {
    if (isCashea) return 'bg-indigo-500';
    switch (type) {
        case 'CASH': return 'bg-emerald-500';
        case 'DEBIT_CARD':
        case 'CREDIT_CARD': return 'bg-blue-500';
        case 'MOBILE_PAYMENT': return 'bg-amber-500';
        case 'ZELLE': return 'bg-purple-500';
        case 'TRANSFER': return 'bg-indigo-500';
        default: return 'bg-cool-gray-500';
    }
}

function isCasheaPaymentMethod(name?: string | null): boolean {
    if (!name) return false;
    const upper = name.trim().toUpperCase();
    return upper.includes('CASHEA') || upper.includes('CACHEA');
}

export class CashRegisterReportService {

    async getOverview(businessId: number, query: DateRangeQuery & { sellerId?: string | number }) {
        const now = new Date();

        const tzOffsetMinutes = (() => {
            if (query.tzOffset === null || query.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(query.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        let currentStart = defaultMonthRange.start;
        let currentEnd = defaultMonthRange.end;

        if (query.fromDate && query.toDate) {
            currentStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            currentEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        } else if (query.fromDate && !query.toDate) {
            currentStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            currentEnd = now;
        } else if (!query.fromDate && query.toDate) {
            const base = parseDateOnlyStart(query.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            currentStart = monthRange.start;
            currentEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        }

        const sellerId = query.sellerId ? Number(query.sellerId) : undefined;

        try {
            // Find all cash registers active or with sales in the date range
            const registers = await prisma.cashRegister.findMany({
                where: {
                    businessId,
                    ...(sellerId ? { memberId: sellerId } : {}),
                    OR: [
                        { openTime: { gte: currentStart, lte: currentEnd } },
                        { closeTime: { gte: currentStart, lte: currentEnd } },
                        {
                            payments: {
                                some: {
                                    sale: {
                                        businessId,
                                        status: { not: 'CANCELLED' },
                                        createdAt: { gte: currentStart, lte: currentEnd }
                                    }
                                }
                            }
                        }
                    ]
                },
                select: {
                    id: true,
                    initialAmount: true,
                    finalAmount: true,
                    status: true,
                    memberId: true
                }
            });

            // Fetch all sale payments for sales in the date range (aligned with getSellersReport)
            const payments = await prisma.salePayment.findMany({
                where: {
                    sale: {
                        businessId,
                        status: { not: 'CANCELLED' },
                        ...(sellerId ? { memberId: sellerId } : {}),
                        createdAt: { gte: currentStart, lte: currentEnd }
                    }
                },
                include: {
                    paymentMethod: true,
                    exchangeRate: true,
                    sale: { select: { memberId: true } }
                }
            });

            // Fetch all refunds in the date range
            const refunds = await prisma.creditNotePayment.findMany({
                where: {
                    creditNote: {
                        sale: {
                            businessId,
                            status: { not: 'CANCELLED' },
                            ...(sellerId ? { memberId: sellerId } : {})
                        },
                        createdAt: { gte: currentStart, lte: currentEnd }
                    }
                },
                include: {
                    paymentMethod: true,
                    exchangeRate: true
                }
            });

            if (registers.length === 0 && payments.length === 0 && refunds.length === 0) {
                return {
                    status: 200,
                    message: 'Métricas de caja calculadas exitosamente (sin datos)',
                    data: {
                        openRegisters: 0,
                        closedRegisters: 0,
                        totalUSD: 0,
                        totalVES: 0,
                        totalCasheaUSD: 0,
                        casheaTransactions: 0,
                        salesCount: 0,
                        activeSellers: 0,
                        initialCashUSD: 0,
                        finalCashUSD: 0,
                        payoutsUSD: 0,
                        methods: [],
                        methodsUSD: [],
                        methodsVES: [],
                        methodsCashea: []
                    }
                };
            }

            // Calculate general stats
            const openRegisters = registers.filter(r => r.status === 'OPEN').length;
            const closedRegisters = registers.filter(r => r.status === 'CLOSED').length;
            const activeSellerIds = new Set<number>([
                ...registers.map(r => r.memberId),
                ...payments.map(p => p.sale.memberId)
            ]);
            const activeSellers = activeSellerIds.size;

            // Initial Cash
            const initialCashUSD = registers.reduce((sum, r) => sum.add(new Decimal(r.initialAmount)), new Decimal(0));

            let totalUSD = new Decimal(0);
            let totalVES = new Decimal(0);
            let totalCasheaUSD = new Decimal(0);
            let casheaTransactions = 0;

            let cashPaymentsUSD = new Decimal(0);
            let cashRefundsUSD = new Decimal(0);
            const salesCount = new Set(payments.map(p => p.saleId)).size;

            const methodStats = new Map<number, {
                method: string;
                type: string;
                currency: string;
                isCashea: boolean;
                transactions: number;
                amountUSD: Decimal;
                amountVES: Decimal;
            }>();

            // Process payments: strict separation between 1) USD (non-Cashea), 2) VES, and 3) Financiamiento de Cashea
            for (const pay of payments) {
                const rate = new Decimal(pay.exchangeRate.rate);
                const amt = new Decimal(pay.amount);
                const isCashea = isCasheaPaymentMethod(pay.paymentMethod.name);
                const isUSD = pay.paymentMethod.currency === 'USD';

                let nativeUSD = new Decimal(0);
                let nativeVES = new Decimal(0);

                if (isCashea) {
                    // Cashea financing is always tracked in its own separate bucket (in USD)
                    nativeUSD = isUSD ? amt : amt.div(rate);
                    totalCasheaUSD = totalCasheaUSD.add(nativeUSD);
                    casheaTransactions += 1;
                } else if (isUSD) {
                    nativeUSD = amt;
                    totalUSD = totalUSD.add(nativeUSD);
                } else {
                    nativeVES = amt;
                    totalVES = totalVES.add(nativeVES);
                }

                if (!isCashea && pay.paymentMethod.type === 'CASH') {
                    const equivCashUSD = isUSD ? amt : amt.div(rate);
                    cashPaymentsUSD = cashPaymentsUSD.add(equivCashUSD);
                }

                const displayMethodName = isCashea ? 'Financiamiento de Cashea' : pay.paymentMethod.name;
                const existing = methodStats.get(pay.paymentMethodId);
                if (existing) {
                    existing.transactions += 1;
                    existing.amountUSD = existing.amountUSD.add(nativeUSD);
                    existing.amountVES = existing.amountVES.add(nativeVES);
                } else {
                    methodStats.set(pay.paymentMethodId, {
                        method: displayMethodName,
                        type: pay.paymentMethod.type,
                        currency: isCashea ? 'USD' : pay.paymentMethod.currency,
                        isCashea,
                        transactions: 1,
                        amountUSD: nativeUSD,
                        amountVES: nativeVES
                    });
                }
            }

            // Process refunds (Credit Note Payments)
            for (const ref of refunds) {
                const rate = new Decimal(ref.exchangeRate.rate);
                const amt = new Decimal(ref.amount);
                const isCashea = isCasheaPaymentMethod(ref.paymentMethod.name);
                const isUSD = ref.paymentMethod.currency === 'USD';

                let nativeUSD = new Decimal(0);
                let nativeVES = new Decimal(0);

                if (isCashea) {
                    nativeUSD = isUSD ? amt : amt.div(rate);
                    totalCasheaUSD = totalCasheaUSD.sub(nativeUSD);
                } else if (isUSD) {
                    nativeUSD = amt;
                    totalUSD = totalUSD.sub(nativeUSD);
                } else {
                    nativeVES = amt;
                    totalVES = totalVES.sub(nativeVES);
                }

                if (!isCashea && ref.paymentMethod.type === 'CASH') {
                    const equivCashUSD = isUSD ? amt : amt.div(rate);
                    cashRefundsUSD = cashRefundsUSD.add(equivCashUSD);
                }

                const displayMethodName = isCashea ? 'Financiamiento de Cashea' : ref.paymentMethod.name;
                const existing = methodStats.get(ref.paymentMethodId);
                if (existing) {
                    existing.amountUSD = existing.amountUSD.sub(nativeUSD);
                    existing.amountVES = existing.amountVES.sub(nativeVES);
                } else {
                    methodStats.set(ref.paymentMethodId, {
                        method: displayMethodName,
                        type: ref.paymentMethod.type,
                        currency: isCashea ? 'USD' : ref.paymentMethod.currency,
                        isCashea,
                        transactions: 1,
                        amountUSD: nativeUSD.negated(),
                        amountVES: nativeVES.negated()
                    });
                }
            }

            const totalUSDNum = totalUSD.toNumber();
            const totalVESNum = totalVES.toNumber();
            const totalCasheaUSDNum = totalCasheaUSD.toNumber();

            const allStats = Array.from(methodStats.values());

            const methodsUSD = allStats
                .filter(m => !m.isCashea && m.currency === 'USD')
                .map(m => {
                    const val = m.amountUSD.toNumber();
                    const pct = totalUSDNum > 0 ? (val / totalUSDNum) * 100 : 0;
                    return {
                        method: m.method,
                        type: m.type,
                        currency: 'USD',
                        isCashea: false,
                        transactions: m.transactions,
                        amountUSD: Number(val.toFixed(2)),
                        amountVES: 0,
                        percentage: Number(pct.toFixed(2)),
                        color: getColorForPaymentType(m.type, false)
                    };
                })
                .sort((a, b) => b.amountUSD - a.amountUSD);

            const methodsVES = allStats
                .filter(m => !m.isCashea && m.currency !== 'USD')
                .map(m => {
                    const val = m.amountVES.toNumber();
                    const pct = totalVESNum > 0 ? (val / totalVESNum) * 100 : 0;
                    return {
                        method: m.method,
                        type: m.type,
                        currency: 'VES',
                        isCashea: false,
                        transactions: m.transactions,
                        amountUSD: 0,
                        amountVES: Number(val.toFixed(2)),
                        percentage: Number(pct.toFixed(2)),
                        color: getColorForPaymentType(m.type, false)
                    };
                })
                .sort((a, b) => b.amountVES - a.amountVES);

            const methodsCashea = allStats
                .filter(m => m.isCashea)
                .map(m => {
                    const val = m.amountUSD.toNumber();
                    const pct = totalCasheaUSDNum > 0 ? (val / totalCasheaUSDNum) * 100 : 100;
                    return {
                        method: 'Financiamiento de Cashea',
                        type: m.type,
                        currency: 'USD',
                        isCashea: true,
                        transactions: m.transactions,
                        amountUSD: Number(val.toFixed(2)),
                        amountVES: 0,
                        percentage: Number(pct.toFixed(2)),
                        color: getColorForPaymentType(m.type, true)
                    };
                });

            const methodsArray = [...methodsUSD, ...methodsVES, ...methodsCashea];

            // Final Cash Estimado = Apertura + Ventas en Efectivo - Egresos en Efectivo
            const payoutsUSD = cashRefundsUSD;
            const finalCashUSD = initialCashUSD.add(cashPaymentsUSD).sub(cashRefundsUSD);

            return {
                status: 200,
                message: 'Métricas de caja calculadas exitosamente',
                data: {
                    openRegisters,
                    closedRegisters,
                    totalUSD: Number(totalUSD.toFixed(2)),
                    totalVES: Number(totalVES.toFixed(2)),
                    totalCasheaUSD: Number(totalCasheaUSD.toFixed(2)),
                    casheaTransactions,
                    salesCount,
                    activeSellers,
                    initialCashUSD: Number(initialCashUSD.toFixed(2)),
                    finalCashUSD: Number(finalCashUSD.toFixed(2)),
                    payoutsUSD: Number(payoutsUSD.toFixed(2)),
                    methods: methodsArray,
                    methodsUSD,
                    methodsVES,
                    methodsCashea
                }
            };

        } catch (error) {
            console.error('Error calculando métricas de caja:', error);
            return {
                status: 500,
                message: 'Error interno al calcular métricas de caja',
                data: null
            };
        }
    }

    async getSellersReport(businessId: number, query: DateRangeQuery & { sellerId?: string | number }) {
        const now = new Date();

        const tzOffsetMinutes = (() => {
            if (query.tzOffset === null || query.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(query.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        let currentStart = defaultMonthRange.start;
        let currentEnd = defaultMonthRange.end;

        if (query.fromDate && query.toDate) {
            currentStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            currentEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        } else if (query.fromDate && !query.toDate) {
            currentStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            currentEnd = now;
        } else if (!query.fromDate && query.toDate) {
            const base = parseDateOnlyStart(query.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            currentStart = monthRange.start;
            currentEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        }

        const sellerId = query.sellerId ? Number(query.sellerId) : undefined;

        try {
            // 1. Get all members for this business
            const members = await prisma.businessMember.findMany({
                where: {
                    businessId,
                    ...(sellerId ? { id: sellerId } : {})
                },
                include: {
                    user: { select: { name: true, ci: true } }
                }
            });

            if (members.length === 0) {
                return {
                    status: 200,
                    message: 'Reporte de vendedores calculado exitosamente (sin miembros)',
                    data: []
                };
            }

            const memberIds = members.map(m => m.id);

            // 2. Fetch all sales for these members in the date range
            const sales = await prisma.sale.findMany({
                where: {
                    businessId,
                    memberId: { in: memberIds },
                    status: 'COMPLETED',
                    createdAt: { gte: currentStart, lte: currentEnd }
                },
                include: {
                    payments: {
                        include: {
                            paymentMethod: true,
                            exchangeRate: true
                        }
                    },
                    items: {
                        include: {
                            product: {
                                include: {
                                    category: true
                                }
                            }
                        }
                    },
                    exchangeRate: true
                }
            });

            // 3. Fetch all cash registers for these members in the date range
            const registers = await prisma.cashRegister.findMany({
                where: {
                    businessId,
                    memberId: { in: memberIds },
                    openTime: { gte: currentStart, lte: currentEnd }
                },
                include: {
                    payments: {
                        where: {
                            sale: {
                                status: { not: 'CANCELLED' }
                            }
                        },
                        include: {
                            paymentMethod: true,
                            exchangeRate: true
                        }
                    },
                    refunds: {
                        where: {
                            creditNote: {
                                sale: {
                                    status: { not: 'CANCELLED' }
                                }
                            }
                        },
                        include: {
                            paymentMethod: true,
                            exchangeRate: true
                        }
                    }
                },
                orderBy: { openTime: 'desc' }
            });

            // 4. Process and aggregate in memory
            const sellersReport = members.map(member => {
                const memberSales = sales.filter(s => s.memberId === member.id);
                const memberRegisters = registers.filter(r => r.memberId === member.id);

                // Calculate totals collected from payments separated into USD (non-Cashea), VES, and Financiamiento de Cashea
                let memberTotalUSD = new Decimal(0);
                let memberTotalVES = new Decimal(0);
                let memberTotalCasheaUSD = new Decimal(0);
                let memberCasheaTransactions = 0;
                let articlesCount = 0;

                const sellerMethodStats = new Map<number, {
                    method: string;
                    type: string;
                    currency: string;
                    isCashea: boolean;
                    transactions: number;
                    amountUSD: Decimal;
                    amountVES: Decimal;
                }>();

                for (const sale of memberSales) {
                    for (const pay of sale.payments) {
                        const rate = new Decimal(pay.exchangeRate.rate);
                        const amt = new Decimal(pay.amount);
                        const isCashea = isCasheaPaymentMethod(pay.paymentMethod.name);
                        const isUSD = pay.paymentMethod.currency === 'USD';

                        let nativeUSD = new Decimal(0);
                        let nativeVES = new Decimal(0);

                        if (isCashea) {
                            nativeUSD = isUSD ? amt : amt.div(rate);
                            memberTotalCasheaUSD = memberTotalCasheaUSD.add(nativeUSD);
                            memberCasheaTransactions += 1;
                        } else if (isUSD) {
                            nativeUSD = amt;
                            memberTotalUSD = memberTotalUSD.add(nativeUSD);
                        } else {
                            nativeVES = amt;
                            memberTotalVES = memberTotalVES.add(nativeVES);
                        }

                        const displayMethodName = isCashea ? 'Financiamiento de Cashea' : pay.paymentMethod.name;
                        const existing = sellerMethodStats.get(pay.paymentMethodId);
                        if (existing) {
                            existing.transactions += 1;
                            existing.amountUSD = existing.amountUSD.add(nativeUSD);
                            existing.amountVES = existing.amountVES.add(nativeVES);
                        } else {
                            sellerMethodStats.set(pay.paymentMethodId, {
                                method: displayMethodName,
                                type: pay.paymentMethod.type,
                                currency: isCashea ? 'USD' : pay.paymentMethod.currency,
                                isCashea,
                                transactions: 1,
                                amountUSD: nativeUSD,
                                amountVES: nativeVES
                            });
                        }
                    }

                    for (const item of sale.items) {
                        articlesCount += Number(item.quantity);
                    }
                }

                const sellerStatsList = Array.from(sellerMethodStats.values());
                const sellerMethodsUSD = sellerStatsList
                    .filter(m => !m.isCashea && m.currency === 'USD')
                    .map(m => ({
                        method: m.method,
                        type: m.type,
                        currency: 'USD',
                        transactions: m.transactions,
                        amountUSD: Number(m.amountUSD.toFixed(2)),
                        amountVES: 0
                    }))
                    .sort((a, b) => b.amountUSD - a.amountUSD);

                const sellerMethodsVES = sellerStatsList
                    .filter(m => !m.isCashea && m.currency !== 'USD')
                    .map(m => ({
                        method: m.method,
                        type: m.type,
                        currency: 'VES',
                        transactions: m.transactions,
                        amountUSD: 0,
                        amountVES: Number(m.amountVES.toFixed(2))
                    }))
                    .sort((a, b) => b.amountVES - a.amountVES);

                const sellerMethodsCashea = sellerStatsList
                    .filter(m => m.isCashea)
                    .map(m => ({
                        method: 'Financiamiento de Cashea',
                        type: m.type,
                        currency: 'USD',
                        transactions: m.transactions,
                        amountUSD: Number(m.amountUSD.toFixed(2)),
                        amountVES: 0
                    }));

                // Registers count
                const openRegistersCount = memberRegisters.filter(r => r.status === 'OPEN').length;
                const closedRegistersCount = memberRegisters.filter(r => r.status === 'CLOSED').length;

                // Turnos de caja details
                const registersDetails = memberRegisters.map(reg => {
                    const regPayments = reg.payments;
                    const regSalesCount = new Set(regPayments.map(p => p.saleId)).size;

                    let regCollectedUSD = new Decimal(0);
                    let regCollectedVES = new Decimal(0);
                    let regCollectedCasheaUSD = new Decimal(0);

                    for (const p of regPayments) {
                        const amt = new Decimal(p.amount);
                        const rate = new Decimal(p.exchangeRate.rate);
                        const isCashea = isCasheaPaymentMethod(p.paymentMethod.name);
                        const isUSD = p.paymentMethod.currency === 'USD';

                        if (isCashea) {
                            regCollectedCasheaUSD = regCollectedCasheaUSD.add(isUSD ? amt : amt.div(rate));
                        } else if (isUSD) {
                            regCollectedUSD = regCollectedUSD.add(amt);
                        } else {
                            regCollectedVES = regCollectedVES.add(amt);
                        }
                    }

                    return {
                        id: `CAJA-${String(reg.id).padStart(3, '0')}`,
                        status: reg.status,
                        openTime: reg.openTime.toISOString(),
                        closeTime: reg.closeTime ? reg.closeTime.toISOString() : '—',
                        initialAmount: Number(reg.initialAmount),
                        finalAmount: Number(new Decimal(reg.initialAmount).add(regCollectedUSD).toFixed(2)),
                        collectedUSD: Number(regCollectedUSD.toFixed(2)),
                        collectedVES: Number(regCollectedVES.toFixed(2)),
                        collectedCasheaUSD: Number(regCollectedCasheaUSD.toFixed(2)),
                        salesCount: regSalesCount,
                        difference: 0
                    };
                });

                // Products sold details
                const productStats = new Map<number, {
                    id: string;
                    name: string;
                    sku: string;
                    category: string;
                    quantitySold: Decimal;
                    totalRevenueUSD: Decimal;
                    totalRevenueVES: Decimal;
                }>();

                for (const sale of memberSales) {
                    const saleRate = new Decimal(sale.exchangeRate.rate);
                    for (const item of sale.items) {
                        const lineRevenueUSD = new Decimal(item.subTotal);
                        const lineRevenueVES = lineRevenueUSD.mul(saleRate);
                        const qty = new Decimal(item.quantity);

                        const existing = productStats.get(item.productId);
                        if (existing) {
                            existing.quantitySold = existing.quantitySold.add(qty);
                            existing.totalRevenueUSD = existing.totalRevenueUSD.add(lineRevenueUSD);
                            existing.totalRevenueVES = existing.totalRevenueVES.add(lineRevenueVES);
                        } else {
                            productStats.set(item.productId, {
                                id: String(item.productId),
                                name: item.product.name,
                                sku: item.product.sku || 'N/A',
                                category: item.product.category.name,
                                quantitySold: qty,
                                totalRevenueUSD: lineRevenueUSD,
                                totalRevenueVES: lineRevenueVES
                            });
                        }
                    }
                }

                const productsDetails = Array.from(productStats.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    sku: p.sku,
                    category: p.category,
                    quantitySold: p.quantitySold.toNumber(),
                    unitPrice: p.quantitySold.gt(0) ? Number(p.totalRevenueUSD.div(p.quantitySold).toFixed(2)) : 0,
                    totalRevenueUSD: Number(p.totalRevenueUSD.toFixed(2)),
                    totalRevenueVES: Number(p.totalRevenueVES.toFixed(2))
                })).sort((a, b) => b.totalRevenueUSD - a.totalRevenueUSD);

                return {
                    id: String(member.id),
                    name: member.user.name,
                    ci: member.user.ci,
                    totalSales: memberSales.length,
                    totalUSD: Number(memberTotalUSD.toFixed(2)),
                    totalVES: Number(memberTotalVES.toFixed(2)),
                    totalCasheaUSD: Number(memberTotalCasheaUSD.toFixed(2)),
                    casheaTransactions: memberCasheaTransactions,
                    methodsUSD: sellerMethodsUSD,
                    methodsVES: sellerMethodsVES,
                    methodsCashea: sellerMethodsCashea,
                    articlesCount,
                    cashRegistersCount: {
                        open: openRegistersCount,
                        closed: closedRegistersCount
                    },
                    registers: registersDetails,
                    products: productsDetails
                };
            });

            // Filter out members with no activity if they are not selected by sellerId specifically
            const activeSellersReport = sellersReport.filter(seller =>
                sellerId || seller.totalSales > 0 || seller.registers.length > 0
            );

            return {
                status: 200,
                message: 'Reporte de vendedores obtenido exitosamente',
                data: activeSellersReport
            };

        } catch (error) {
            console.error('Error generando reporte de vendedores:', error);
            return {
                status: 500,
                message: 'Error interno al generar reporte de vendedores',
                data: []
            };
        }
    }

    async generateCashRegisterPDF(businessId: number, query: DateRangeQuery & { sellerId?: string | number }) {
        try {
            // Fetch business info for the PDF header
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true, logoUrl: true }
            });

            if (!business) {
                return { status: 404, message: 'Negocio no encontrado', data: null };
            }

            // Reuse existing service methods
            const [overviewResult, sellersResult] = await Promise.all([
                this.getOverview(businessId, query),
                this.getSellersReport(businessId, query),
            ]);

            if (overviewResult.status !== 200 || !overviewResult.data) {
                return { status: overviewResult.status, message: overviewResult.message, data: null };
            }
            if (sellersResult.status !== 200 || !sellersResult.data) {
                return { status: sellersResult.status, message: sellersResult.message, data: null };
            }

            // Build date range label
            const tzOffsetMinutes = (() => {
                if (query.tzOffset === null || query.tzOffset === undefined) {
                    return new Date().getTimezoneOffset();
                }
                const parsed = Number(query.tzOffset);
                return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
            })();

            const now = new Date();
            const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);

            const fromLabel = query.fromDate
                ? query.fromDate
                : defaultMonthRange.start.toISOString().split('T')[0];

            const toLabel = query.toDate
                ? query.toDate
                : defaultMonthRange.end.toISOString().split('T')[0];

            // Seller name for filter label (if filtered)
            let sellerFilterName: string | null = null;
            if (query.sellerId) {
                const seller = sellersResult.data.find(
                    (s: { id: string }) => s.id === String(query.sellerId)
                );
                sellerFilterName = seller?.name ?? null;
            }

            return {
                status: 200,
                message: 'Datos del PDF generados exitosamente',
                data: {
                    businessName: business.name,
                    logoUrl: business.logoUrl ?? null,
                    dateRange: { from: fromLabel, to: toLabel },
                    sellerFilter: sellerFilterName,
                    overview: overviewResult.data,
                    sellers: sellersResult.data,
                }
            };

        } catch (error) {
            console.error('Error preparando datos del PDF de caja:', error);
            return { status: 500, message: 'Error interno al preparar el PDF', data: null };
        }
    }
}
