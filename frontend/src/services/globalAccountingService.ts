/**
 * Global Accounting Service - API calls for global (business-wide) accounting
 *
 * These endpoints operate on global accounts (school_id = NULL) for:
 * - Cash (Caja) and Bank (Banco) balances
 * - Business expenses
 * - Accounts payable (suppliers)
 * - Balance general
 */
import apiClient from '../utils/api-client';
import type {
  ExpenseListItem,
  ExpenseCreate,
  Expense,
  ExpensePayment,
  BalanceAccountListItem,
  BalanceAccount,
  AccountsPayableCreate,
  AccountsPayable,
  AccountsPayablePayment,
  AccountsPayableListItem,
  AccountType,
  ExpenseCategory
} from '../types/api';

const BASE_URL = '/global/accounting';

// ============================================
// Global Cash Balances (Caja y Banco)
// ============================================

export interface GlobalCashBalanceInfo {
  id: string;
  name: string;
  balance: number;
  last_updated: string | null;
}

export interface GlobalCashBalancesResponse {
  caja: GlobalCashBalanceInfo | null;
  banco: GlobalCashBalanceInfo | null;
  total_liquid: number;
}

export const getGlobalCashBalances = async (): Promise<GlobalCashBalancesResponse> => {
  const response = await apiClient.get<GlobalCashBalancesResponse>(`${BASE_URL}/cash-balances`);
  return response.data;
};

export const initializeGlobalAccounts = async (
  cajaInitialBalance: number = 0,
  bancoInitialBalance: number = 0
): Promise<{ message: string; accounts: Record<string, string> }> => {
  const response = await apiClient.post<{ message: string; accounts: Record<string, string> }>(
    `${BASE_URL}/initialize-accounts`,
    null,
    { params: { caja_initial_balance: cajaInitialBalance, banco_initial_balance: bancoInitialBalance } }
  );
  return response.data;
};

export const setGlobalAccountBalance = async (
  accountCode: string,
  newBalance: number,
  description?: string
): Promise<{
  message: string;
  account_id: string;
  account_name: string;
  old_balance: number;
  new_balance: number;
  adjustment: number;
}> => {
  const response = await apiClient.post<{
    message: string;
    account_id: string;
    account_name: string;
    old_balance: number;
    new_balance: number;
    adjustment: number;
  }>(
    `${BASE_URL}/set-balance`,
    null,
    { params: { account_code: accountCode, new_balance: newBalance, description: description || 'Ajuste de balance inicial' } }
  );
  return response.data;
};

// ============================================
// Global Balance Accounts
// ============================================

export const getGlobalBalanceAccounts = async (
  accountType?: AccountType,
  isActive?: boolean
): Promise<BalanceAccountListItem[]> => {
  const response = await apiClient.get<BalanceAccountListItem[]>(
    `${BASE_URL}/balance-accounts`,
    { params: { account_type: accountType, is_active: isActive } }
  );
  return response.data;
};

export const getGlobalBalanceAccount = async (accountId: string): Promise<BalanceAccount> => {
  const response = await apiClient.get<BalanceAccount>(
    `${BASE_URL}/balance-accounts/${accountId}`
  );
  return response.data;
};

export interface GlobalBalanceEntry {
  id: string;
  entry_date: string;
  amount: number;
  balance_after: number;
  description: string;
  reference: string | null;
  created_at: string;
}

export const getGlobalBalanceEntries = async (
  accountId: string,
  limit: number = 50
): Promise<GlobalBalanceEntry[]> => {
  const response = await apiClient.get<GlobalBalanceEntry[]>(
    `${BASE_URL}/balance-accounts/${accountId}/entries`,
    { params: { limit } }
  );
  return response.data;
};

// ============================================
// Global Balance General Summary
// ============================================

export interface GlobalBalanceGeneralSummary {
  assets: {
    current: number;
    fixed: number;
    other: number;
    total: number;
  };
  liabilities: {
    current: number;
    long_term: number;
    other: number;
    total: number;
  };
  equity: {
    capital: number;
    retained: number;
    other: number;
    total: number;
  };
  net_worth: number;
  balanced: boolean;
}

export const getGlobalBalanceGeneralSummary = async (): Promise<GlobalBalanceGeneralSummary> => {
  const response = await apiClient.get<GlobalBalanceGeneralSummary>(`${BASE_URL}/balance-general/summary`);
  return response.data;
};

export interface GlobalAccountDetail {
  id: string;
  code: string;
  name: string;
  balance: number;
  net_value: number;
}

export interface GlobalBalanceGeneralDetailed {
  accounts_by_type: Record<string, GlobalAccountDetail[]>;
  summary: {
    total_assets: number;
    total_liabilities: number;
    total_equity: number;
    net_worth: number;
  };
}

export const getGlobalBalanceGeneralDetailed = async (): Promise<GlobalBalanceGeneralDetailed> => {
  const response = await apiClient.get<GlobalBalanceGeneralDetailed>(`${BASE_URL}/balance-general/detailed`);
  return response.data;
};

// ============================================
// Global Expenses (Gastos del Negocio)
// ============================================

export const getGlobalExpenses = async (
  options?: {
    category?: ExpenseCategory;
    isPaid?: boolean;
    skip?: number;
    limit?: number;
  }
): Promise<ExpenseListItem[]> => {
  const response = await apiClient.get<ExpenseListItem[]>(
    `${BASE_URL}/expenses`,
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
};

export const getPendingGlobalExpenses = async (): Promise<ExpenseListItem[]> => {
  const response = await apiClient.get<ExpenseListItem[]>(`${BASE_URL}/expenses/pending`);
  return response.data;
};

export const getGlobalExpense = async (expenseId: string): Promise<Expense> => {
  const response = await apiClient.get<Expense>(`${BASE_URL}/expenses/${expenseId}`);
  return response.data;
};

export const createGlobalExpense = async (data: Omit<ExpenseCreate, 'school_id'>): Promise<Expense> => {
  const response = await apiClient.post<Expense>(`${BASE_URL}/expenses`, data);
  return response.data;
};

export const updateGlobalExpense = async (
  expenseId: string,
  data: Partial<ExpenseCreate>
): Promise<Expense> => {
  const response = await apiClient.patch<Expense>(`${BASE_URL}/expenses/${expenseId}`, data);
  return response.data;
};

export const payGlobalExpense = async (
  expenseId: string,
  payment: ExpensePayment
): Promise<Expense> => {
  const response = await apiClient.post<Expense>(`${BASE_URL}/expenses/${expenseId}/pay`, payment);
  return response.data;
};

// ============================================
// Global Accounts Payable (Cuentas por Pagar)
// ============================================

export const getGlobalPayables = async (
  options?: { isPaid?: boolean; isOverdue?: boolean; skip?: number; limit?: number }
): Promise<AccountsPayableListItem[]> => {
  const response = await apiClient.get<AccountsPayableListItem[]>(
    `${BASE_URL}/payables`,
    {
      params: {
        is_paid: options?.isPaid,
        is_overdue: options?.isOverdue,
        skip: options?.skip || 0,
        limit: options?.limit || 100
      }
    }
  );
  return response.data;
};

export const getPendingGlobalPayables = async (): Promise<AccountsPayableListItem[]> => {
  const response = await apiClient.get<AccountsPayableListItem[]>(`${BASE_URL}/payables/pending`);
  return response.data;
};

export const getGlobalPayable = async (payableId: string): Promise<AccountsPayable> => {
  const response = await apiClient.get<AccountsPayable>(`${BASE_URL}/payables/${payableId}`);
  return response.data;
};

export const createGlobalPayable = async (data: Omit<AccountsPayableCreate, 'school_id'>): Promise<AccountsPayable> => {
  const response = await apiClient.post<AccountsPayable>(`${BASE_URL}/payables`, data);
  return response.data;
};

export const payGlobalPayable = async (
  payableId: string,
  payment: AccountsPayablePayment
): Promise<AccountsPayable> => {
  const response = await apiClient.post<AccountsPayable>(`${BASE_URL}/payables/${payableId}/pay`, payment);
  return response.data;
};

// ============================================
// Global Patrimony Summary
// ============================================

export interface GlobalPatrimonySummary {
  assets: {
    caja: number;
    banco: number;
    total_liquid: number;
    fixed_assets: number;
    other_assets: number;
    total: number;
  };
  liabilities: {
    pending_payables: number;
    pending_expenses: number;
    current: number;
    long_term: number;
    total: number;
  };
  net_patrimony: number;
}

export const getGlobalPatrimonySummary = async (): Promise<GlobalPatrimonySummary> => {
  const response = await apiClient.get<GlobalPatrimonySummary>(`${BASE_URL}/patrimony/summary`);
  return response.data;
};

// ============================================
// Export as object for easier imports
// ============================================

export const globalAccountingService = {
  // Cash Balances
  getGlobalCashBalances,
  initializeGlobalAccounts,
  setGlobalAccountBalance,
  // Balance Accounts
  getGlobalBalanceAccounts,
  getGlobalBalanceAccount,
  getGlobalBalanceEntries,
  // Balance General
  getGlobalBalanceGeneralSummary,
  getGlobalBalanceGeneralDetailed,
  // Expenses
  getGlobalExpenses,
  getPendingGlobalExpenses,
  getGlobalExpense,
  createGlobalExpense,
  updateGlobalExpense,
  payGlobalExpense,
  // Payables
  getGlobalPayables,
  getPendingGlobalPayables,
  getGlobalPayable,
  createGlobalPayable,
  payGlobalPayable,
  // Patrimony
  getGlobalPatrimonySummary
};

export default globalAccountingService;
