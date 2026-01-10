import apiClient from '../api';

// Types
export type ExpenseCategory =
  | 'rent'
  | 'utilities'
  | 'payroll'
  | 'supplies'
  | 'inventory'
  | 'transport'
  | 'maintenance'
  | 'marketing'
  | 'taxes'
  | 'bank_fees'
  | 'other';

export type PaymentMethod = 'cash' | 'nequi' | 'transfer' | 'card';

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  amount_paid: number;
  is_paid: boolean;
  expense_date: string;
  due_date?: string;
  vendor?: string;
  receipt_number?: string;
  is_recurring: boolean;
  recurring_period?: string;
  notes?: string;
  balance: number;
}

export interface ExpenseCreate {
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  due_date?: string;
  vendor?: string;
  receipt_number?: string;
  is_recurring?: boolean;
  recurring_period?: string;
  notes?: string;
}

export interface ExpensePayment {
  amount: number;
  payment_method: PaymentMethod;
  use_fallback?: boolean;
}

export interface CashBalances {
  caja_menor: { balance: number; name: string } | null;
  caja_mayor: { balance: number; name: string } | null;
  nequi: { balance: number; name: string } | null;
  banco: { balance: number; name: string } | null;
  total_liquid: number;
}

export interface ExpenseCategorySummary {
  category: ExpenseCategory;
  category_label: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  count: number;
  percentage: number;
}

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  rent: 'Arriendo',
  utilities: 'Servicios',
  payroll: 'Nómina',
  supplies: 'Suministros',
  inventory: 'Inventario',
  transport: 'Transporte',
  maintenance: 'Mantenimiento',
  marketing: 'Marketing',
  taxes: 'Impuestos',
  bank_fees: 'Comisiones Bancarias',
  other: 'Otros',
};

const accountingService = {
  // Cash Balances
  async getCashBalances(): Promise<CashBalances> {
    const response = await apiClient.get('/global/accounting/cash-balances');
    return response.data;
  },

  // Expenses
  async listExpenses(params?: {
    category?: ExpenseCategory;
    is_paid?: boolean;
    skip?: number;
    limit?: number;
  }): Promise<Expense[]> {
    const response = await apiClient.get('/global/accounting/expenses', { params });
    return response.data;
  },

  async getPendingExpenses(): Promise<Expense[]> {
    const response = await apiClient.get('/global/accounting/expenses/pending');
    return response.data;
  },

  async getExpensesSummaryByCategory(params?: {
    start_date?: string;
    end_date?: string;
  }): Promise<ExpenseCategorySummary[]> {
    const response = await apiClient.get('/global/accounting/expenses/summary-by-category', { params });
    return response.data;
  },

  async createExpense(data: ExpenseCreate): Promise<Expense> {
    const response = await apiClient.post('/global/accounting/expenses', data);
    return response.data;
  },

  async getExpense(id: string): Promise<Expense> {
    const response = await apiClient.get(`/global/accounting/expenses/${id}`);
    return response.data;
  },

  async updateExpense(id: string, data: Partial<ExpenseCreate>): Promise<Expense> {
    const response = await apiClient.patch(`/global/accounting/expenses/${id}`, data);
    return response.data;
  },

  async payExpense(id: string, payment: ExpensePayment): Promise<Expense> {
    const response = await apiClient.post(`/global/accounting/expenses/${id}/pay`, payment);
    return response.data;
  },

  async checkExpenseBalance(amount: number, payment_method: PaymentMethod): Promise<{
    can_pay: boolean;
    source: string;
    source_balance: number;
    fallback_available: boolean;
    fallback_source: string | null;
    fallback_balance: number | null;
  }> {
    const response = await apiClient.post('/global/accounting/expenses/check-balance', null, {
      params: { amount, payment_method }
    });
    return response.data;
  },
};

export default accountingService;
