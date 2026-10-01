import { Currency } from '@prisma/client';

export interface CreateExpenseInterface {
  categoryId: number;
  title: string;
  description?: string;
  amount: number;
  currency?: Currency;
  expenseDate?: string | Date;
  beneficiary?: string;
  reference?: string;
}

export interface UpdateExpenseInterface {
  categoryId?: number;
  title?: string;
  description?: string;
  amount?: number;
  currency?: Currency;
  expenseDate?: string | Date;
  beneficiary?: string;
  reference?: string;
}

export interface QueryExpenseInterface {
  fromDate?: string;
  toDate?: string;
  categoryId?: number;
  currency?: Currency;
  search?: string;
  page?: number;
  limit?: number;
}
