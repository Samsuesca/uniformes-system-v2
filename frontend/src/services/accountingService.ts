/**
 * Accounting Service - API calls for accounting, transactions, and expenses
 */
import apiClient from '../utils/api-client';
import type {
  AccountingDashboard,
  TransactionListItem,
  TransactionCreate,
  Transaction,
  ExpenseListItem,
  ExpenseCreate,
  Expense,
  ExpensePayment,
  DailyCashRegister,
  CashFlowSummary,
  ExpensesByCategory,
  TransactionType,
  ExpenseCategory
} from '../types/api';

const BASE_URL = '/schools';

// Dashboard
export async function getAccountingDashboard(schoolId: string): Promise<AccountingDashboard> {
  const response = await apiClient.get<AccountingDashboard>(
    `${BASE_URL}/${schoolId}/accounting/dashboard`
  );
  return response.data;
}

// Cash Flow
export async function getCashFlowSummary(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<CashFlowSummary> {
  const response = await apiClient.get<CashFlowSummary>(
    `${BASE_URL}/${schoolId}/accounting/cash-flow`,
    { params: { start_date: startDate, end_date: endDate } }
  );
  return response.data;
}

// Transactions
export async function getTransactions(
  schoolId: string,
  options?: {
    startDate?: string;
    endDate?: string;
    type?: TransactionType;
    skip?: number;
    limit?: number;
  }
): Promise<TransactionListItem[]> {
  const response = await apiClient.get<TransactionListItem[]>(
    `${BASE_URL}/${schoolId}/accounting/transactions`,
    {
      params: {
        start_date: options?.startDate,
        end_date: options?.endDate,
        transaction_type: options?.type,
        skip: options?.skip || 0,
        limit: options?.limit || 100
      }
    }
  );
  return response.data;
}

export async function getTransaction(schoolId: string, transactionId: string): Promise<Transaction> {
  const response = await apiClient.get<Transaction>(
    `${BASE_URL}/${schoolId}/accounting/transactions/${transactionId}`
  );
  return response.data;
}

export async function createTransaction(schoolId: string, data: Omit<TransactionCreate, 'school_id'>): Promise<Transaction> {
  const response = await apiClient.post<Transaction>(
    `${BASE_URL}/${schoolId}/accounting/transactions`,
    { ...data, school_id: schoolId }
  );
  return response.data;
}

// Expenses
export async function getExpenses(
  schoolId: string,
  options?: {
    category?: ExpenseCategory;
    isPaid?: boolean;
    skip?: number;
    limit?: number;
  }
): Promise<ExpenseListItem[]> {
  const response = await apiClient.get<ExpenseListItem[]>(
    `${BASE_URL}/${schoolId}/accounting/expenses`,
    {
      params: {
        category: options?.category,
        is_paid: options?.isPaid,
        skip: options?.skip || 0,
        limit: options?.limit || 100
      }
    }
  );
  return response.data;
}

export async function getPendingExpenses(schoolId: string): Promise<ExpenseListItem[]> {
  const response = await apiClient.get<ExpenseListItem[]>(
    `${BASE_URL}/${schoolId}/accounting/expenses/pending`
  );
  return response.data;
}

export async function getExpensesByCategory(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<ExpensesByCategory[]> {
  const response = await apiClient.get<ExpensesByCategory[]>(
    `${BASE_URL}/${schoolId}/accounting/expenses/by-category`,
    { params: { start_date: startDate, end_date: endDate } }
  );
  return response.data;
}

export async function getExpense(schoolId: string, expenseId: string): Promise<Expense> {
  const response = await apiClient.get<Expense>(
    `${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}`
  );
  return response.data;
}

export async function createExpense(schoolId: string, data: Omit<ExpenseCreate, 'school_id'>): Promise<Expense> {
  const response = await apiClient.post<Expense>(
    `${BASE_URL}/${schoolId}/accounting/expenses`,
    { ...data, school_id: schoolId }
  );
  return response.data;
}

export async function updateExpense(
  schoolId: string,
  expenseId: string,
  data: Partial<ExpenseCreate>
): Promise<Expense> {
  const response = await apiClient.patch<Expense>(
    `${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}`,
    data
  );
  return response.data;
}

export async function payExpense(
  schoolId: string,
  expenseId: string,
  payment: ExpensePayment
): Promise<Expense> {
  const response = await apiClient.post<Expense>(
    `${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}/pay`,
    payment
  );
  return response.data;
}

export async function deleteExpense(schoolId: string, expenseId: string): Promise<void> {
  await apiClient.delete(`${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}`);
}

// Daily Cash Register
export async function getTodayRegister(schoolId: string): Promise<DailyCashRegister> {
  const response = await apiClient.get<DailyCashRegister>(
    `${BASE_URL}/${schoolId}/accounting/cash-register/today`
  );
  return response.data;
}

export async function getRegisterByDate(schoolId: string, date: string): Promise<DailyCashRegister> {
  const response = await apiClient.get<DailyCashRegister>(
    `${BASE_URL}/${schoolId}/accounting/cash-register/${date}`
  );
  return response.data;
}

export async function openCashRegister(
  schoolId: string,
  registerDate: string,
  openingBalance: number
): Promise<DailyCashRegister> {
  const response = await apiClient.post<DailyCashRegister>(
    `${BASE_URL}/${schoolId}/accounting/cash-register`,
    { school_id: schoolId, register_date: registerDate, opening_balance: openingBalance }
  );
  return response.data;
}

export async function closeCashRegister(
  schoolId: string,
  registerId: string,
  closingBalance: number,
  notes?: string
): Promise<DailyCashRegister> {
  const response = await apiClient.post<DailyCashRegister>(
    `${BASE_URL}/${schoolId}/accounting/cash-register/${registerId}/close`,
    { closing_balance: closingBalance, notes }
  );
  return response.data;
}

// Helper functions
export function getExpenseCategoryLabel(category: ExpenseCategory): string {
  const labels: Record<ExpenseCategory, string> = {
    rent: 'Arriendo',
    utilities: 'Servicios Públicos',
    payroll: 'Nómina',
    supplies: 'Insumos',
    inventory: 'Inventario',
    transport: 'Transporte',
    maintenance: 'Mantenimiento',
    marketing: 'Marketing',
    taxes: 'Impuestos',
    bank_fees: 'Comisiones Bancarias',
    other: 'Otros'
  };
  return labels[category] || category;
}

export function getExpenseCategoryColor(category: ExpenseCategory): string {
  const colors: Record<ExpenseCategory, string> = {
    rent: 'bg-purple-100 text-purple-800',
    utilities: 'bg-blue-100 text-blue-800',
    payroll: 'bg-green-100 text-green-800',
    supplies: 'bg-yellow-100 text-yellow-800',
    inventory: 'bg-orange-100 text-orange-800',
    transport: 'bg-cyan-100 text-cyan-800',
    maintenance: 'bg-red-100 text-red-800',
    marketing: 'bg-pink-100 text-pink-800',
    taxes: 'bg-gray-100 text-gray-800',
    bank_fees: 'bg-indigo-100 text-indigo-800',
    other: 'bg-slate-100 text-slate-800'
  };
  return colors[category] || 'bg-gray-100 text-gray-800';
}

export function getPaymentMethodLabel(method: string): string {
  const labels: Record<string, string> = {
    cash: 'Efectivo',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    credit: 'Crédito',
    other: 'Otro'
  };
  return labels[method] || method;
}

// Export as object for easier imports
export const accountingService = {
  getAccountingDashboard,
  getCashFlowSummary,
  getTransactions,
  getTransaction,
  createTransaction,
  getExpenses,
  getPendingExpenses,
  getExpensesByCategory,
  getExpense,
  createExpense,
  updateExpense,
  payExpense,
  deleteExpense,
  getTodayRegister,
  getRegisterByDate,
  openCashRegister,
  closeCashRegister,
  getExpenseCategoryLabel,
  getExpenseCategoryColor,
  getPaymentMethodLabel
};
