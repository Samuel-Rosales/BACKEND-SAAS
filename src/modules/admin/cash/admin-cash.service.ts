import { prisma } from '@/configs';

export interface CreateAdminExpenseDto {
  title: string;
  category?: string; // OPERATIONAL, USDT_PURCHASE, SERVERS, MARKETING, COMMISSIONS, OTHER
  amount: number;
  currency: 'USDT' | 'USD' | 'VES';
  exchangeRate?: number;
  amountInUSD?: number;
  usdtReceived?: number;
  date?: string;
  reference?: string;
  notes?: string;
}

export interface GetCashFilterDto {
  startDate?: string;
  endDate?: string;
  month?: string;
}

// Fecha oficial de inicio de caja del SaaS (arranque limpio desde hoy 2026-10-31 ordenado por el usuario)
export const SAAS_CASH_INCEPTION_DATE = new Date('2026-10-31T00:00:00.000Z');

/**
 * Normaliza fechas tipo 'YYYY-MM-DD' al mediodía UTC (12:00:00Z) para evitar
 * desfases de -1 día al formatear en zonas horarias americanas (VET UTC-4).
 */
function parseAnchoredExpenseDate(input?: string): Date {
  if (!input) {
    const vetNow = new Date(Date.now() - 4 * 60 * 60 * 1000);
    const ymd = vetNow.toISOString().split('T')[0];
    return new Date(`${ymd}T12:00:00.000Z`);
  }
  const trimmed = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T12:00:00.000Z`);
  }
  const parsed = new Date(trimmed);
  if (isNaN(parsed.getTime())) {
    const vetNow = new Date(Date.now() - 4 * 60 * 60 * 1000);
    return new Date(`${vetNow.toISOString().split('T')[0]}T12:00:00.000Z`);
  }
  return parsed;
}

export class AdminCashService {
  /**
   * Resuelve el rango de fechas respetando la fecha de inicio oficial (SAAS_CASH_INCEPTION_DATE).
   */
  private resolveDateRange(filters: GetCashFilterDto = {}) {
    let dateFrom = SAAS_CASH_INCEPTION_DATE;
    let dateTo: Date | null = null;

    if (filters.startDate) {
      const parsedStart = new Date(`${filters.startDate}T00:00:00.000Z`);
      if (!isNaN(parsedStart.getTime())) {
        dateFrom = parsedStart > SAAS_CASH_INCEPTION_DATE ? parsedStart : SAAS_CASH_INCEPTION_DATE;
      }
    } else if (filters.month && /^\d{4}-\d{2}$/.test(filters.month)) {
      const [y, m] = filters.month.split('-').map(Number);
      const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
      dateFrom = startOfMonth > SAAS_CASH_INCEPTION_DATE ? startOfMonth : SAAS_CASH_INCEPTION_DATE;
      dateTo = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0, 0) - 1);
    }

    if (filters.endDate) {
      const parsedEnd = new Date(`${filters.endDate}T23:59:59.999Z`);
      if (!isNaN(parsedEnd.getTime())) {
        dateTo = parsedEnd;
      }
    }

    return { dateFrom, dateTo };
  }

  /**
   * Resume ingresos, egresos, compras de USDT y saldos para una lista de movimientos.
   */
  private summarizeLedger(
    approvedPayments: Array<{ amount: any; currency: any }>,
    allExpenses: Array<{ amount: any; currency: any; category: any; usdtReceived: any }>,
    activeExchangeRate: number,
  ) {
    let totalIncomeUsd = 0;
    let totalIncomeVes = 0;

    for (const p of approvedPayments) {
      const amt = Number(p.amount) || 0;
      const cur = (p.currency as string).toUpperCase();
      if (cur === 'VES') {
        totalIncomeVes += amt;
      } else {
        totalIncomeUsd += amt;
      }
    }

    let totalExpensesUsd = 0;
    let totalExpensesVes = 0;
    let totalUsdtPurchased = 0;
    let totalVesSpentOnUsdt = 0;

    for (const exp of allExpenses) {
      const amt = Number(exp.amount) || 0;
      const cur = (exp.currency || 'USDT').toUpperCase();
      const cat = (exp.category || '').toUpperCase();

      if (cat === 'USDT_PURCHASE') {
        const usdtRec = Number(exp.usdtReceived) || 0;
        totalUsdtPurchased += usdtRec;
        if (cur === 'VES') {
          totalVesSpentOnUsdt += amt;
        } else {
          totalExpensesUsd += amt;
        }
      } else if (cur === 'VES') {
        totalExpensesVes += amt;
      } else {
        totalExpensesUsd += amt;
      }
    }

    const balanceUsdt = Number((totalIncomeUsd - totalExpensesUsd + totalUsdtPurchased).toFixed(2));
    const balanceVes = Number((totalIncomeVes - totalExpensesVes - totalVesSpentOnUsdt).toFixed(2));
    const vesInUsd = activeExchangeRate > 0 ? balanceVes / activeExchangeRate : 0;
    const totalEquivalentUsd = Number((balanceUsdt + vesInUsd).toFixed(2));

    return {
      balance: {
        usdt: balanceUsdt,
        ves: balanceVes,
        totalEquivalentUsd,
      },
      income: {
        totalUsd: Number(totalIncomeUsd.toFixed(2)),
        totalVes: Number(totalIncomeVes.toFixed(2)),
        count: approvedPayments.length,
      },
      expenses: {
        totalUsd: Number(totalExpensesUsd.toFixed(2)),
        totalVes: Number(totalExpensesVes.toFixed(2)),
        totalUsdtPurchased: Number(totalUsdtPurchased.toFixed(2)),
        totalVesSpentOnUsdt: Number(totalVesSpentOnUsdt.toFixed(2)),
        count: allExpenses.length,
      },
    };
  }

  /**
   * Calcula montos normalizados (amountInUSD, usdtReceived, exchangeRate) para creación o edición.
   */
  private normalizeExpenseAmounts(params: {
    category: string;
    currency: string;
    amount: number;
    exchangeRate: number | null;
    amountInUSD: number | null;
    usdtReceived: number | null;
  }) {
    const { category, currency, amount } = params;
    let exchangeRate = params.exchangeRate;
    let amountInUSD = params.amountInUSD;
    let usdtReceived = params.usdtReceived;

    if (category === 'USDT_PURCHASE') {
      if (currency === 'VES') {
        if (!usdtReceived && exchangeRate && exchangeRate > 0) {
          usdtReceived = Number((amount / exchangeRate).toFixed(2));
        } else if (usdtReceived && usdtReceived > 0 && (!exchangeRate || exchangeRate <= 0)) {
          exchangeRate = Number((amount / usdtReceived).toFixed(4));
        }
        amountInUSD = usdtReceived;
      } else {
        usdtReceived = usdtReceived || amount;
        amountInUSD = usdtReceived;
      }
    } else if (currency === 'VES') {
      if (!amountInUSD && exchangeRate && exchangeRate > 0) {
        amountInUSD = Number((amount / exchangeRate).toFixed(2));
      }
      usdtReceived = null;
    } else {
      amountInUSD = amount;
      usdtReceived = null;
    }

    return { exchangeRate, amountInUSD, usdtReceived };
  }

  /**
   * Formatea un registro AdminExpense para respuesta API.
   */
  private formatExpense(e: any) {
    return {
      id: e.id,
      title: e.title,
      category: e.category,
      amount: Number(e.amount),
      currency: e.currency,
      exchangeRate: e.exchangeRate ? Number(e.exchangeRate) : null,
      amountInUSD: e.amountInUSD ? Number(e.amountInUSD) : null,
      usdtReceived: e.usdtReceived ? Number(e.usdtReceived) : null,
      date: e.date.toISOString(),
      reference: e.reference,
      notes: e.notes,
      createdAt: e.createdAt.toISOString(),
    };
  }

  /**
   * Obtiene el balance en vivo de la caja del SaaS:
   * Ingresos por suscripciones aprobadas - Gastos + Compras de USDT
   * Con soporte de rango de fechas personalizado, saldo acumulado real y resumen general.
   */
  async getBalance(filters: GetCashFilterDto = {}) {
    try {
      const latestRateRecord = await prisma.exchangeRate.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      const activeExchangeRate = latestRateRecord ? Number(latestRateRecord.rate) : 55.0;

      const { dateFrom, dateTo } = this.resolveDateRange(filters);
      const isAllTime = !filters.startDate && !filters.endDate && !filters.month;

      const basePaymentFilter: any = {
        status: 'APPROVED',
        businessId: { notIn: [6, 11] },
        OR: [
          { reviewNote: null },
          { NOT: { reviewNote: { contains: '[OCULTO_CONTABILIDAD]' } } },
        ],
      };

      const periodPaymentWhere: any = {
        ...basePaymentFilter,
        createdAt: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) },
      };

      const periodExpenseWhere: any = {
        deletedAt: null,
        date: { gte: dateFrom, ...(dateTo ? { lte: dateTo } : {}) },
      };

      const [approvedPayments, allExpenses, cumulativeData] = await Promise.all([
        prisma.subscriptionPayment.findMany({
          where: periodPaymentWhere,
          select: { id: true, amount: true, currency: true, createdAt: true },
        }),
        prisma.adminExpense.findMany({
          where: periodExpenseWhere,
          orderBy: [{ date: 'desc' }, { id: 'desc' }],
        }),
        isAllTime
          ? Promise.resolve(null)
          : Promise.all([
              prisma.subscriptionPayment.findMany({
                where: { ...basePaymentFilter, createdAt: { gte: SAAS_CASH_INCEPTION_DATE } },
                select: { id: true, amount: true, currency: true },
              }),
              prisma.adminExpense.findMany({
                where: { deletedAt: null, date: { gte: SAAS_CASH_INCEPTION_DATE } },
                select: { amount: true, currency: true, category: true, usdtReceived: true },
              }),
            ]),
      ]);

      const periodSummary = this.summarizeLedger(approvedPayments, allExpenses, activeExchangeRate);
      const liveSummary = cumulativeData
        ? this.summarizeLedger(cumulativeData[0], cumulativeData[1], activeExchangeRate)
        : periodSummary;

      return {
        status: 200,
        message: 'Balance de caja del SaaS obtenido exitosamente',
        data: {
          period: {
            startDate: dateFrom.toISOString().split('T')[0],
            endDate: dateTo ? dateTo.toISOString().split('T')[0] : null,
            isAllTime,
            inceptionDate: SAAS_CASH_INCEPTION_DATE.toISOString().split('T')[0],
          },
          balance: periodSummary.balance,
          liveBalance: liveSummary.balance,
          income: periodSummary.income,
          expenses: periodSummary.expenses,
          exchangeRate: activeExchangeRate,
        },
      };
    } catch (error) {
      console.error('AdminCashService.getBalance error:', error);
      return {
        status: 500,
        message: 'Error al obtener balance de caja',
        data: null,
      };
    }
  }

  /**
   * Listar todos los gastos con filtrado opcional por moneda, categoría, fechas y búsqueda
   */
  async getExpenses(query: {
    currency?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    month?: string;
    search?: string;
  }) {
    try {
      const where: any = { deletedAt: null };
      const { dateFrom, dateTo } = this.resolveDateRange(query);

      where.date = { gte: dateFrom };
      if (dateTo) {
        where.date.lte = dateTo;
      }

      if (query.currency && query.currency !== 'ALL') {
        where.currency = query.currency.toUpperCase();
      }

      if (query.category && query.category !== 'ALL') {
        where.category = query.category.toUpperCase();
      }

      if (query.search && query.search.trim()) {
        const s = query.search.trim();
        where.OR = [
          { title: { contains: s, mode: 'insensitive' } },
          { reference: { contains: s, mode: 'insensitive' } },
          { notes: { contains: s, mode: 'insensitive' } },
        ];
      }

      const expenses = await prisma.adminExpense.findMany({
        where,
        orderBy: [{ date: 'desc' }, { id: 'desc' }],
      });

      return {
        status: 200,
        message: 'Gastos administrativos obtenidos exitosamente',
        data: expenses.map((e) => this.formatExpense(e)),
      };
    } catch (error) {
      console.error('AdminCashService.getExpenses error:', error);
      return {
        status: 500,
        message: 'Error al obtener gastos administrativos',
        data: [],
      };
    }
  }

  /**
   * Crear un gasto o compra de USDT
   */
  async createExpense(dto: CreateAdminExpenseDto, userId?: number) {
    try {
      if (!dto.title || !dto.amount || dto.amount <= 0 || !dto.currency) {
        return {
          status: 400,
          message: 'Título, monto mayor a cero y moneda son requeridos.',
          data: null,
        };
      }

      const category = (dto.category || 'OPERATIONAL').toUpperCase();
      const currency = dto.currency.toUpperCase();
      const amount = Number(dto.amount);

      const { exchangeRate, amountInUSD, usdtReceived } = this.normalizeExpenseAmounts({
        category,
        currency,
        amount,
        exchangeRate: dto.exchangeRate ? Number(dto.exchangeRate) : null,
        amountInUSD: dto.amountInUSD ? Number(dto.amountInUSD) : null,
        usdtReceived: dto.usdtReceived ? Number(dto.usdtReceived) : null,
      });

      const expenseDate = parseAnchoredExpenseDate(dto.date);

      const created = await prisma.adminExpense.create({
        data: {
          title: dto.title.trim(),
          category,
          amount,
          currency,
          exchangeRate,
          amountInUSD,
          usdtReceived,
          date: expenseDate,
          reference: dto.reference?.trim() || null,
          notes: dto.notes?.trim() || null,
          createdById: userId || null,
        },
      });

      return {
        status: 201,
        message: category === 'USDT_PURCHASE' ? 'Compra de USDT registrada exitosamente' : 'Gasto registrado exitosamente',
        data: this.formatExpense(created),
      };
    } catch (error) {
      console.error('AdminCashService.createExpense error:', error);
      return {
        status: 500,
        message: 'Error al registrar gasto',
        data: null,
      };
    }
  }

  /**
   * Editar un gasto o compra de USDT existente
   */
  async updateExpense(id: number, dto: Partial<CreateAdminExpenseDto>) {
    try {
      const existing = await prisma.adminExpense.findUnique({ where: { id } });
      if (!existing || existing.deletedAt) {
        return {
          status: 404,
          message: 'Registro no encontrado',
          data: null,
        };
      }

      const title = dto.title !== undefined ? dto.title.trim() : existing.title;
      const category = (dto.category !== undefined ? dto.category : existing.category).toUpperCase();
      const currency = (dto.currency !== undefined ? dto.currency : existing.currency).toUpperCase();
      const amount = dto.amount !== undefined ? Number(dto.amount) : Number(existing.amount);

      if (!title || !amount || amount <= 0) {
        return {
          status: 400,
          message: 'Título y monto mayor a cero son requeridos.',
          data: null,
        };
      }

      const rawRate =
        dto.exchangeRate !== undefined
          ? dto.exchangeRate
            ? Number(dto.exchangeRate)
            : null
          : existing.exchangeRate
          ? Number(existing.exchangeRate)
          : null;

      // Recalcular siempre en USDT_PURCHASE si cambia amount/exchangeRate/usdtReceived
      const rawUsdtReceived =
        dto.usdtReceived !== undefined
          ? dto.usdtReceived
            ? Number(dto.usdtReceived)
            : null
          : existing.usdtReceived
          ? Number(existing.usdtReceived)
          : null;

      const rawAmountUsd =
        dto.amountInUSD !== undefined
          ? dto.amountInUSD
            ? Number(dto.amountInUSD)
            : null
          : null;

      const { exchangeRate, amountInUSD, usdtReceived } = this.normalizeExpenseAmounts({
        category,
        currency,
        amount,
        exchangeRate: rawRate,
        amountInUSD: rawAmountUsd,
        usdtReceived: rawUsdtReceived,
      });

      const expenseDate = dto.date !== undefined ? parseAnchoredExpenseDate(dto.date) : existing.date;
      const reference = dto.reference !== undefined ? dto.reference?.trim() || null : existing.reference;
      const notes = dto.notes !== undefined ? dto.notes?.trim() || null : existing.notes;

      const updated = await prisma.adminExpense.update({
        where: { id },
        data: {
          title,
          category,
          amount,
          currency,
          exchangeRate,
          amountInUSD,
          usdtReceived,
          date: expenseDate,
          reference,
          notes,
        },
      });

      return {
        status: 200,
        message: category === 'USDT_PURCHASE' ? 'Compra de USDT actualizada exitosamente' : 'Gasto actualizado exitosamente',
        data: this.formatExpense(updated),
      };
    } catch (error) {
      console.error('AdminCashService.updateExpense error:', error);
      return {
        status: 500,
        message: 'Error al actualizar el registro',
        data: null,
      };
    }
  }

  /**
   * Eliminar un gasto
   */
  async deleteExpense(id: number) {
    try {
      const existing = await prisma.adminExpense.findUnique({
        where: { id },
      });

      if (!existing || existing.deletedAt) {
        return {
          status: 404,
          message: 'Gasto no encontrado',
          data: null,
        };
      }

      await prisma.adminExpense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return {
        status: 200,
        message: 'Gasto eliminado exitosamente',
        data: { id },
      };
    } catch (error) {
      console.error('AdminCashService.deleteExpense error:', error);
      return {
        status: 500,
        message: 'Error al eliminar gasto',
        data: null,
      };
    }
  }

  /**
   * Obtener historial detallado de ingresos (pagos de suscripción aprobados)
   */
  async getIncome(filters: GetCashFilterDto = {}) {
    try {
      const { dateFrom, dateTo } = this.resolveDateRange(filters);

      const paymentWhere: any = {
        status: 'APPROVED',
        businessId: { notIn: [6, 11] },
        OR: [
          { reviewNote: null },
          { NOT: { reviewNote: { contains: '[OCULTO_CONTABILIDAD]' } } },
        ],
        createdAt: {
          gte: dateFrom,
        },
      };

      if (dateTo) {
        paymentWhere.createdAt.lte = dateTo;
      }

      const payments = await prisma.subscriptionPayment.findMany({
        where: paymentWhere,
        orderBy: { createdAt: 'desc' },
        include: {
          business: {
            select: {
              id: true,
              name: true,
              document: true,
              address: true,
              closingNotificationPhone: true,
              members: {
                where: { isActive: true },
                select: {
                  role: { select: { code: true } },
                  user: { select: { id: true, name: true, ci: true } },
                },
              },
            },
          },
          plan: {
            select: {
              id: true,
              name: true,
              priceMonthly: true,
            },
          },
          createdBy: {
            select: {
              id: true,
              name: true,
              ci: true,
            },
          },
          reviewedBy: {
            select: {
              id: true,
              name: true,
            },
          },
          subscription: {
            select: {
              id: true,
              startDate: true,
              endDate: true,
              planType: true,
              status: true,
            },
          },
        },
      });

      const data = (payments as any[]).map((p: any) => {
        const ownerMember = p.business?.members?.find((m: any) => m.role?.code === 'OWNER') || p.business?.members?.[0];
        return {
          id: p.id,
          businessId: p.businessId,
          businessName: p.business?.name || `Negocio #${p.businessId}`,
          businessDocument: p.business?.document || null,
          businessAddress: p.business?.address || null,
          businessPhone: p.business?.closingNotificationPhone || null,
          ownerName: ownerMember?.user?.name || p.createdBy?.name || 'Cliente',
          ownerCi: ownerMember?.user?.ci || p.createdBy?.ci || null,
          planType: p.planType,
          planName: p.plan?.name || String(p.planType),
          monthsPurchased: p.monthsPurchased,
          amount: Number(p.amount),
          currency: p.currency,
          reference: p.reference,
          proofUrl: p.proofUrl,
          status: p.status,
          createdAt: p.createdAt.toISOString(),
          reviewedAt: p.reviewedAt ? p.reviewedAt.toISOString() : null,
          reviewedByName: p.reviewedBy?.name || null,
          subscriptionStartDate: p.subscription?.startDate ? p.subscription.startDate.toISOString() : null,
          subscriptionEndDate: p.subscription?.endDate ? p.subscription.endDate.toISOString() : null,
        };
      });

      return {
        status: 200,
        message: 'Historial de ingresos obtenido exitosamente',
        data,
      };
    } catch (error) {
      console.error('AdminCashService.getIncome error:', error);
      return {
        status: 500,
        message: 'Error al obtener historial de ingresos',
        data: [],
      };
    }
  }
}
