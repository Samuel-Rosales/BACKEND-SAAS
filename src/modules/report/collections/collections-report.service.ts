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
}

