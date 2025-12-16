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
  // Legacy fields
  caja: GlobalCashBalanceInfo | null;
  banco: GlobalCashBalanceInfo | null;
  total_liquid: number;
  // New 4-account structure
  caja_menor?: GlobalCashBalanceInfo | null;
  caja_mayor?: GlobalCashBalanceInfo | null;
  nequi?: GlobalCashBalanceInfo | null;
  total_cash?: number;
}

// Caja Menor / Liquidation types
export interface GlobalCajaMenorSummary {
  caja_menor_balance: number;
  caja_mayor_balance: number;
  today_liquidations: number;
  today_entries_count: number;
  date: string;
}

export interface GlobalLiquidationResult {
  success: boolean;
  message: string;
  caja_menor_balance: number;
  caja_mayor_balance: number;
  amount_liquidated: number;
}

export interface GlobalLiquidationHistoryItem {
  id: string;
  date: string;
  amount: number;
  balance_after: number;
  description: string;
  reference: string;
  created_at: string;
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
// Global Caja Menor / Liquidation (uses first available school for now)
// ============================================

export const getGlobalCajaMenorSummary = async (schoolId: string): Promise<GlobalCajaMenorSummary> => {
  const response = await apiClient.get<GlobalCajaMenorSummary>(`/schools/${schoolId}/accounting/caja-menor/summary`);
  return response.data;
};

export const liquidateGlobalCajaMenor = async (
  schoolId: string,
  amount: number,
  notes?: string
): Promise<GlobalLiquidationResult> => {
  const response = await apiClient.post<GlobalLiquidationResult>(
    `/schools/${schoolId}/accounting/caja-menor/liquidate`,
    null,
    { params: { amount, notes } }
  );
  return response.data;
};

export const getGlobalLiquidationHistory = async (
  schoolId: string,
  options?: { startDate?: string; endDate?: string; limit?: number }
): Promise<GlobalLiquidationHistoryItem[]> => {
  const response = await apiClient.get<GlobalLiquidationHistoryItem[]>(
    `/schools/${schoolId}/accounting/caja-menor/liquidation-history`,
    {
      params: {
        start_date: options?.startDate,
        end_date: options?.endDate,
        limit: options?.limit || 50
      }
    }
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

export interface GlobalBalanceAccountCreate {
  account_type: AccountType;
  name: string;
  description?: string | null;
  code?: string | null;
  balance?: number;
  original_value?: number | null;
  accumulated_depreciation?: number | null;
  useful_life_years?: number | null;
  interest_rate?: number | null;
  due_date?: string | null;
  creditor?: string | null;
}

export interface GlobalBalanceAccountResponse {
  id: string;
  school_id: string | null;
  account_type: AccountType;
  name: string;
  description: string | null;
  code: string | null;
  balance: number;
  original_value: number | null;
  accumulated_depreciation: number | null;
  useful_life_years: number | null;
  interest_rate: number | null;
  due_date: string | null;
  creditor: string | null;
  net_value: number;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface GlobalBalanceAccountUpdate {
  name?: string;
  description?: string | null;
  code?: string | null;
  balance?: number;
  original_value?: number | null;
  accumulated_depreciation?: number | null;
  useful_life_years?: number | null;
  interest_rate?: number | null;
  due_date?: string | null;
  creditor?: string | null;
  is_active?: boolean;
}

export const createGlobalBalanceAccount = async (
  data: GlobalBalanceAccountCreate
): Promise<GlobalBalanceAccountResponse> => {
  const response = await apiClient.post<GlobalBalanceAccountResponse>(
    `${BASE_URL}/balance-accounts`,
    data
  );
  return response.data;
};

export const updateGlobalBalanceAccount = async (
  accountId: string,
  data: GlobalBalanceAccountUpdate
): Promise<GlobalBalanceAccountResponse> => {
  const response = await apiClient.patch<GlobalBalanceAccountResponse>(
    `${BASE_URL}/balance-accounts/${accountId}`,
    data
  );
  return response.data;
};

export const deleteGlobalBalanceAccount = async (accountId: string): Promise<void> => {
  await apiClient.delete(`${BASE_URL}/balance-accounts/${accountId}`);
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
// Global Accounts Receivable (Cuentas por Cobrar)
// ============================================

export interface AccountsReceivableCreate {
  amount: number;
  description: string;
  invoice_date: string;
  due_date?: string | null;
  notes?: string | null;
  client_id?: string | null;
  sale_id?: string | null;
  order_id?: string | null;
}

export interface AccountsReceivable {
  id: string;
  school_id: string | null;
  client_id: string | null;
  sale_id: string | null;
  order_id: string | null;
  amount: number;
  amount_paid: number;
  balance: number;
  description: string;
  invoice_date: string;
  due_date: string | null;
  is_paid: boolean;
  is_overdue: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountsReceivableListItem {
  id: string;
  client_id: string | null;
  client_name: string | null;
  amount: number;
  amount_paid: number;
  balance: number;
  description: string;
  invoice_date: string;
  due_date: string | null;
  is_paid: boolean;
  is_overdue: boolean;
}

export interface AccountsReceivablePayment {
  amount: number;
  payment_method: 'cash' | 'transfer' | 'card';
  notes?: string | null;
}

export const getGlobalReceivables = async (
  options?: { isPaid?: boolean; isOverdue?: boolean; skip?: number; limit?: number }
): Promise<AccountsReceivableListItem[]> => {
  const response = await apiClient.get<AccountsReceivableListItem[]>(
    `${BASE_URL}/receivables`,
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

export const getPendingGlobalReceivables = async (): Promise<AccountsReceivableListItem[]> => {
  const response = await apiClient.get<AccountsReceivableListItem[]>(`${BASE_URL}/receivables/pending`);
  return response.data;
};

export const getGlobalReceivable = async (receivableId: string): Promise<AccountsReceivable> => {
  const response = await apiClient.get<AccountsReceivable>(`${BASE_URL}/receivables/${receivableId}`);
  return response.data;
};

export const createGlobalReceivable = async (data: AccountsReceivableCreate): Promise<AccountsReceivable> => {
  const response = await apiClient.post<AccountsReceivable>(`${BASE_URL}/receivables`, data);
  return response.data;
};

export const payGlobalReceivable = async (
  receivableId: string,
  payment: AccountsReceivablePayment
): Promise<AccountsReceivable> => {
  const response = await apiClient.post<AccountsReceivable>(`${BASE_URL}/receivables/${receivableId}/pay`, payment);
  return response.data;
};

// ============================================
// Global Patrimony Summary
// ============================================

export interface GlobalPatrimonySummary {
  assets: {
    caja: number;  // caja_menor + caja_mayor
    caja_menor: number;
    caja_mayor: number;
    nequi: number;
    banco: number;
    total_liquid: number;
    inventory: number;
    receivables: number;
    current_assets: number;
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
  // Caja Menor / Liquidation
  getGlobalCajaMenorSummary,
  liquidateGlobalCajaMenor,
  getGlobalLiquidationHistory,
  // Balance Accounts
  getGlobalBalanceAccounts,
  getGlobalBalanceAccount,
  getGlobalBalanceEntries,
  createGlobalBalanceAccount,
  updateGlobalBalanceAccount,
  deleteGlobalBalanceAccount,
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
  // Receivables
  getGlobalReceivables,
  getPendingGlobalReceivables,
  getGlobalReceivable,
  createGlobalReceivable,
  payGlobalReceivable,
  // Patrimony
  getGlobalPatrimonySummary
};

export default globalAccountingService;
