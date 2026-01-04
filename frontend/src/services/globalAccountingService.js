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
const BASE_URL = '/global/accounting';
export const getGlobalCashBalances = async () => {
    const response = await apiClient.get(`${BASE_URL}/cash-balances`);
    return response.data;
};
export const initializeGlobalAccounts = async (cajaInitialBalance = 0, bancoInitialBalance = 0) => {
    const response = await apiClient.post(`${BASE_URL}/initialize-accounts`, null, { params: { caja_initial_balance: cajaInitialBalance, banco_initial_balance: bancoInitialBalance } });
    return response.data;
};
export const setGlobalAccountBalance = async (accountCode, newBalance, description) => {
    const response = await apiClient.post(`${BASE_URL}/set-balance`, null, { params: { account_code: accountCode, new_balance: newBalance, description: description || 'Ajuste de balance inicial' } });
    return response.data;
};
// ============================================
// Global Caja Menor / Liquidation (uses first available school for now)
// ============================================
export const getGlobalCajaMenorSummary = async (schoolId) => {
    const response = await apiClient.get(`/schools/${schoolId}/accounting/caja-menor/summary`);
    return response.data;
};
export const liquidateGlobalCajaMenor = async (schoolId, amount, notes) => {
    const response = await apiClient.post(`/schools/${schoolId}/accounting/caja-menor/liquidate`, null, { params: { amount, notes } });
    return response.data;
};
export const getGlobalLiquidationHistory = async (schoolId, options) => {
    const response = await apiClient.get(`/schools/${schoolId}/accounting/caja-menor/liquidation-history`, {
        params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
            limit: options?.limit || 50
        }
    });
    return response.data;
};
// ============================================
// Global Balance Accounts
// ============================================
export const getGlobalBalanceAccounts = async (accountType, isActive) => {
    const response = await apiClient.get(`${BASE_URL}/balance-accounts`, { params: { account_type: accountType, is_active: isActive } });
    return response.data;
};
export const getGlobalBalanceAccount = async (accountId) => {
    const response = await apiClient.get(`${BASE_URL}/balance-accounts/${accountId}`);
    return response.data;
};
export const getGlobalBalanceEntries = async (accountId, limit = 50) => {
    const response = await apiClient.get(`${BASE_URL}/balance-accounts/${accountId}/entries`, { params: { limit } });
    return response.data;
};
export const createGlobalBalanceAccount = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/balance-accounts`, data);
    return response.data;
};
export const updateGlobalBalanceAccount = async (accountId, data) => {
    const response = await apiClient.patch(`${BASE_URL}/balance-accounts/${accountId}`, data);
    return response.data;
};
export const deleteGlobalBalanceAccount = async (accountId) => {
    await apiClient.delete(`${BASE_URL}/balance-accounts/${accountId}`);
};
export const getGlobalBalanceGeneralSummary = async () => {
    const response = await apiClient.get(`${BASE_URL}/balance-general/summary`);
    return response.data;
};
export const getGlobalBalanceGeneralDetailed = async () => {
    const response = await apiClient.get(`${BASE_URL}/balance-general/detailed`);
    return response.data;
};
// ============================================
// Global Expenses (Gastos del Negocio)
// ============================================
export const getGlobalExpenses = async (options) => {
    const response = await apiClient.get(`${BASE_URL}/expenses`, {
        params: {
            category: options?.category,
            is_paid: options?.isPaid,
            skip: options?.skip || 0,
            limit: options?.limit || 100
        }
    });
    return response.data;
};
export const getPendingGlobalExpenses = async () => {
    const response = await apiClient.get(`${BASE_URL}/expenses/pending`);
    return response.data;
};
export const getGlobalExpense = async (expenseId) => {
    const response = await apiClient.get(`${BASE_URL}/expenses/${expenseId}`);
    return response.data;
};
export const createGlobalExpense = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/expenses`, data);
    return response.data;
};
export const updateGlobalExpense = async (expenseId, data) => {
    const response = await apiClient.patch(`${BASE_URL}/expenses/${expenseId}`, data);
    return response.data;
};
export const payGlobalExpense = async (expenseId, payment) => {
    const response = await apiClient.post(`${BASE_URL}/expenses/${expenseId}/pay`, payment);
    return response.data;
};
// ============================================
// Global Accounts Payable (Cuentas por Pagar)
// ============================================
export const getGlobalPayables = async (options) => {
    const response = await apiClient.get(`${BASE_URL}/payables`, {
        params: {
            is_paid: options?.isPaid,
            is_overdue: options?.isOverdue,
            skip: options?.skip || 0,
            limit: options?.limit || 100
        }
    });
    return response.data;
};
export const getPendingGlobalPayables = async () => {
    const response = await apiClient.get(`${BASE_URL}/payables/pending`);
    return response.data;
};
export const getGlobalPayable = async (payableId) => {
    const response = await apiClient.get(`${BASE_URL}/payables/${payableId}`);
    return response.data;
};
export const createGlobalPayable = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/payables`, data);
    return response.data;
};
export const payGlobalPayable = async (payableId, payment) => {
    const response = await apiClient.post(`${BASE_URL}/payables/${payableId}/pay`, payment);
    return response.data;
};
export const getGlobalReceivables = async (options) => {
    const response = await apiClient.get(`${BASE_URL}/receivables`, {
        params: {
            is_paid: options?.isPaid,
            is_overdue: options?.isOverdue,
            skip: options?.skip || 0,
            limit: options?.limit || 100
        }
    });
    return response.data;
};
export const getPendingGlobalReceivables = async () => {
    const response = await apiClient.get(`${BASE_URL}/receivables/pending`);
    return response.data;
};
export const getGlobalReceivable = async (receivableId) => {
    const response = await apiClient.get(`${BASE_URL}/receivables/${receivableId}`);
    return response.data;
};
export const createGlobalReceivable = async (data) => {
    const response = await apiClient.post(`${BASE_URL}/receivables`, data);
    return response.data;
};
export const payGlobalReceivable = async (receivableId, payment) => {
    const response = await apiClient.post(`${BASE_URL}/receivables/${receivableId}/pay`, payment);
    return response.data;
};
export const getGlobalPatrimonySummary = async () => {
    const response = await apiClient.get(`${BASE_URL}/patrimony/summary`);
    return response.data;
};
// ============================================
// Global Transactions (for Reports)
// ============================================
export const getGlobalTransactions = async (options) => {
    const response = await apiClient.get(`${BASE_URL}/transactions`, {
        params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
            transaction_type: options?.transactionType,
            school_id: options?.schoolId,
            skip: options?.skip || 0,
            limit: options?.limit || 50
        }
    });
    return response.data;
};
export const getExpensesSummaryByCategory = async (options) => {
    const response = await apiClient.get(`${BASE_URL}/expenses/summary-by-category`, {
        params: {
            start_date: options?.startDate,
            end_date: options?.endDate
        }
    });
    return response.data;
};
export const getCashFlowReport = async (startDate, endDate, groupBy = 'day') => {
    const response = await apiClient.get(`${BASE_URL}/cash-flow`, {
        params: {
            start_date: startDate,
            end_date: endDate,
            group_by: groupBy
        }
    });
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
    getGlobalPatrimonySummary,
    // Transactions & Reports
    getGlobalTransactions,
    getExpensesSummaryByCategory,
    getCashFlowReport
};
export default globalAccountingService;
