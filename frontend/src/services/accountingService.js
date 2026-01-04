/**
 * Accounting Service - API calls for accounting, transactions, and expenses
 */
import apiClient from '../utils/api-client';
const BASE_URL = '/schools';
// Dashboard
export async function getAccountingDashboard(schoolId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/dashboard`);
    return response.data;
}
// Cash Flow
export async function getCashFlowSummary(schoolId, startDate, endDate) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/cash-flow`, { params: { start_date: startDate, end_date: endDate } });
    return response.data;
}
// Transactions
export async function getTransactions(schoolId, options) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/transactions`, {
        params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
            transaction_type: options?.type,
            skip: options?.skip || 0,
            limit: options?.limit || 100
        }
    });
    return response.data;
}
export async function getTransaction(schoolId, transactionId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/transactions/${transactionId}`);
    return response.data;
}
export async function createTransaction(schoolId, data) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/transactions`, { ...data, school_id: schoolId });
    return response.data;
}
// Expenses
export async function getExpenses(schoolId, options) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/expenses`, {
        params: {
            category: options?.category,
            is_paid: options?.isPaid,
            skip: options?.skip || 0,
            limit: options?.limit || 100
        }
    });
    return response.data;
}
export async function getPendingExpenses(schoolId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/expenses/pending`);
    return response.data;
}
export async function getExpensesByCategory(schoolId, startDate, endDate) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/expenses/by-category`, { params: { start_date: startDate, end_date: endDate } });
    return response.data;
}
export async function getExpense(schoolId, expenseId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}`);
    return response.data;
}
export async function createExpense(schoolId, data) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/expenses`, { ...data, school_id: schoolId });
    return response.data;
}
export async function updateExpense(schoolId, expenseId, data) {
    const response = await apiClient.patch(`${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}`, data);
    return response.data;
}
export async function payExpense(schoolId, expenseId, payment) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}/pay`, payment);
    return response.data;
}
export async function deleteExpense(schoolId, expenseId) {
    await apiClient.delete(`${BASE_URL}/${schoolId}/accounting/expenses/${expenseId}`);
}
// Daily Cash Register
export async function getTodayRegister(schoolId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/cash-register/today`);
    return response.data;
}
export async function getRegisterByDate(schoolId, date) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/cash-register/${date}`);
    return response.data;
}
export async function openCashRegister(schoolId, registerDate, openingBalance) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/cash-register`, { school_id: schoolId, register_date: registerDate, opening_balance: openingBalance });
    return response.data;
}
export async function closeCashRegister(schoolId, registerId, closingBalance, notes) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/cash-register/${registerId}/close`, { closing_balance: closingBalance, notes });
    return response.data;
}
// Helper functions
export function getExpenseCategoryLabel(category) {
    const labels = {
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
export function getExpenseCategoryColor(category) {
    const colors = {
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
export function getPaymentMethodLabel(method) {
    const labels = {
        cash: 'Efectivo',
        nequi: 'Nequi',
        transfer: 'Transferencia',
        card: 'Tarjeta',
        credit: 'Crédito',
        other: 'Otro'
    };
    return labels[method] || method;
}
// ============================================
// Balance General (Balance Sheet)
// ============================================
export async function getBalanceGeneralSummary(schoolId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/balance-general/summary`);
    return response.data;
}
export async function getBalanceGeneralDetailed(schoolId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/balance-general/detailed`);
    return response.data;
}
export async function getReceivablesPayablesSummary(schoolId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/receivables-payables/summary`);
    return response.data;
}
// Balance Accounts (Cuentas de Balance)
export async function getBalanceAccounts(schoolId, accountType, isActive) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/balance-accounts`, { params: { account_type: accountType, is_active: isActive } });
    return response.data;
}
export async function getBalanceAccount(schoolId, accountId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/balance-accounts/${accountId}`);
    return response.data;
}
export async function createBalanceAccount(schoolId, data) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/balance-accounts`, data);
    return response.data;
}
export async function updateBalanceAccount(schoolId, accountId, data) {
    const response = await apiClient.patch(`${BASE_URL}/${schoolId}/accounting/balance-accounts/${accountId}`, data);
    return response.data;
}
export async function deleteBalanceAccount(schoolId, accountId) {
    await apiClient.delete(`${BASE_URL}/${schoolId}/accounting/balance-accounts/${accountId}`);
}
// Balance Entries (Movimientos)
export async function getBalanceEntries(schoolId, accountId, startDate, endDate) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/balance-accounts/${accountId}/entries`, { params: { start_date: startDate, end_date: endDate } });
    return response.data;
}
export async function createBalanceEntry(schoolId, accountId, data) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/balance-accounts/${accountId}/entries`, data);
    return response.data;
}
// Accounts Receivable (Cuentas por Cobrar)
export async function getAccountsReceivable(schoolId, options) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/receivables`, { params: { is_paid: options?.isPaid, is_overdue: options?.isOverdue, client_id: options?.clientId } });
    return response.data;
}
export async function getAccountReceivable(schoolId, receivableId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/receivables/${receivableId}`);
    return response.data;
}
export async function createAccountReceivable(schoolId, data) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/receivables`, data);
    return response.data;
}
export async function payAccountReceivable(schoolId, receivableId, payment) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/receivables/${receivableId}/pay`, payment);
    return response.data;
}
export async function deleteAccountReceivable(schoolId, receivableId) {
    await apiClient.delete(`${BASE_URL}/${schoolId}/accounting/receivables/${receivableId}`);
}
// Accounts Payable (Cuentas por Pagar)
export async function getAccountsPayable(schoolId, options) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/payables`, { params: { is_paid: options?.isPaid, is_overdue: options?.isOverdue, vendor: options?.vendor } });
    return response.data;
}
export async function getAccountPayable(schoolId, payableId) {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/payables/${payableId}`);
    return response.data;
}
export async function createAccountPayable(schoolId, data) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/payables`, data);
    return response.data;
}
export async function payAccountPayable(schoolId, payableId, payment) {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/payables/${payableId}/pay`, payment);
    return response.data;
}
export async function deleteAccountPayable(schoolId, payableId) {
    await apiClient.delete(`${BASE_URL}/${schoolId}/accounting/payables/${payableId}`);
}
// Helper functions for account types
export function getAccountTypeLabel(accountType) {
    const labels = {
        asset_current: 'Activo Corriente',
        asset_fixed: 'Activo Fijo',
        asset_other: 'Otros Activos',
        liability_current: 'Pasivo Corriente',
        liability_long: 'Pasivo a Largo Plazo',
        liability_other: 'Otros Pasivos',
        equity_capital: 'Capital',
        equity_retained: 'Utilidades Retenidas',
        equity_other: 'Otro Patrimonio'
    };
    return labels[accountType] || accountType;
}
export function getAccountTypeColor(accountType) {
    const colors = {
        asset_current: 'bg-green-100 text-green-800',
        asset_fixed: 'bg-emerald-100 text-emerald-800',
        asset_other: 'bg-teal-100 text-teal-800',
        liability_current: 'bg-red-100 text-red-800',
        liability_long: 'bg-rose-100 text-rose-800',
        liability_other: 'bg-pink-100 text-pink-800',
        equity_capital: 'bg-blue-100 text-blue-800',
        equity_retained: 'bg-indigo-100 text-indigo-800',
        equity_other: 'bg-purple-100 text-purple-800'
    };
    return colors[accountType] || 'bg-gray-100 text-gray-800';
}
export function getAccountTypeCategory(accountType) {
    if (accountType.startsWith('asset'))
        return 'assets';
    if (accountType.startsWith('liability'))
        return 'liabilities';
    return 'equity';
}
export const getCashBalances = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/cash-balances`);
    return response.data;
};
// Caja Menor functions
export const getCajaMenorBalance = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/caja-menor/balance`);
    return response.data;
};
export const getCajaMenorSummary = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/caja-menor/summary`);
    return response.data;
};
export const liquidateCajaMenor = async (schoolId, amount, notes) => {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/caja-menor/liquidate`, null, { params: { amount, notes } });
    return response.data;
};
export const getLiquidationHistory = async (schoolId, options) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/caja-menor/liquidation-history`, {
        params: {
            start_date: options?.startDate,
            end_date: options?.endDate,
            limit: options?.limit || 50
        }
    });
    return response.data;
};
export const initializeDefaultAccounts = async (schoolId, cajaInitialBalance = 0, bancoInitialBalance = 0) => {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/initialize-default-accounts`, null, { params: { caja_initial_balance: cajaInitialBalance, banco_initial_balance: bancoInitialBalance } });
    return response.data;
};
export const getPatrimonySummary = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/patrimony/summary`);
    return response.data;
};
export const getInventoryValuation = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/patrimony/inventory-valuation`);
    return response.data;
};
export const setInitialBalance = async (schoolId, accountCode, initialBalance) => {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/patrimony/set-initial-balance`, null, { params: { account_code: accountCode, initial_balance: initialBalance } });
    return response.data;
};
export const createDebt = async (schoolId, data) => {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/patrimony/debts`, null, { params: data });
    return response.data;
};
export const getDebts = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/patrimony/debts`);
    return response.data;
};
export const createFixedAsset = async (schoolId, data) => {
    const response = await apiClient.post(`${BASE_URL}/${schoolId}/accounting/patrimony/fixed-assets`, null, { params: data });
    return response.data;
};
export const getFixedAssets = async (schoolId) => {
    const response = await apiClient.get(`${BASE_URL}/${schoolId}/accounting/patrimony/fixed-assets`);
    return response.data;
};
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
    getPaymentMethodLabel,
    // Balance General
    getBalanceGeneralSummary,
    getBalanceGeneralDetailed,
    getReceivablesPayablesSummary,
    // Balance Accounts
    getBalanceAccounts,
    getBalanceAccount,
    createBalanceAccount,
    updateBalanceAccount,
    deleteBalanceAccount,
    getBalanceEntries,
    createBalanceEntry,
    // Accounts Receivable
    getAccountsReceivable,
    getAccountReceivable,
    createAccountReceivable,
    payAccountReceivable,
    deleteAccountReceivable,
    // Accounts Payable
    getAccountsPayable,
    getAccountPayable,
    createAccountPayable,
    payAccountPayable,
    deleteAccountPayable,
    // Helpers
    getAccountTypeLabel,
    getAccountTypeColor,
    getAccountTypeCategory,
    // Cash Balances (Caja/Banco)
    getCashBalances,
    initializeDefaultAccounts,
    // Caja Menor / Liquidation
    getCajaMenorBalance,
    getCajaMenorSummary,
    liquidateCajaMenor,
    getLiquidationHistory,
    // Patrimony (Patrimonio)
    getPatrimonySummary,
    getInventoryValuation,
    setInitialBalance,
    createDebt,
    getDebts,
    createFixedAsset,
    getFixedAssets
};
