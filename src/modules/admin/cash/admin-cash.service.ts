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

export class AdminCashService {
  /**
   * Obtiene el balance en vivo de la caja del SaaS:
   * Ingresos por suscripciones aprobadas - Gastos + Compras de USDT
   * Con soporte de rango de fechas personalizado y resumen general a partir de hoy.
   */
  async getBalance(filters: GetCashFilterDto = {}) {
    try {
      // 1. Obtener última tasa de cambio activa
      const latestRateRecord = await prisma.exchangeRate.findFirst({
        where: { isActive: true },
        orderBy: { createdAt: 'desc' },
      });
      const activeExchangeRate = latestRateRecord ? Number(latestRateRecord.rate) : 55.0;

      // 2. Determinar rango de fechas
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

      // 3. Consultar Ingresos de suscripciones aprobadas en el rango
      const paymentWhere: any = {
        status: 'APPROVED',
        businessId: { notIn: [6, 11] }, // Excluir negocios de prueba / dueño
        createdAt: {
          gte: dateFrom,
        },
      };

      if (dateTo) {
        paymentWhere.createdAt.lte = dateTo;
      }

      const approvedPayments = await prisma.subscriptionPayment.findMany({
        where: paymentWhere,
        select: {
          id: true,
          amount: true,
          currency: true,
          createdAt: true,
        },
      });

      let totalIncomeUsd = 0;
      let totalIncomeVes = 0;

      for (const p of approvedPayments) {
        const amt = Number(p.amount) || 0;
        const cur = (p.currency as string).toUpperCase();
        if (cur === 'VES') {
          totalIncomeVes += amt;
        } else {
          totalIncomeUsd += amt; // USD / USDT
        }
      }

      // 4. Consultar Gastos del Administrador en el rango
      const expenseWhere: any = {
        deletedAt: null,
        date: {
          gte: dateFrom,
        },
      };

      if (dateTo) {
        expenseWhere.date.lte = dateTo;
      }

      const allExpenses = await prisma.adminExpense.findMany({
        where: expenseWhere,
        orderBy: { date: 'desc' },
      });

      let totalExpensesUsd = 0;
      let totalExpensesVes = 0;
      let totalUsdtPurchased = 0;
      let totalVesSpentOnUsdt = 0;

      for (const exp of allExpenses) {
        const amt = Number(exp.amount) || 0;
        const cur = (exp.currency || 'USDT').toUpperCase();
        const cat = (exp.category || '').toUpperCase();

        if (cat === 'USDT_PURCHASE') {
          // Es una compra de USDT
          const usdtRec = Number(exp.usdtReceived) || 0;
          totalUsdtPurchased += usdtRec;
          if (cur === 'VES') {
            totalVesSpentOnUsdt += amt;
          } else {
            totalExpensesUsd += amt;
          }
        } else {
          // Gasto regular
          if (cur === 'VES') {
            totalExpensesVes += amt;
          } else {
            totalExpensesUsd += amt; // USD / USDT
          }
        }
      }

      // 5. Balances Disponibles en Cuenta para el período seleccionado
      // Cuenta USDT = Ingresos USD/USDT - Gastos USD/USDT + USDT comprados
      const balanceUsdt = Number((totalIncomeUsd - totalExpensesUsd + totalUsdtPurchased).toFixed(2));
      // Cuenta Bolívares = Ingresos VES - Gastos VES - Bolívares gastados en comprar USDT
      const balanceVes = Number((totalIncomeVes - totalExpensesVes - totalVesSpentOnUsdt).toFixed(2));

      // Balance consolidado en USD equivalente
      const vesInUsd = activeExchangeRate > 0 ? balanceVes / activeExchangeRate : 0;
      const totalEquivalentUsd = Number((balanceUsdt + vesInUsd).toFixed(2));

      return {
        status: 200,
        message: 'Balance de caja del SaaS obtenido exitosamente',
        data: {
          period: {
            startDate: dateFrom.toISOString().split('T')[0],
            endDate: dateTo ? dateTo.toISOString().split('T')[0] : null,
            isAllTime: !filters.startDate && !filters.endDate && !filters.month,
            inceptionDate: SAAS_CASH_INCEPTION_DATE.toISOString().split('T')[0],
          },
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

      // Rango de fechas (a partir de la fecha de inicio oficial)
      let dateFrom = SAAS_CASH_INCEPTION_DATE;
      let dateTo: Date | null = null;

      if (query.startDate) {
        const parsedStart = new Date(`${query.startDate}T00:00:00.000Z`);
        if (!isNaN(parsedStart.getTime())) {
          dateFrom = parsedStart > SAAS_CASH_INCEPTION_DATE ? parsedStart : SAAS_CASH_INCEPTION_DATE;
        }
      } else if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
        const [y, m] = query.month.split('-').map(Number);
        const startOfMonth = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
        dateFrom = startOfMonth > SAAS_CASH_INCEPTION_DATE ? startOfMonth : SAAS_CASH_INCEPTION_DATE;
        dateTo = new Date(Date.UTC(m === 12 ? y + 1 : y, m === 12 ? 0 : m, 1, 0, 0, 0, 0) - 1);
      }

      if (query.endDate) {
        const parsedEnd = new Date(`${query.endDate}T23:59:59.999Z`);
        if (!isNaN(parsedEnd.getTime())) {
          dateTo = parsedEnd;
        }
      }

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
        orderBy: { date: 'desc' },
      });

      const formatted = expenses.map((e) => ({
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
      }));

      return {
        status: 200,
        message: 'Gastos administrativos obtenidos exitosamente',
        data: formatted,
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
      const exchangeRate = dto.exchangeRate ? Number(dto.exchangeRate) : null;

      let amountInUSD = dto.amountInUSD ? Number(dto.amountInUSD) : null;
      let usdtReceived = dto.usdtReceived ? Number(dto.usdtReceived) : null;

      // Si es compra de USDT
      if (category === 'USDT_PURCHASE') {
        if (currency === 'VES') {
          if (!usdtReceived && exchangeRate && exchangeRate > 0) {
            usdtReceived = Number((amount / exchangeRate).toFixed(2));
          }
          amountInUSD = usdtReceived;
        } else {
          // Compró USDT directamente
          usdtReceived = usdtReceived || amount;
          amountInUSD = usdtReceived;
        }
      } else {
        // Gasto regular
        if (currency === 'VES') {
          if (!amountInUSD && exchangeRate && exchangeRate > 0) {
            amountInUSD = Number((amount / exchangeRate).toFixed(2));
          }
        } else {
          amountInUSD = amount;
        }
      }

      const expenseDate = dto.date ? new Date(dto.date) : new Date();

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
        data: {
          id: created.id,
          title: created.title,
          category: created.category,
          amount: Number(created.amount),
          currency: created.currency,
          exchangeRate: created.exchangeRate ? Number(created.exchangeRate) : null,
          amountInUSD: created.amountInUSD ? Number(created.amountInUSD) : null,
          usdtReceived: created.usdtReceived ? Number(created.usdtReceived) : null,
          date: created.date.toISOString(),
          reference: created.reference,
        },
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
}
