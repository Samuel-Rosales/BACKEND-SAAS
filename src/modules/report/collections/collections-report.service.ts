import { prisma } from '@/configs';
import { Decimal } from '@prisma/client/runtime/client';

type DateRangeQuery = {
    fromDate?: string;
    toDate?: string;
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

const parseCalendarDateStart = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

const parseCalendarDateEnd = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    if (!year || !month || !day) return new Date(value);
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
};

export class CollectionsReportService {

    async getOverview(businessId: number, query: DateRangeQuery) {
        const now = new Date();

        const tzOffsetMinutes = (() => {
            if (query.tzOffset === null || query.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(query.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        let rangeStart = defaultMonthRange.start;
        let rangeEnd = defaultMonthRange.end;

        let calendarRangeStart: Date;
        let calendarRangeEnd: Date;

        if (query.fromDate && query.toDate) {
            rangeStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            rangeEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
            calendarRangeStart = parseCalendarDateStart(query.fromDate);
            calendarRangeEnd = parseCalendarDateEnd(query.toDate);
        } else if (query.fromDate && !query.toDate) {
            rangeStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            rangeEnd = now;
            calendarRangeStart = parseCalendarDateStart(query.fromDate);
            calendarRangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        } else if (!query.fromDate && query.toDate) {
            const base = parseDateOnlyStart(query.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            rangeStart = monthRange.start;
            rangeEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
            const fromStr = monthRange.start.toISOString().split('T')[0];
            calendarRangeStart = parseCalendarDateStart(fromStr);
            calendarRangeEnd = parseCalendarDateEnd(query.toDate);
        } else {
            const fromStr = defaultMonthRange.start.toISOString().split('T')[0];
            const toStr = defaultMonthRange.end.toISOString().split('T')[0];
            calendarRangeStart = parseCalendarDateStart(fromStr);
            calendarRangeEnd = parseCalendarDateEnd(toStr);
        }

        const todayStartCalendar = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0));

        try {
            const [
                debtAggregation,
                paymentsInPeriod,
                debtorsCount,
                overdueInstallmentsCount,
                expectedInstallments,
                singleDueDateSales
            ] = await Promise.all([
                // 1. Total por cobrar (deuda global activa, NO filtrada por fecha de creación)
                prisma.sale.aggregate({
                    _sum: { remainingBalance: true },
                    where: {
                        businessId,
                        conditions: 'CREDIT',
                        status: 'COMPLETED',
                        remainingBalance: { gt: 0 },
                        deletedAt: null
                    }
                }),

                // 2. Total cobrado EN el período (pagos recibidos para ventas a crédito con conversión de moneda a USD)
                prisma.salePayment.findMany({
                    where: {
                        sale: {
                            businessId,
                            conditions: 'CREDIT',
                            status: 'COMPLETED',
                            deletedAt: null
                        },
                        date: { gte: rangeStart, lte: rangeEnd }
                    },
                    include: {
                        paymentMethod: { select: { currency: true } },
                        exchangeRate: { select: { rate: true } }
                    }
                }),

                // 3. Clientes deudores (distinct)
                prisma.sale.groupBy({
                    by: ['clientId'],
                    where: {
                        businessId,
                        conditions: 'CREDIT',
                        status: 'COMPLETED',
                        remainingBalance: { gt: 0 },
                        deletedAt: null
                    }
                }),

                // 4. Cuotas vencidas (dueDate < hoy y no pagadas/parcialmente pagadas)
                prisma.saleInstallment.count({
                    where: {
                        sale: {
                            businessId,
                            conditions: 'CREDIT',
                            status: 'COMPLETED',
                            deletedAt: null
                        },
                        status: { in: ['PENDING', 'PARTIAL'] },
                        dueDate: { lt: todayStartCalendar }
                    }
                }),

                // 5. Cuotas comprometidas/programadas para vencer en el período seleccionado
                prisma.saleInstallment.findMany({
                    where: {
                        sale: {
                            businessId,
                            conditions: 'CREDIT',
                            status: 'COMPLETED',
                            deletedAt: null
                        },
                        dueDate: { gte: calendarRangeStart, lte: calendarRangeEnd }
                    },
                    select: {
                        amount: true
                    }
                }),

                // 6. Ventas a crédito sin cuotas individuales pero con fecha de vencimiento en el período
                prisma.sale.findMany({
                    where: {
                        businessId,
                        conditions: 'CREDIT',
                        status: 'COMPLETED',
                        deletedAt: null,
                        installments: { none: {} },
                        paymentDueDate: { gte: calendarRangeStart, lte: calendarRangeEnd }
                    },
                    select: {
                        totalAmount: true
                    }
                })
            ]);

            const totalToCollect = debtAggregation._sum.remainingBalance ? Number(debtAggregation._sum.remainingBalance) : 0;

            // Suma convertida a USD según la divisa y tasa histórica de cada pago
            let totalCollectedDecimal = new Decimal(0);
            for (const pay of paymentsInPeriod) {
                const amt = new Decimal(pay.amount);
                const currency = pay.paymentMethod?.currency;
                const rate = pay.exchangeRate?.rate ? new Decimal(pay.exchangeRate.rate) : new Decimal(1);

                if (currency === 'USD') {
                    totalCollectedDecimal = totalCollectedDecimal.add(amt);
                } else {
                    totalCollectedDecimal = totalCollectedDecimal.add(rate.gt(0) ? amt.div(rate) : new Decimal(0));
                }
            }
            const totalCollected = totalCollectedDecimal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

            const installmentsTotal = expectedInstallments.reduce((sum, inst) => sum + Number(inst.amount), 0);
            const singleSalesTotal = singleDueDateSales.reduce((sum, sale) => sum + Number(sale.totalAmount), 0);
            const expectedInPeriod = Number((installmentsTotal + singleSalesTotal).toFixed(2));

            return {
                status: 200,
                message: 'Métricas de cobranza calculadas exitosamente',
                data: {
                    totalToCollect,
                    totalCollected,
                    debtorsCount: debtorsCount.length,
                    overdueInstallmentsCount,
                    expectedInPeriod
                }
            };

        } catch (error) {
            console.error('Error al obtener métricas de cobranza:', error);
            return {
                status: 500,
                message: 'Error interno al calcular métricas de cobranza',
                data: {
                    totalToCollect: 0,
                    totalCollected: 0,
                    debtorsCount: 0,
                    overdueInstallmentsCount: 0,
                    expectedInPeriod: 0
                }
            };
        }
    }

    async getDebtors(
        businessId: number,
        query: DateRangeQuery & { search?: string; page?: number; limit?: number }
    ) {
        const now = new Date();

        const tzOffsetMinutes = (() => {
            if (query.tzOffset === null || query.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(query.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        let calendarRangeStart: Date | undefined;
        let calendarRangeEnd: Date | undefined;

        if (query.fromDate && query.toDate) {
            calendarRangeStart = parseCalendarDateStart(query.fromDate);
            calendarRangeEnd = parseCalendarDateEnd(query.toDate);
        } else if (query.fromDate && !query.toDate) {
            calendarRangeStart = parseCalendarDateStart(query.fromDate);
            calendarRangeEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999));
        } else if (!query.fromDate && query.toDate) {
            const base = parseDateOnlyStart(query.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            const fromStr = monthRange.start.toISOString().split('T')[0];
            calendarRangeStart = parseCalendarDateStart(fromStr);
            calendarRangeEnd = parseCalendarDateEnd(query.toDate);
        }

        const page = query.page && query.page > 0 ? query.page : 1;
        const limit = query.limit && query.limit > 0 ? query.limit : 20;
        const search = query.search?.trim();

        // Filtro base: Ventas a crédito del negocio, completadas, activas, y con saldo pendiente
        const where: any = {
            businessId,
            conditions: 'CREDIT',
            status: 'COMPLETED',
            remainingBalance: { gt: 0 },
            deletedAt: null,
            ...(calendarRangeStart && calendarRangeEnd ? {
                OR: [
                    {
                        installments: {
                            some: {
                                dueDate: { gte: calendarRangeStart, lte: calendarRangeEnd }
                            }
                        }
                    },
                    {
                        installments: { none: {} },
                        paymentDueDate: { gte: calendarRangeStart, lte: calendarRangeEnd }
                    }
                ]
            } : {}),
            ...(search ? {
                client: {
                    OR: [
                        { name: { contains: search, mode: 'insensitive' } },
                        { ci: { contains: search, mode: 'insensitive' } },
                        { phone: { contains: search, mode: 'insensitive' } }
                    ]
                }
            } : {})
        };

        try {
            const [sales, total] = await Promise.all([
                prisma.sale.findMany({
                    where,
                    select: {
                        id: true,
                        receiptNumber: true,
                        createdAt: true,
                        totalAmount: true,
                        remainingBalance: true,
                        paymentStatus: true,
                        client: {
                            select: {
                                id: true,
                                name: true,
                                ci: true,
                                phone: true
                            }
                        },
                        installments: {
                            select: {
                                id: true,
                                number: true,
                                amount: true,
                                amountPaid: true,
                                dueDate: true,
                                status: true,
                                paidAt: true
                            },
                            orderBy: {
                                number: 'asc'
                            }
                        },
                        business: {
                            select: {
                                name: true
                            }
                        }
                    },
                    orderBy: {
                        createdAt: 'desc'
                    },
                    skip: (page - 1) * limit,
                    take: limit
                }),
                prisma.sale.count({ where })
            ]);

            const formattedSales = sales.map(sale => ({
                id: sale.id,
                receiptNumber: sale.receiptNumber,
                clientName: sale.client.name,
                clientPhone: sale.client.phone || undefined,
                businessName: sale.business.name,
                createdAt: sale.createdAt.toISOString(),
                totalAmount: Number(sale.totalAmount),
                remainingBalance: Number(sale.remainingBalance),
                status: sale.paymentStatus,
                installments: sale.installments.map(inst => ({
                    id: inst.id,
                    number: inst.number,
                    amount: Number(inst.amount),
                    amountPaid: Number(inst.amountPaid),
                    dueDate: inst.dueDate.toISOString(),
                    status: inst.status,
                    paidAt: inst.paidAt ? inst.paidAt.toISOString() : null
                }))
            }));

            const totalPages = Math.ceil(total / limit);

            return {
                status: 200,
                message: 'Ventas deudoras recuperadas exitosamente',
                data: {
                    data: formattedSales,
                    pagination: {
                        page,
                        limit,
                        total,
                        totalPages
                    }
                }
            };

        } catch (error) {
            console.error('Error al obtener ventas deudoras:', error);
            return {
                status: 500,
                message: 'Error interno al obtener ventas deudoras',
                data: {
                    data: [],
                    pagination: {
                        page,
                        limit,
                        total: 0,
                        totalPages: 0
                    }
                }
            };
        }
    }

    async generateCollectionsPDF(businessId: number, query: DateRangeQuery) {
        try {
            const business = await prisma.business.findUnique({
                where: { id: businessId },
                select: { name: true, logoUrl: true }
            });

            if (!business) {
                return { status: 404, message: 'Negocio no encontrado', data: null };
            }

            const [overviewResult, debtorsResult] = await Promise.all([
                this.getOverview(businessId, query),
                this.getDebtors(businessId, { ...query, page: 1, limit: 100 }),
            ]);

            if (overviewResult.status !== 200 || !overviewResult.data) {
                return { status: overviewResult.status, message: overviewResult.message, data: null };
            }
            if (debtorsResult.status !== 200 || !debtorsResult.data) {
                return { status: debtorsResult.status, message: debtorsResult.message, data: null };
            }

            // Date range labels
            const now = new Date();
            const tzOffsetMinutes = (() => {
                if (query.tzOffset === null || query.tzOffset === undefined) {
                    return new Date().getTimezoneOffset();
                }
                const parsed = Number(query.tzOffset);
                return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
            })();

            const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
            const fromLabel = query.fromDate || defaultMonthRange.start.toISOString().split('T')[0];
            const toLabel = query.toDate || defaultMonthRange.end.toISOString().split('T')[0];

            return {
                status: 200,
                message: 'Datos del PDF de cobranza generados exitosamente',
                data: {
                    businessName: business.name,
                    logoUrl: business.logoUrl ?? null,
                    dateRange: { from: fromLabel, to: toLabel },
                    overview: overviewResult.data,
                    debtors: debtorsResult.data.data,
                }
            };

        } catch (error) {
            console.error('Error generando datos para PDF de cobranza:', error);
            return { status: 500, message: 'Error interno al generar PDF de cobranza', data: null };
        }
    }

    /**
     * CAJA DE COBRANZA:
     * Reporte detallado de fondos recaudados por concepto de abonos a crédito en el período.
     */
    async getCashBox(businessId: number, query: DateRangeQuery) {
        const now = new Date();
        const tzOffsetMinutes = (() => {
            if (query.tzOffset === null || query.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(query.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        let rangeStart = defaultMonthRange.start;
        let rangeEnd = defaultMonthRange.end;

        if (query.fromDate && query.toDate) {
            rangeStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            rangeEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        } else if (query.fromDate && !query.toDate) {
            rangeStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            rangeEnd = now;
        } else if (!query.fromDate && query.toDate) {
            const base = parseDateOnlyStart(query.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            rangeStart = monthRange.start;
            rangeEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        }

        try {
            const payments = await prisma.salePayment.findMany({
                where: {
                    sale: {
                        businessId,
                        conditions: 'CREDIT',
                        status: 'COMPLETED',
                        deletedAt: null
                    },
                    date: { gte: rangeStart, lte: rangeEnd }
                },
                include: {
                    paymentMethod: { select: { id: true, name: true, type: true, currency: true } },
                    exchangeRate: { select: { rate: true } },
                    sale: {
                        select: {
                            id: true,
                            receiptNumber: true,
                            client: { select: { id: true, name: true, ci: true, phone: true } }
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            let totalCollectedUSD = new Decimal(0);
            let totalCollectedVES = new Decimal(0);
            let counterUSD = new Decimal(0);
            let counterCount = 0;
            let adminUSD = new Decimal(0);
            let adminCount = 0;

            const methodsMap = new Map<number, {
                id: number;
                methodName: string;
                paymentType: string;
                currency: string;
                count: number;
                totalUSD: Decimal;
                totalVES: Decimal;
            }>();

            for (const pay of payments) {
                const amt = new Decimal(pay.amount);
                const curr = pay.paymentMethod?.currency || 'USD';
                const rate = pay.exchangeRate?.rate ? new Decimal(pay.exchangeRate.rate) : new Decimal(1);

                let usdEquivalent = new Decimal(0);
                let vesEquivalent = new Decimal(0);

                if (curr === 'USD') {
                    usdEquivalent = amt;
                    vesEquivalent = rate.gt(0) ? amt.mul(rate) : new Decimal(0);
                } else {
                    vesEquivalent = amt;
                    usdEquivalent = rate.gt(0) ? amt.div(rate) : new Decimal(0);
                }

                totalCollectedUSD = totalCollectedUSD.add(usdEquivalent);
                totalCollectedVES = totalCollectedVES.add(vesEquivalent);

                // Canal: Mostrador (con caja activa) vs Administrativo (WhatsApp / Banco)
                if (pay.cashRegisterId) {
                    counterUSD = counterUSD.add(usdEquivalent);
                    counterCount++;
                } else {
                    adminUSD = adminUSD.add(usdEquivalent);
                    adminCount++;
                }

                // Desglose por Método
                const mId = pay.paymentMethod?.id || 0;
                if (!methodsMap.has(mId)) {
                    methodsMap.set(mId, {
                        id: mId,
                        methodName: pay.paymentMethod?.name || 'Otro',
                        paymentType: String(pay.paymentMethod?.type || 'OTHER'),
                        currency: curr,
                        count: 0,
                        totalUSD: new Decimal(0),
                        totalVES: new Decimal(0)
                    });
                }
                const mEntry = methodsMap.get(mId)!;
                mEntry.count++;
                mEntry.totalUSD = mEntry.totalUSD.add(usdEquivalent);
                mEntry.totalVES = mEntry.totalVES.add(vesEquivalent);
            }

            const totalNum = totalCollectedUSD.toNumber();
            const methods = Array.from(methodsMap.values()).map(m => {
                const usd = m.totalUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
                const ves = m.totalVES.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
                const percentage = totalNum > 0 ? Number(((usd / totalNum) * 100).toFixed(1)) : 0;
                return {
                    id: m.id,
                    methodName: m.methodName,
                    paymentType: m.paymentType,
                    currency: m.currency,
                    count: m.count,
                    totalUSD: usd,
                    totalVES: ves,
                    percentage
                };
            }).sort((a, b) => b.totalUSD - a.totalUSD);

            return {
                status: 200,
                message: 'Caja de cobranza obtenida exitosamente',
                data: {
                    totalCollectedUSD: totalCollectedUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                    totalCollectedVES: totalCollectedVES.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                    paymentsCount: payments.length,
                    channels: {
                        counter: {
                            count: counterCount,
                            totalUSD: counterUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
                        },
                        administrative: {
                            count: adminCount,
                            totalUSD: adminUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber()
                        }
                    },
                    methods,
                    payments: payments.slice(0, 100).map(p => ({
                        id: p.id,
                        date: p.date,
                        amount: Number(p.amount),
                        reference: p.reference,
                        paymentProofUrl: p.paymentProofUrl,
                        cashRegisterId: p.cashRegisterId,
                        channel: p.cashRegisterId ? 'COUNTER' : 'ADMINISTRATIVE',
                        methodName: p.paymentMethod?.name || 'N/A',
                        currency: p.paymentMethod?.currency || 'USD',
                        clientName: p.sale.client.name,
                        clientCi: p.sale.client.ci,
                        saleReceiptNumber: p.sale.receiptNumber,
                        saleId: p.sale.id
                    }))
                }
            };
        } catch (error) {
            console.error('Error al obtener caja de cobranza:', error);
            return { status: 500, message: 'Error interno al obtener caja de cobranza', data: null };
        }
    }

    /**
     * REPORTE CONSOLIDADO DE INGRESOS (VENTAS VS COBRANZAS):
     * Muestra todo el dinero que entró a la empresa en el período,
     * diferenciando con total nitidez lo que ingresó por ventas de contado vs recuperación de deudas.
     */
    async getConsolidatedIncome(businessId: number, query: DateRangeQuery) {
        const now = new Date();
        const tzOffsetMinutes = (() => {
            if (query.tzOffset === null || query.tzOffset === undefined) {
                return new Date().getTimezoneOffset();
            }
            const parsed = Number(query.tzOffset);
            return Number.isFinite(parsed) ? parsed : new Date().getTimezoneOffset();
        })();

        const defaultMonthRange = getLocalMonthRangeUtc(now, tzOffsetMinutes, 0);
        let rangeStart = defaultMonthRange.start;
        let rangeEnd = defaultMonthRange.end;

        if (query.fromDate && query.toDate) {
            rangeStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            rangeEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        } else if (query.fromDate && !query.toDate) {
            rangeStart = parseDateOnlyStart(query.fromDate, tzOffsetMinutes);
            rangeEnd = now;
        } else if (!query.fromDate && query.toDate) {
            const base = parseDateOnlyStart(query.toDate, tzOffsetMinutes);
            const monthRange = getLocalMonthRangeUtc(base, tzOffsetMinutes, 0);
            rangeStart = monthRange.start;
            rangeEnd = parseDateOnlyEnd(query.toDate, tzOffsetMinutes);
        }

        try {
            const allPayments = await prisma.salePayment.findMany({
                where: {
                    sale: {
                        businessId,
                        status: 'COMPLETED',
                        deletedAt: null
                    },
                    date: { gte: rangeStart, lte: rangeEnd }
                },
                include: {
                    paymentMethod: { select: { id: true, name: true, type: true, currency: true } },
                    exchangeRate: { select: { rate: true } },
                    sale: { select: { conditions: true } }
                }
            });

            let totalInflowUSD = new Decimal(0);
            let totalInflowVES = new Decimal(0);

            let salesUSD = new Decimal(0);
            let salesVES = new Decimal(0);
            let salesCount = 0;

            let collectionsUSD = new Decimal(0);
            let collectionsVES = new Decimal(0);
            let collectionsCount = 0;

            const matrixMap = new Map<number, {
                id: number;
                methodName: string;
                paymentType: string;
                currency: string;
                salesUSD: Decimal;
                collectionsUSD: Decimal;
                totalUSD: Decimal;
                totalVES: Decimal;
                count: number;
            }>();

            for (const pay of allPayments) {
                const amt = new Decimal(pay.amount);
                const curr = pay.paymentMethod?.currency || 'USD';
                const rate = pay.exchangeRate?.rate ? new Decimal(pay.exchangeRate.rate) : new Decimal(1);

                let usdEquivalent = new Decimal(0);
                let vesEquivalent = new Decimal(0);

                if (curr === 'USD') {
                    usdEquivalent = amt;
                    vesEquivalent = rate.gt(0) ? amt.mul(rate) : new Decimal(0);
                } else {
                    vesEquivalent = amt;
                    usdEquivalent = rate.gt(0) ? amt.div(rate) : new Decimal(0);
                }

                totalInflowUSD = totalInflowUSD.add(usdEquivalent);
                totalInflowVES = totalInflowVES.add(vesEquivalent);

                const isCredit = pay.sale.conditions === 'CREDIT';

                if (isCredit) {
                    collectionsUSD = collectionsUSD.add(usdEquivalent);
                    collectionsVES = collectionsVES.add(vesEquivalent);
                    collectionsCount++;
                } else {
                    salesUSD = salesUSD.add(usdEquivalent);
                    salesVES = salesVES.add(vesEquivalent);
                    salesCount++;
                }

                const mId = pay.paymentMethod?.id || 0;
                if (!matrixMap.has(mId)) {
                    matrixMap.set(mId, {
                        id: mId,
                        methodName: pay.paymentMethod?.name || 'Otro',
                        paymentType: String(pay.paymentMethod?.type || 'OTHER'),
                        currency: curr,
                        salesUSD: new Decimal(0),
                        collectionsUSD: new Decimal(0),
                        totalUSD: new Decimal(0),
                        totalVES: new Decimal(0),
                        count: 0
                    });
                }
                const row = matrixMap.get(mId)!;
                row.count++;
                row.totalUSD = row.totalUSD.add(usdEquivalent);
                row.totalVES = row.totalVES.add(vesEquivalent);
                if (isCredit) {
                    row.collectionsUSD = row.collectionsUSD.add(usdEquivalent);
                } else {
                    row.salesUSD = row.salesUSD.add(usdEquivalent);
                }
            }

            const totalInflowNum = totalInflowUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
            const salesNum = salesUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
            const collectionsNum = collectionsUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();

            const salesPct = totalInflowNum > 0 ? Number(((salesNum / totalInflowNum) * 100).toFixed(1)) : 0;
            const collectionsPct = totalInflowNum > 0 ? Number(((collectionsNum / totalInflowNum) * 100).toFixed(1)) : 0;

            const matrix = Array.from(matrixMap.values()).map(r => {
                const totalRowUSD = r.totalUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
                const totalRowVES = r.totalVES.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber();
                const pct = totalInflowNum > 0 ? Number(((totalRowUSD / totalInflowNum) * 100).toFixed(1)) : 0;
                return {
                    id: r.id,
                    methodName: r.methodName,
                    paymentType: r.paymentType,
                    currency: r.currency,
                    salesUSD: r.salesUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                    collectionsUSD: r.collectionsUSD.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                    totalUSD: totalRowUSD,
                    totalVES: totalRowVES,
                    count: r.count,
                    percentage: pct
                };
            }).sort((a, b) => b.totalUSD - a.totalUSD);

            return {
                status: 200,
                message: 'Consolidado de ingresos obtenido exitosamente',
                data: {
                    totalInflowUSD: totalInflowNum,
                    totalInflowVES: totalInflowVES.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                    sales: {
                        totalUSD: salesNum,
                        totalVES: salesVES.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                        count: salesCount,
                        percentage: salesPct
                    },
                    collections: {
                        totalUSD: collectionsNum,
                        totalVES: collectionsVES.toDecimalPlaces(2, Decimal.ROUND_HALF_UP).toNumber(),
                        count: collectionsCount,
                        percentage: collectionsPct
                    },
                    matrix
                }
            };
        } catch (error) {
            console.error('Error al calcular consolidado de ingresos:', error);
            return { status: 500, message: 'Error interno al calcular consolidado de ingresos', data: null };
        }
    }
}

