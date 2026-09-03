import { prisma } from '@/configs';
import { CreateExpenseInterface, UpdateExpenseInterface, QueryExpenseInterface } from './interfaces';
import { resolveBusinessExchangeRate } from '@/utils/resolve-exchange-rate';
import { Currency } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/client';

export class ExpenseService {

  async create(businessId: number, memberId: number, data: CreateExpenseInterface) {
    try {
      const category = await prisma.expenseCategory.findFirst({
        where: { id: data.categoryId, businessId, isActive: true },
      });

      if (!category) {
        return {
          status: 404,
          message: 'Categoría de gasto no encontrada o inactiva',
          data: null,
        };
      }

      const activeExchangeRate = await resolveBusinessExchangeRate(businessId, prisma);
      if (!activeExchangeRate) {
        return {
          status: 400,
          message: 'No se encontró una tasa de cambio activa para el negocio',
          data: null,
        };
      }

      const currency: Currency = data.currency || Currency.USD;
      const amountDecimal = new Decimal(data.amount);
      const rateDecimal = new Decimal(activeExchangeRate.rate);

      let amountInUSD: Decimal;
      if (currency === Currency.VES) {
        amountInUSD = amountDecimal.div(rateDecimal);
      } else {
        amountInUSD = amountDecimal;
      }

      const expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date();

      const expense = await prisma.expense.create({
        data: {
          businessId,
          categoryId: data.categoryId,
          memberId,
          exchangeRateId: activeExchangeRate.id,
          title: data.title.trim(),
          description: data.description?.trim() || null,
          amount: amountDecimal,
          currency,
          amountInUSD,
          expenseDate,
          beneficiary: data.beneficiary?.trim() || null,
          reference: data.reference?.trim() || null,
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
          member: { select: { id: true, user: { select: { id: true, name: true } } } },
          exchangeRate: { select: { id: true, rate: true } },
        },
      });

      return {
        status: 201,
        message: 'Gasto registrado exitosamente',
        data: expense,
      };
    } catch (error) {
      console.error('Error in ExpenseService.create:', error);
      return {
        status: 500,
        message: 'Error interno al registrar el gasto',
        data: null,
      };
    }
  }

  async findAll(businessId: number, query: QueryExpenseInterface) {
    try {
      const page = Math.max(1, Number(query.page) || 1);
      const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
      const skip = (page - 1) * limit;

      const whereClause: any = {
        businessId,
        deletedAt: null,
      };

      if (query.categoryId) {
        whereClause.categoryId = Number(query.categoryId);
      }

      if (query.currency) {
        whereClause.currency = query.currency;
      }

      if (query.fromDate || query.toDate) {
        whereClause.expenseDate = {};
        if (query.fromDate) {
          const from = new Date(query.fromDate);
          from.setHours(0, 0, 0, 0);
          whereClause.expenseDate.gte = from;
        }
        if (query.toDate) {
          const to = new Date(query.toDate);
          to.setHours(23, 59, 59, 999);
          whereClause.expenseDate.lte = to;
        }
      }

      if (query.search && query.search.trim()) {
        const searchTerm = query.search.trim();
        whereClause.OR = [
          { title: { contains: searchTerm, mode: 'insensitive' } },
          { beneficiary: { contains: searchTerm, mode: 'insensitive' } },
          { reference: { contains: searchTerm, mode: 'insensitive' } },
        ];
      }

      const [totalRecords, expenses] = await Promise.all([
        prisma.expense.count({ where: whereClause }),
        prisma.expense.findMany({
          where: whereClause,
          include: {
            category: { select: { id: true, name: true, color: true } },
            member: { select: { id: true, user: { select: { id: true, name: true } } } },
            exchangeRate: { select: { id: true, rate: true } },
          },
          orderBy: { expenseDate: 'desc' },
          skip,
          take: limit,
        }),
      ]);

      const totalPages = Math.ceil(totalRecords / limit);

      return {
        status: 200,
        message: 'Gastos obtenidos exitosamente',
        data: {
          expenses,
          pagination: {
            totalRecords,
            totalPages,
            currentPage: page,
            limit,
          },
        },
      };
    } catch (error) {
      console.error('Error in ExpenseService.findAll:', error);
      return {
        status: 500,
        message: 'Error interno al listar los gastos',
        data: null,
      };
    }
  }

  async findOne(businessId: number, id: number) {
    try {
      const expense = await prisma.expense.findFirst({
        where: { id, businessId, deletedAt: null },
        include: {
          category: { select: { id: true, name: true, color: true } },
          member: { select: { id: true, user: { select: { id: true, name: true } } } },
          exchangeRate: { select: { id: true, rate: true } },
        },
      });

      if (!expense) {
        return {
          status: 404,
          message: 'Gasto no encontrado',
          data: null,
        };
      }

      return {
        status: 200,
        message: 'Gasto obtenido',
        data: expense,
      };
    } catch (error) {
      console.error('Error in ExpenseService.findOne:', error);
      return {
        status: 500,
        message: 'Error interno al obtener el gasto',
        data: null,
      };
    }
  }

  async update(businessId: number, id: number, data: UpdateExpenseInterface) {
    try {
      const existing = await prisma.expense.findFirst({
        where: { id, businessId, deletedAt: null },
        include: { exchangeRate: true },
      });

      if (!existing) {
        return {
          status: 404,
          message: 'Gasto no encontrado',
          data: null,
        };
      }

      if (data.categoryId && data.categoryId !== existing.categoryId) {
        const cat = await prisma.expenseCategory.findFirst({
          where: { id: data.categoryId, businessId, isActive: true },
        });
        if (!cat) {
          return {
            status: 400,
            message: 'La categoría seleccionada no existe o está inactiva',
            data: null,
          };
        }
      }

      const newCurrency = data.currency || existing.currency;
      const newAmount = data.amount !== undefined ? new Decimal(data.amount) : existing.amount;
      const rate = new Decimal(existing.exchangeRate.rate);

      let newAmountInUSD = existing.amountInUSD;
      if (data.amount !== undefined || data.currency !== undefined) {
        if (newCurrency === Currency.VES) {
          newAmountInUSD = newAmount.div(rate);
        } else {
          newAmountInUSD = newAmount;
        }
      }

      const updated = await prisma.expense.update({
        where: { id },
        data: {
          categoryId: data.categoryId !== undefined ? data.categoryId : undefined,
          title: data.title !== undefined ? data.title.trim() : undefined,
          description: data.description !== undefined ? data.description.trim() || null : undefined,
          amount: newAmount,
          currency: newCurrency,
          amountInUSD: newAmountInUSD,
          expenseDate: data.expenseDate ? new Date(data.expenseDate) : undefined,
          beneficiary: data.beneficiary !== undefined ? data.beneficiary.trim() || null : undefined,
          reference: data.reference !== undefined ? data.reference.trim() || null : undefined,
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
          member: { select: { id: true, user: { select: { id: true, name: true } } } },
          exchangeRate: { select: { id: true, rate: true } },
        },
      });

      return {
        status: 200,
        message: 'Gasto actualizado exitosamente',
        data: updated,
      };
    } catch (error) {
      console.error('Error in ExpenseService.update:', error);
      return {
        status: 500,
        message: 'Error interno al actualizar el gasto',
        data: null,
      };
    }
  }

  async remove(businessId: number, id: number) {
    try {
      const existing = await prisma.expense.findFirst({
        where: { id, businessId, deletedAt: null },
      });

      if (!existing) {
        return {
          status: 404,
          message: 'Gasto no encontrado',
          data: null,
        };
      }

      await prisma.expense.update({
        where: { id },
        data: { deletedAt: new Date() },
      });

      return {
        status: 200,
        message: 'Gasto eliminado exitosamente',
        data: null,
      };
    } catch (error) {
      console.error('Error in ExpenseService.remove:', error);
      return {
        status: 500,
        message: 'Error interno al eliminar el gasto',
        data: null,
      };
    }
  }

  async getSummary(businessId: number, fromDate?: string, toDate?: string) {
    try {
      const now = new Date();

      // Fechas para el mes actual por defecto
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const queryStart = fromDate ? new Date(fromDate) : startOfMonth;
      const queryEnd = toDate ? new Date(toDate) : endOfMonth;

      // Obtener todos los gastos no eliminados del rango
      const expenses = await prisma.expense.findMany({
        where: {
          businessId,
          deletedAt: null,
          expenseDate: { gte: queryStart, lte: queryEnd },
        },
        include: {
          category: { select: { id: true, name: true, color: true } },
          exchangeRate: { select: { rate: true } },
        },
      });

      // Gastos de hoy
      const todayExpenses = await prisma.expense.findMany({
        where: {
          businessId,
          deletedAt: null,
          expenseDate: { gte: startOfToday, lte: endOfToday },
        },
      });

      let totalUSD = 0;
      let totalVES = 0;
      let totalInUSD = 0;

      const categoryMap = new Map<number, { name: string; color: string; totalUSD: number; count: number }>();

      for (const exp of expenses) {
        const usdValue = Number(exp.amountInUSD);
        totalInUSD += usdValue;

        if (exp.currency === Currency.USD) {
          totalUSD += Number(exp.amount);
        } else if (exp.currency === Currency.VES) {
          totalVES += Number(exp.amount);
        }

        const catId = exp.categoryId;
        const currentCat = categoryMap.get(catId) || {
          name: exp.category.name,
          color: exp.category.color || '#6B7280',
          totalUSD: 0,
          count: 0,
        };
        currentCat.totalUSD += usdValue;
        currentCat.count += 1;
        categoryMap.set(catId, currentCat);
      }

      let todayTotalInUSD = 0;
      for (const t of todayExpenses) {
        todayTotalInUSD += Number(t.amountInUSD);
      }

      // Convertir categorías a array y ordenar de mayor a menor gasto
      const categoriesBreakdown = Array.from(categoryMap.values()).sort(
        (a, b) => b.totalUSD - a.totalUSD
      );

      const topCategory = categoriesBreakdown.length > 0 ? categoriesBreakdown[0] : null;

      return {
        status: 200,
        message: 'Resumen de gastos obtenido',
        data: {
          totalInUSD,
          totalUSD,
          totalVES,
          todayTotalInUSD,
          todayExpensesCount: todayExpenses.length,
          totalExpensesCount: expenses.length,
          topCategory,
          categoriesBreakdown,
        },
      };
    } catch (error) {
      console.error('Error in ExpenseService.getSummary:', error);
      return {
        status: 500,
        message: 'Error interno al obtener el resumen de gastos',
        data: null,
      };
    }
  }

  async getReport(
    businessId: number,
    query: { fromDate?: string; toDate?: string; categoryId?: number; currency?: Currency }
  ) {
    try {
      const now = new Date();
      const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const defaultEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      const queryStart = query.fromDate ? new Date(query.fromDate) : defaultStart;
      queryStart.setHours(0, 0, 0, 0);

      const queryEnd = query.toDate ? new Date(query.toDate) : defaultEnd;
      queryEnd.setHours(23, 59, 59, 999);

      const whereClause: any = {
        businessId,
        deletedAt: null,
        expenseDate: { gte: queryStart, lte: queryEnd },
      };

      if (query.categoryId) {
        whereClause.categoryId = Number(query.categoryId);
      }

      if (query.currency) {
        whereClause.currency = query.currency;
      }

      const expenses = await prisma.expense.findMany({
        where: whereClause,
        include: {
          category: { select: { id: true, name: true, color: true } },
          member: { select: { id: true, user: { select: { id: true, name: true } } } },
          exchangeRate: { select: { id: true, rate: true } },
        },
        orderBy: { expenseDate: 'desc' },
      });

      let totalUSD = 0;
      let totalVES = 0;
      let totalInUSD = 0;

      const categoryMap = new Map<number, { id: number; name: string; color: string; totalInUSD: number; totalUSD: number; totalVES: number; count: number }>();
      const dailyMap = new Map<string, { date: string; totalInUSD: number; count: number }>();

      for (const exp of expenses) {
        const usdVal = Number(exp.amountInUSD);
        totalInUSD += usdVal;

        if (exp.currency === Currency.USD) {
          totalUSD += Number(exp.amount);
        } else if (exp.currency === Currency.VES) {
          totalVES += Number(exp.amount);
        }

        const catId = exp.categoryId;
        const currentCat = categoryMap.get(catId) || {
          id: catId,
          name: exp.category.name,
          color: exp.category.color || '#6B7280',
          totalInUSD: 0,
          totalUSD: 0,
          totalVES: 0,
          count: 0,
        };
        currentCat.totalInUSD += usdVal;
        if (exp.currency === Currency.USD) currentCat.totalUSD += Number(exp.amount);
        if (exp.currency === Currency.VES) currentCat.totalVES += Number(exp.amount);
        currentCat.count += 1;
        categoryMap.set(catId, currentCat);

        const dayKey = exp.expenseDate.toISOString().split('T')[0];
        const currentDay = dailyMap.get(dayKey) || { date: dayKey, totalInUSD: 0, count: 0 };
        currentDay.totalInUSD += usdVal;
        currentDay.count += 1;
        dailyMap.set(dayKey, currentDay);
      }

      const diffTime = Math.abs(queryEnd.getTime() - queryStart.getTime());
      const daysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      const dailyAverage = totalInUSD / daysInPeriod;

      const categoriesBreakdown = Array.from(categoryMap.values())
        .map((cat) => ({
          ...cat,
          percentage: totalInUSD > 0 ? (cat.totalInUSD / totalInUSD) * 100 : 0,
        }))
        .sort((a, b) => b.totalInUSD - a.totalInUSD);

      const topCategory = categoriesBreakdown.length > 0 ? categoriesBreakdown[0] : null;

      const dailyTrend = Array.from(dailyMap.values()).sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      return {
        status: 200,
        message: 'Reporte de gastos generado exitosamente',
        data: {
          period: {
            fromDate: queryStart.toISOString().split('T')[0],
            toDate: queryEnd.toISOString().split('T')[0],
            daysInPeriod,
          },
          periodTotals: {
            totalInUSD,
            totalUSD,
            totalVES,
            dailyAverage,
            totalCount: expenses.length,
          },
          topCategory,
          categoriesBreakdown,
          dailyTrend,
          expenses,
        },
      };
    } catch (error) {
      console.error('Error in ExpenseService.getReport:', error);
      return {
        status: 500,
        message: 'Error interno al generar el reporte de gastos',
        data: null,
      };
    }
  }
}
