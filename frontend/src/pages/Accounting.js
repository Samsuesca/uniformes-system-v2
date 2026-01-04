import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Accounting Page - Financial management with Balance General, Receivables, and Payables
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Calculator, TrendingUp, TrendingDown, DollarSign, Plus, Loader2, AlertCircle, Receipt, X, Building2, Users, Wallet, Landmark, CreditCard, Clock, PiggyBank, Pencil, Settings, Trash2, Car, Package } from 'lucide-react';
import DatePicker, { formatDateSpanish } from '../components/DatePicker';
import { getExpenseCategoryLabel, getExpenseCategoryColor, getPaymentMethodLabel } from '../services/accountingService';
import { globalAccountingService } from '../services/globalAccountingService';
import { useSchoolStore } from '../stores/schoolStore';
import { useUserRole } from '../hooks/useUserRole';
// Expense categories and payment methods
// Helper to extract error message from API response
const getErrorMessage = (err, defaultMsg) => {
    const detail = err.response?.data?.detail;
    if (!detail)
        return defaultMsg;
    if (typeof detail === 'string')
        return detail;
    // FastAPI validation errors are arrays of objects
    if (Array.isArray(detail)) {
        return detail.map((e) => e.msg || e.message || JSON.stringify(e)).join(', ');
    }
    // If it's an object with a message property
    if (typeof detail === 'object' && detail.msg)
        return detail.msg;
    if (typeof detail === 'object' && detail.message)
        return detail.message;
    return defaultMsg;
};
const EXPENSE_CATEGORIES = [
    'rent', 'utilities', 'payroll', 'supplies', 'inventory',
    'transport', 'maintenance', 'marketing', 'taxes', 'bank_fees', 'other'
];
const PAYMENT_METHODS = ['cash', 'nequi', 'transfer', 'card', 'credit', 'other'];
export default function Accounting() {
    // Note: School store available for future filtering in reports
    useSchoolStore(); // Keep subscription active for navbar
    const { canAccessAccounting, isSuperuser } = useUserRole();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('dashboard');
    // Dashboard data
    const [dashboard, setDashboard] = useState(null);
    const [pendingExpenses, setPendingExpenses] = useState([]);
    // Receivables/Payables data
    const [receivablesPayables, setReceivablesPayables] = useState(null);
    const [receivablesList, setReceivablesList] = useState([]);
    const [payablesList, setPayablesList] = useState([]);
    // Cash balances (Caja/Banco)
    const [cashBalances, setCashBalances] = useState(null);
    // Global Patrimony data
    const [patrimony, setPatrimony] = useState(null);
    // Modal states
    const [showExpenseModal, setShowExpenseModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showBalanceAccountModal, setShowBalanceAccountModal] = useState(false);
    const [showReceivableModal, setShowReceivableModal] = useState(false);
    const [showPayableModal, setShowPayableModal] = useState(false);
    const [showPayReceivableModal, setShowPayReceivableModal] = useState(false);
    const [showPayPayableModal, setShowPayPayableModal] = useState(false);
    const [selectedExpense, setSelectedExpense] = useState(null);
    const [selectedReceivable, setSelectedReceivable] = useState(null);
    const [selectedPayable, setSelectedPayable] = useState(null);
    const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    const [newBalanceValue, setNewBalanceValue] = useState(0);
    // Fixed Assets / Liabilities Management Modal states
    const [showAssetsModal, setShowAssetsModal] = useState(false);
    const [assetsModalType, setAssetsModalType] = useState('asset_fixed');
    const [balanceAccountsList, setBalanceAccountsList] = useState([]);
    const [loadingAccounts, setLoadingAccounts] = useState(false);
    const [showNewAccountForm, setShowNewAccountForm] = useState(false);
    const [editingBalanceAccount, setEditingBalanceAccount] = useState(null);
    const [newAccountForm, setNewAccountForm] = useState({
        account_type: 'asset_fixed',
        name: '',
        description: '',
        balance: 0,
        original_value: null,
        accumulated_depreciation: null,
        useful_life_years: null,
        interest_rate: null,
        due_date: null,
        creditor: null
    });
    // Form states
    const [expenseForm, setExpenseForm] = useState({
        category: 'other',
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        vendor: '',
        notes: ''
    });
    const [balanceAccountForm, setBalanceAccountForm] = useState({
        account_type: 'asset_current',
        name: '',
        description: '',
        balance: 0
    });
    const [receivableForm, setReceivableForm] = useState({
        description: '',
        amount: 0,
        invoice_date: new Date().toISOString().split('T')[0]
    });
    const [payableForm, setPayableForm] = useState({
        vendor: '',
        description: '',
        amount: 0,
        invoice_date: new Date().toISOString().split('T')[0]
    });
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [submitting, setSubmitting] = useState(false);
    // Note: currentSchool is available if needed for filtering in reports
    // Global accounting operations don't require a school to be selected
    useEffect(() => {
        // Global accounting doesn't require a school to be selected
        if (canAccessAccounting || isSuperuser) {
            loadData();
        }
    }, [canAccessAccounting, isSuperuser, activeTab]);
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            if (activeTab === 'dashboard') {
                // Load global cash balances and pending expenses
                const [cashData, pendingData] = await Promise.all([
                    globalAccountingService.getGlobalCashBalances(),
                    globalAccountingService.getPendingGlobalExpenses()
                ]);
                // Map global cash data to local CashBalancesResponse type (includes all 4 accounts)
                setCashBalances({
                    caja: cashData.caja,
                    banco: cashData.banco,
                    total_liquid: cashData.total_liquid,
                    caja_menor: cashData.caja_menor,
                    caja_mayor: cashData.caja_mayor,
                    nequi: cashData.nequi,
                    total_cash: cashData.total_cash
                });
                setPendingExpenses(pendingData);
                // Build dashboard summary from global data
                const allExpenses = await globalAccountingService.getGlobalExpenses();
                const totalExpenses = allExpenses.reduce((sum, e) => sum + e.amount, 0);
                const pendingExpensesAmount = pendingData.reduce((sum, e) => sum + (e.amount - e.amount_paid), 0);
                setDashboard({
                    total_expenses: totalExpenses,
                    cash_balance: cashData.total_liquid,
                    expenses_pending: pendingExpensesAmount,
                    transaction_count: allExpenses.length
                });
            }
            else if (activeTab === 'receivables' || activeTab === 'payables') {
                // Use global accounting services for CxC and CxP
                const [receivables, payables] = await Promise.all([
                    globalAccountingService.getGlobalReceivables({ isPaid: false }),
                    globalAccountingService.getGlobalPayables({ isPaid: false })
                ]);
                setReceivablesList(receivables);
                setPayablesList(payables);
                // Calculate summary from the lists
                const totalReceivables = receivables.reduce((sum, r) => sum + r.amount, 0);
                const pendingReceivables = receivables.reduce((sum, r) => sum + r.balance, 0);
                const collectedReceivables = receivables.reduce((sum, r) => sum + r.amount_paid, 0);
                const totalPayables = payables.reduce((sum, p) => sum + p.amount, 0);
                const pendingPayables = payables.reduce((sum, p) => sum + p.balance, 0);
                const paidPayables = payables.reduce((sum, p) => sum + p.amount_paid, 0);
                setReceivablesPayables({
                    total_receivables: totalReceivables,
                    receivables_collected: collectedReceivables,
                    receivables_pending: pendingReceivables,
                    receivables_overdue: receivables.filter(r => r.is_overdue).reduce((sum, r) => sum + r.balance, 0),
                    receivables_count: receivables.length,
                    total_payables: totalPayables,
                    payables_paid: paidPayables,
                    payables_pending: pendingPayables,
                    payables_overdue: payables.filter(p => p.is_overdue).reduce((sum, p) => sum + p.balance, 0),
                    payables_count: payables.length,
                    net_position: pendingReceivables - pendingPayables
                });
            }
            else if (activeTab === 'patrimony') {
                // Load global patrimony summary (business-wide)
                const patrimonyData = await globalAccountingService.getGlobalPatrimonySummary();
                setPatrimony(patrimonyData);
            }
        }
        catch (err) {
            console.error('Error loading accounting data:', err);
            setError(getErrorMessage(err, 'Error al cargar datos de contabilidad'));
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreateExpense = async () => {
        if (!expenseForm.description || !expenseForm.amount || !expenseForm.expense_date)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service - expenses are business-wide by default
            await globalAccountingService.createGlobalExpense({
                category: expenseForm.category || 'other',
                description: expenseForm.description,
                amount: expenseForm.amount,
                expense_date: expenseForm.expense_date,
                vendor: expenseForm.vendor,
                notes: expenseForm.notes
            });
            setShowExpenseModal(false);
            resetExpenseForm();
            await loadData();
        }
        catch (err) {
            console.error('Error creating expense:', err);
            setError(getErrorMessage(err, 'Error al crear gasto'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handlePayExpense = async () => {
        if (!selectedExpense || paymentAmount <= 0)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service for expense payment
            await globalAccountingService.payGlobalExpense(selectedExpense.id, {
                amount: paymentAmount,
                payment_method: paymentMethod
            });
            setShowPaymentModal(false);
            setSelectedExpense(null);
            setPaymentAmount(0);
            await loadData();
        }
        catch (err) {
            console.error('Error paying expense:', err);
            setError(getErrorMessage(err, 'Error al registrar pago'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleCreateBalanceAccount = async () => {
        if (!balanceAccountForm.name || !balanceAccountForm.account_type)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service for balance accounts
            await globalAccountingService.createGlobalBalanceAccount({
                account_type: balanceAccountForm.account_type,
                name: balanceAccountForm.name,
                description: balanceAccountForm.description,
                balance: balanceAccountForm.balance || 0
            });
            setShowBalanceAccountModal(false);
            resetBalanceAccountForm();
            await loadData();
        }
        catch (err) {
            console.error('Error creating balance account:', err);
            setError(getErrorMessage(err, 'Error al crear cuenta'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleCreateReceivable = async () => {
        if (!receivableForm.description || !receivableForm.amount || !receivableForm.invoice_date)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service for CxC (no school_id required)
            await globalAccountingService.createGlobalReceivable({
                amount: receivableForm.amount,
                description: receivableForm.description,
                invoice_date: receivableForm.invoice_date,
                due_date: receivableForm.due_date ?? undefined,
                notes: receivableForm.notes ?? undefined,
                client_id: receivableForm.client_id ?? undefined
            });
            setShowReceivableModal(false);
            resetReceivableForm();
            await loadData();
        }
        catch (err) {
            console.error('Error creating receivable:', err);
            setError(getErrorMessage(err, 'Error al crear cuenta por cobrar'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handlePayReceivable = async () => {
        if (!selectedReceivable || paymentAmount <= 0)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service for payment
            await globalAccountingService.payGlobalReceivable(selectedReceivable.id, {
                amount: paymentAmount,
                payment_method: paymentMethod
            });
            setShowPayReceivableModal(false);
            setSelectedReceivable(null);
            setPaymentAmount(0);
            await loadData();
        }
        catch (err) {
            console.error('Error paying receivable:', err);
            setError(getErrorMessage(err, 'Error al registrar cobro'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleCreatePayable = async () => {
        if (!payableForm.vendor || !payableForm.description || !payableForm.amount || !payableForm.invoice_date)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service for CxP (no school_id required)
            await globalAccountingService.createGlobalPayable({
                vendor: payableForm.vendor,
                amount: payableForm.amount,
                description: payableForm.description,
                category: payableForm.category ?? undefined,
                invoice_number: payableForm.invoice_number ?? undefined,
                invoice_date: payableForm.invoice_date,
                due_date: payableForm.due_date ?? undefined,
                notes: payableForm.notes ?? undefined
            });
            setShowPayableModal(false);
            resetPayableForm();
            await loadData();
        }
        catch (err) {
            console.error('Error creating payable:', err);
            setError(getErrorMessage(err, 'Error al crear cuenta por pagar'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handlePayPayable = async () => {
        if (!selectedPayable || paymentAmount <= 0)
            return;
        try {
            setSubmitting(true);
            // Use global accounting service for payment
            await globalAccountingService.payGlobalPayable(selectedPayable.id, {
                amount: paymentAmount,
                payment_method: paymentMethod
            });
            setShowPayPayableModal(false);
            setSelectedPayable(null);
            setPaymentAmount(0);
            await loadData();
        }
        catch (err) {
            console.error('Error paying payable:', err);
            setError(getErrorMessage(err, 'Error al registrar pago'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleEditBalance = (account) => {
        setEditingAccount(account);
        let currentBalance = 0;
        switch (account) {
            case 'caja_menor':
                currentBalance = cashBalances?.caja_menor?.balance || 0;
                break;
            case 'caja_mayor':
                currentBalance = cashBalances?.caja_mayor?.balance || 0;
                break;
            case 'nequi':
                currentBalance = cashBalances?.nequi?.balance || 0;
                break;
            case 'banco':
                currentBalance = cashBalances?.banco?.balance || 0;
                break;
        }
        setNewBalanceValue(currentBalance);
        setShowEditBalanceModal(true);
    };
    const getAccountCode = (account) => {
        const codes = {
            caja_menor: '1101',
            caja_mayor: '1102',
            nequi: '1103',
            banco: '1104'
        };
        return codes[account] || '1101';
    };
    const getAccountLabel = (account) => {
        const labels = {
            caja_menor: 'Caja Menor',
            caja_mayor: 'Caja Mayor',
            nequi: 'Nequi',
            banco: 'Banco'
        };
        return labels[account] || account;
    };
    const handleSaveBalance = async () => {
        if (!editingAccount)
            return;
        try {
            setSubmitting(true);
            const accountCode = getAccountCode(editingAccount);
            await globalAccountingService.setGlobalAccountBalance(accountCode, newBalanceValue, `Ajuste manual de ${getAccountLabel(editingAccount)}`);
            setShowEditBalanceModal(false);
            setEditingAccount(null);
            await loadData();
        }
        catch (err) {
            console.error('Error updating balance:', err);
            setError(getErrorMessage(err, 'Error al actualizar balance'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const resetExpenseForm = () => {
        setExpenseForm({
            category: 'other',
            description: '',
            amount: 0,
            expense_date: new Date().toISOString().split('T')[0],
            vendor: '',
            notes: ''
        });
    };
    const resetBalanceAccountForm = () => {
        setBalanceAccountForm({
            account_type: 'asset_current',
            name: '',
            description: '',
            balance: 0
        });
    };
    const resetReceivableForm = () => {
        setReceivableForm({
            description: '',
            amount: 0,
            invoice_date: new Date().toISOString().split('T')[0]
        });
    };
    const resetPayableForm = () => {
        setPayableForm({
            vendor: '',
            description: '',
            amount: 0,
            invoice_date: new Date().toISOString().split('T')[0]
        });
    };
    const formatCurrency = (amount) => `$${Number(amount).toLocaleString('es-CO')}`;
    const formatDate = (dateStr) => formatDateSpanish(dateStr);
    // ============================================
    // Balance Accounts (Fixed Assets / Liabilities) Management
    // ============================================
    const getModalTitle = (type) => {
        switch (type) {
            case 'asset_fixed': return 'Activos Fijos';
            case 'liability_current': return 'Pasivos Corrientes';
            case 'liability_long': return 'Pasivos a Largo Plazo';
        }
    };
    const openAssetsModal = async (type) => {
        setAssetsModalType(type);
        setShowAssetsModal(true);
        setShowNewAccountForm(false);
        setEditingBalanceAccount(null);
        await loadBalanceAccounts(type);
    };
    const loadBalanceAccounts = async (type) => {
        try {
            setLoadingAccounts(true);
            const accounts = await globalAccountingService.getGlobalBalanceAccounts(type, true);
            setBalanceAccountsList(accounts);
        }
        catch (err) {
            console.error('Error loading balance accounts:', err);
            setError(getErrorMessage(err, 'Error al cargar cuentas'));
        }
        finally {
            setLoadingAccounts(false);
        }
    };
    const resetNewAccountForm = (type) => {
        setNewAccountForm({
            account_type: (type || assetsModalType),
            name: '',
            description: '',
            balance: 0,
            original_value: null,
            accumulated_depreciation: null,
            useful_life_years: null,
            interest_rate: null,
            due_date: null,
            creditor: null
        });
    };
    const handleCreateBalanceAccountGlobal = async () => {
        if (!newAccountForm.name)
            return;
        try {
            setSubmitting(true);
            await globalAccountingService.createGlobalBalanceAccount({
                ...newAccountForm,
                account_type: assetsModalType
            });
            setShowNewAccountForm(false);
            resetNewAccountForm();
            await loadBalanceAccounts(assetsModalType);
            await loadData(); // Refresh patrimony
        }
        catch (err) {
            console.error('Error creating balance account:', err);
            setError(getErrorMessage(err, 'Error al crear cuenta'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleUpdateBalanceAccountGlobal = async () => {
        if (!editingBalanceAccount)
            return;
        try {
            setSubmitting(true);
            await globalAccountingService.updateGlobalBalanceAccount(editingBalanceAccount.id, {
                name: newAccountForm.name,
                description: newAccountForm.description,
                balance: newAccountForm.balance,
                original_value: newAccountForm.original_value,
                accumulated_depreciation: newAccountForm.accumulated_depreciation,
                useful_life_years: newAccountForm.useful_life_years,
                interest_rate: newAccountForm.interest_rate,
                due_date: newAccountForm.due_date,
                creditor: newAccountForm.creditor
            });
            setEditingBalanceAccount(null);
            setShowNewAccountForm(false);
            resetNewAccountForm();
            await loadBalanceAccounts(assetsModalType);
            await loadData(); // Refresh patrimony
        }
        catch (err) {
            console.error('Error updating balance account:', err);
            setError(getErrorMessage(err, 'Error al actualizar cuenta'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleDeleteBalanceAccount = async (accountId) => {
        if (!confirm('¿Está seguro de eliminar esta cuenta? Esta acción no se puede deshacer.'))
            return;
        try {
            setSubmitting(true);
            await globalAccountingService.deleteGlobalBalanceAccount(accountId);
            await loadBalanceAccounts(assetsModalType);
            await loadData(); // Refresh patrimony
        }
        catch (err) {
            console.error('Error deleting balance account:', err);
            setError(getErrorMessage(err, 'Error al eliminar cuenta'));
        }
        finally {
            setSubmitting(false);
        }
    };
    const startEditBalanceAccount = (account) => {
        setEditingBalanceAccount(account);
        setNewAccountForm({
            account_type: account.account_type,
            name: account.name,
            description: account.description || '',
            balance: account.balance,
            original_value: account.original_value,
            accumulated_depreciation: account.accumulated_depreciation,
            useful_life_years: account.useful_life_years,
            interest_rate: account.interest_rate,
            due_date: account.due_date,
            creditor: account.creditor
        });
        setShowNewAccountForm(true);
    };
    // Access control
    if (!canAccessAccounting && !isSuperuser) {
        return (_jsx(Layout, { children: _jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-6", children: _jsxs("div", { className: "flex items-center", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-yellow-600 mr-3" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-yellow-800", children: "Acceso Restringido" }), _jsx("p", { className: "mt-1 text-sm text-yellow-700", children: "No tienes permisos para acceder a la contabilidad. Contacta al administrador." })] })] }) }) }));
    }
    // Render Tab Navigation
    const renderTabs = () => (_jsx("div", { className: "border-b border-gray-200 mb-6", children: _jsx("nav", { className: "-mb-px flex space-x-8", children: [
                { id: 'dashboard', label: 'Dashboard', icon: Calculator },
                { id: 'receivables', label: 'Cuentas por Cobrar', icon: Users },
                { id: 'payables', label: 'Cuentas por Pagar', icon: Building2 },
                { id: 'patrimony', label: 'Patrimonio', icon: PiggyBank }
            ].map(tab => (_jsxs("button", { onClick: () => setActiveTab(tab.id), className: `flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: [_jsx(tab.icon, { className: "w-5 h-5" }), tab.label] }, tab.id))) }) }));
    // Render Dashboard Tab
    const renderDashboard = () => (_jsxs(_Fragment, { children: [dashboard && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8", children: [_jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Liquidez Total" }), _jsx("p", { className: "text-2xl font-bold text-green-600 mt-1", children: formatCurrency(dashboard.cash_balance) }), _jsx("p", { className: "text-xs text-gray-400", children: "Caja + Banco" })] }), _jsx("div", { className: "w-12 h-12 bg-green-100 rounded-full flex items-center justify-center", children: _jsx(Wallet, { className: "w-6 h-6 text-green-600" }) })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Gastos Totales" }), _jsx("p", { className: "text-2xl font-bold text-red-600 mt-1", children: formatCurrency(dashboard.total_expenses) }), _jsxs("p", { className: "text-xs text-gray-400", children: [dashboard.transaction_count, " registro(s)"] })] }), _jsx("div", { className: "w-12 h-12 bg-red-100 rounded-full flex items-center justify-center", children: _jsx(TrendingDown, { className: "w-6 h-6 text-red-600" }) })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Gastos Pendientes" }), _jsx("p", { className: "text-2xl font-bold text-orange-600 mt-1", children: formatCurrency(dashboard.expenses_pending) }), _jsx("p", { className: "text-xs text-gray-400", children: "Por pagar" })] }), _jsx("div", { className: "w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center", children: _jsx(Receipt, { className: "w-6 h-6 text-orange-600" }) })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Balance Neto" }), _jsx("p", { className: `text-2xl font-bold mt-1 ${dashboard.cash_balance - dashboard.expenses_pending >= 0 ? 'text-green-600' : 'text-red-600'}`, children: formatCurrency(dashboard.cash_balance - dashboard.expenses_pending) }), _jsx("p", { className: "text-xs text-gray-400", children: "Liquidez - Pendientes" })] }), _jsx("div", { className: `w-12 h-12 rounded-full flex items-center justify-center ${dashboard.cash_balance - dashboard.expenses_pending >= 0 ? 'bg-green-100' : 'bg-red-100'}`, children: _jsx(DollarSign, { className: `w-6 h-6 ${dashboard.cash_balance - dashboard.expenses_pending >= 0 ? 'text-green-600' : 'text-red-600'}` }) })] }) })] })), cashBalances && (_jsxs("div", { className: "mb-8", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2", children: [_jsx(Wallet, { className: "w-5 h-5 text-blue-600" }), "Saldos Actuales"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [_jsxs("div", { className: "bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-emerald-700 flex items-center gap-2", children: [_jsx(Wallet, { className: "w-4 h-4" }), "Efectivo (Cash)"] }), _jsx("p", { className: "text-2xl font-bold text-emerald-800 mt-1", children: formatCurrency((cashBalances.caja_menor?.balance || 0) + (cashBalances.caja_mayor?.balance || 0)) })] }), _jsx("div", { className: "w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center", children: _jsx(DollarSign, { className: "w-5 h-5 text-emerald-700" }) })] }), _jsxs("div", { className: "border-t border-emerald-200 pt-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-emerald-600", children: "Caja Menor" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-emerald-700", children: formatCurrency(cashBalances.caja_menor?.balance || 0) }), _jsx("button", { onClick: () => handleEditBalance('caja_menor'), className: "text-emerald-500 hover:text-emerald-700 p-1", title: "Editar Caja Menor", children: _jsx(Pencil, { className: "w-3 h-3" }) })] })] }), _jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-emerald-600", children: "Caja Mayor" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-emerald-700", children: formatCurrency(cashBalances.caja_mayor?.balance || 0) }), _jsx("button", { onClick: () => handleEditBalance('caja_mayor'), className: "text-emerald-500 hover:text-emerald-700 p-1", title: "Editar Caja Mayor", children: _jsx(Pencil, { className: "w-3 h-3" }) })] })] })] })] }), _jsxs("div", { className: "bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-blue-700 flex items-center gap-2", children: [_jsx(Landmark, { className: "w-4 h-4" }), "Banco (Digital)"] }), _jsx("p", { className: "text-2xl font-bold text-blue-800 mt-1", children: formatCurrency((cashBalances.nequi?.balance || 0) + (cashBalances.banco?.balance || 0)) })] }), _jsx("div", { className: "w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center", children: _jsx(CreditCard, { className: "w-5 h-5 text-blue-700" }) })] }), _jsxs("div", { className: "border-t border-blue-200 pt-3 space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-blue-600", children: "Nequi" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-blue-700", children: formatCurrency(cashBalances.nequi?.balance || 0) }), _jsx("button", { onClick: () => handleEditBalance('nequi'), className: "text-blue-500 hover:text-blue-700 p-1", title: "Editar Nequi", children: _jsx(Pencil, { className: "w-3 h-3" }) })] })] }), _jsxs("div", { className: "flex items-center justify-between text-sm", children: [_jsx("span", { className: "text-blue-600", children: "Cuenta Bancaria" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-blue-700", children: formatCurrency(cashBalances.banco?.balance || 0) }), _jsx("button", { onClick: () => handleEditBalance('banco'), className: "text-blue-500 hover:text-blue-700 p-1", title: "Editar Banco", children: _jsx(Pencil, { className: "w-3 h-3" }) })] })] })] })] }), _jsxs("div", { className: "bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-5", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("p", { className: "text-sm font-semibold text-purple-700 flex items-center gap-2", children: [_jsx(Calculator, { className: "w-4 h-4" }), "Total L\u00EDquido"] }), _jsx("p", { className: "text-2xl font-bold text-purple-800 mt-1", children: formatCurrency(cashBalances.total_liquid) })] }), _jsx("div", { className: "w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center", children: _jsx(DollarSign, { className: "w-5 h-5 text-purple-700" }) })] }), _jsxs("div", { className: "border-t border-purple-200 pt-3 mt-3 space-y-1 text-sm", children: [_jsxs("div", { className: "flex justify-between text-purple-600", children: [_jsx("span", { children: "Efectivo" }), _jsx("span", { children: formatCurrency((cashBalances.caja_menor?.balance || 0) + (cashBalances.caja_mayor?.balance || 0)) })] }), _jsxs("div", { className: "flex justify-between text-purple-600", children: [_jsx("span", { children: "Digital" }), _jsx("span", { children: formatCurrency((cashBalances.nequi?.balance || 0) + (cashBalances.banco?.balance || 0)) })] })] })] })] })] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200", children: [_jsx("div", { className: "px-6 py-4 border-b border-gray-200", children: _jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Resumen Global" }) }), _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between py-2 border-b border-gray-100", children: [_jsx("span", { className: "text-gray-600", children: "Total de Gastos Registrados" }), _jsx("span", { className: "font-semibold text-gray-800", children: dashboard?.transaction_count || 0 })] }), _jsxs("div", { className: "flex items-center justify-between py-2 border-b border-gray-100", children: [_jsx("span", { className: "text-gray-600", children: "Gastos Pagados" }), _jsx("span", { className: "font-semibold text-green-600", children: formatCurrency((dashboard?.total_expenses || 0) - (dashboard?.expenses_pending || 0)) })] }), _jsxs("div", { className: "flex items-center justify-between py-2", children: [_jsx("span", { className: "text-gray-600", children: "Gastos Por Pagar" }), _jsx("span", { className: "font-semibold text-orange-600", children: formatCurrency(dashboard?.expenses_pending || 0) })] })] }), _jsx("div", { className: "mt-6 p-4 bg-blue-50 rounded-lg", children: _jsxs("p", { className: "text-sm text-blue-700", children: ["\uD83D\uDCA1 ", _jsx("strong", { children: "Tip:" }), " Usa la pesta\u00F1a \"Patrimonio\" para ver el balance general completo del negocio incluyendo activos, pasivos e inventario."] }) })] })] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200 flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Gastos Pendientes" }), _jsxs("button", { onClick: () => setShowExpenseModal(true), className: "text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1", children: [_jsx(Plus, { className: "w-4 h-4" }), " Nuevo"] })] }), _jsx("div", { className: "divide-y divide-gray-100", children: pendingExpenses.length === 0 ? (_jsx("div", { className: "px-6 py-8 text-center text-gray-500", children: "No hay gastos pendientes" })) : (pendingExpenses.slice(0, 8).map((expense) => (_jsx("div", { className: "px-6 py-4 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: `px-2 py-1 rounded-full text-xs font-medium ${getExpenseCategoryColor(expense.category)}`, children: getExpenseCategoryLabel(expense.category) }), _jsxs("div", { className: "ml-4", children: [_jsx("p", { className: "text-sm font-medium text-gray-800", children: expense.description }), _jsxs("p", { className: "text-xs text-gray-500", children: [expense.vendor && `${expense.vendor} - `, "Vence: ", expense.due_date ? formatDate(expense.due_date) : 'Sin fecha'] })] })] }), _jsxs("div", { className: "text-right", children: [_jsx("p", { className: "text-sm font-semibold text-red-600", children: formatCurrency(expense.balance) }), _jsx("button", { onClick: () => {
                                                            setSelectedExpense(expense);
                                                            setPaymentAmount(expense.balance);
                                                            setShowPaymentModal(true);
                                                        }, className: "text-xs text-blue-600 hover:text-blue-800", children: "Pagar" })] })] }) }, expense.id)))) })] })] })] }));
    // Render Accounts Receivable Tab
    const renderReceivables = () => (_jsxs(_Fragment, { children: [receivablesPayables && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: [_jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Total por Cobrar" }), _jsx("p", { className: "text-2xl font-bold text-blue-600 mt-1", children: formatCurrency(receivablesPayables.total_receivables) })] }), _jsx(Users, { className: "w-8 h-8 text-blue-400" })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Pendientes" }), _jsx("p", { className: "text-2xl font-bold text-orange-600 mt-1", children: formatCurrency(receivablesPayables.receivables_pending) }), _jsxs("p", { className: "text-xs text-gray-400", children: [receivablesPayables.receivables_count, " cuenta(s)"] })] }), _jsx(Clock, { className: "w-8 h-8 text-orange-400" })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Vencidas" }), _jsx("p", { className: "text-2xl font-bold text-red-600 mt-1", children: formatCurrency(receivablesPayables.receivables_overdue) })] }), _jsx(AlertCircle, { className: "w-8 h-8 text-red-400" })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Posici\u00F3n Neta" }), _jsx("p", { className: `text-2xl font-bold mt-1 ${receivablesPayables.net_position >= 0 ? 'text-green-600' : 'text-red-600'}`, children: formatCurrency(receivablesPayables.net_position) }), _jsx("p", { className: "text-xs text-gray-400", children: "Por cobrar - Por pagar" })] }), _jsx(DollarSign, { className: `w-8 h-8 ${receivablesPayables.net_position >= 0 ? 'text-green-400' : 'text-red-400'}` })] }) })] })), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200 flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Cuentas por Cobrar" }), _jsxs("button", { onClick: () => setShowReceivableModal(true), className: "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm", children: [_jsx(Plus, { className: "w-4 h-4" }), "Nueva Cuenta"] })] }), _jsx("div", { className: "divide-y divide-gray-100", children: receivablesList.length === 0 ? (_jsxs("div", { className: "px-6 py-12 text-center text-gray-500", children: [_jsx(Users, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsx("p", { children: "No hay cuentas por cobrar pendientes" })] })) : (receivablesList.map((item) => (_jsx("div", { className: "px-6 py-4 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${item.is_paid ? 'bg-green-500' : item.is_overdue ? 'bg-red-500' : 'bg-orange-500'}` }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-800", children: item.description }), _jsxs("p", { className: "text-sm text-gray-500", children: [item.client_name || 'Sin cliente', item.due_date && ` - Vence: ${formatDate(item.due_date)}`] })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-semibold text-gray-800", children: formatCurrency(item.amount) }), item.amount_paid > 0 && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Pagado: ", formatCurrency(item.amount_paid)] })), item.balance > 0 && (_jsxs("p", { className: "text-sm font-medium text-blue-600", children: ["Saldo: ", formatCurrency(item.balance)] }))] }), !item.is_paid && (_jsx("button", { onClick: () => {
                                                    setSelectedReceivable(item);
                                                    setPaymentAmount(item.balance);
                                                    setShowPayReceivableModal(true);
                                                }, className: "px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors", children: "Cobrar" }))] })] }) }, item.id)))) })] })] }));
    // Render Accounts Payable Tab
    const renderPayables = () => (_jsxs(_Fragment, { children: [receivablesPayables && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-6 mb-8", children: [_jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Total por Pagar" }), _jsx("p", { className: "text-2xl font-bold text-red-600 mt-1", children: formatCurrency(receivablesPayables.total_payables) })] }), _jsx(Building2, { className: "w-8 h-8 text-red-400" })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Pendientes" }), _jsx("p", { className: "text-2xl font-bold text-orange-600 mt-1", children: formatCurrency(receivablesPayables.payables_pending) }), _jsxs("p", { className: "text-xs text-gray-400", children: [receivablesPayables.payables_count, " cuenta(s)"] })] }), _jsx(Clock, { className: "w-8 h-8 text-orange-400" })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Vencidas" }), _jsx("p", { className: "text-2xl font-bold text-red-600 mt-1", children: formatCurrency(receivablesPayables.payables_overdue) })] }), _jsx(AlertCircle, { className: "w-8 h-8 text-red-400" })] }) }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm font-medium text-gray-500", children: "Posici\u00F3n Neta" }), _jsx("p", { className: `text-2xl font-bold mt-1 ${receivablesPayables.net_position >= 0 ? 'text-green-600' : 'text-red-600'}`, children: formatCurrency(receivablesPayables.net_position) }), _jsx("p", { className: "text-xs text-gray-400", children: "Por cobrar - Por pagar" })] }), _jsx(DollarSign, { className: `w-8 h-8 ${receivablesPayables.net_position >= 0 ? 'text-green-400' : 'text-red-400'}` })] }) })] })), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200", children: [_jsxs("div", { className: "px-6 py-4 border-b border-gray-200 flex items-center justify-between", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Cuentas por Pagar" }), _jsxs("button", { onClick: () => setShowPayableModal(true), className: "flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm", children: [_jsx(Plus, { className: "w-4 h-4" }), "Nueva Cuenta"] })] }), _jsx("div", { className: "divide-y divide-gray-100", children: payablesList.length === 0 ? (_jsxs("div", { className: "px-6 py-12 text-center text-gray-500", children: [_jsx(Building2, { className: "w-12 h-12 text-gray-300 mx-auto mb-3" }), _jsx("p", { children: "No hay cuentas por pagar pendientes" })] })) : (payablesList.map((item) => (_jsx("div", { className: "px-6 py-4 hover:bg-gray-50 transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: `w-3 h-3 rounded-full ${item.is_paid ? 'bg-green-500' : item.is_overdue ? 'bg-red-500' : 'bg-orange-500'}` }), _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-800", children: item.description }), _jsxs("p", { className: "text-sm text-gray-500", children: [item.vendor, item.invoice_number && ` - Fact: ${item.invoice_number}`, item.due_date && ` - Vence: ${formatDate(item.due_date)}`] })] })] }), _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "text-right", children: [_jsx("p", { className: "font-semibold text-gray-800", children: formatCurrency(item.amount) }), item.amount_paid > 0 && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Pagado: ", formatCurrency(item.amount_paid)] })), item.balance > 0 && (_jsxs("p", { className: "text-sm font-medium text-red-600", children: ["Saldo: ", formatCurrency(item.balance)] }))] }), !item.is_paid && (_jsx("button", { onClick: () => {
                                                    setSelectedPayable(item);
                                                    setPaymentAmount(item.balance);
                                                    setShowPayPayableModal(true);
                                                }, className: "px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors", children: "Pagar" }))] })] }) }, item.id)))) })] })] }));
    // Render Patrimony Tab
    const renderPatrimony = () => (_jsx(_Fragment, { children: patrimony ? (_jsxs("div", { className: "space-y-6", children: [_jsx("div", { className: "bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-blue-100 text-sm font-medium", children: "Patrimonio Neto" }), _jsx("p", { className: "text-4xl font-bold mt-1", children: formatCurrency(patrimony.net_patrimony) }), _jsx("p", { className: "text-blue-100 text-sm mt-2", children: "Activos - Pasivos = Patrimonio" })] }), _jsx("div", { className: "w-16 h-16 bg-white/20 rounded-full flex items-center justify-center", children: _jsx(PiggyBank, { className: "w-8 h-8" }) })] }) }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-green-100 rounded-full flex items-center justify-center", children: _jsx(TrendingUp, { className: "w-5 h-5 text-green-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Activos" }), _jsx("p", { className: "text-2xl font-bold text-green-600", children: formatCurrency(patrimony.assets.total) })] })] }), _jsxs("div", { className: "space-y-3 border-t pt-4", children: [_jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Wallet, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Caja" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.assets.caja) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Landmark, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Banco" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.assets.banco) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(DollarSign, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Total L\u00EDquido" })] }), _jsx("span", { className: "font-medium text-blue-600", children: formatCurrency(patrimony.assets.total_liquid) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Receipt, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Inventario" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.assets.inventory || 0) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Cuentas por Cobrar" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.assets.receivables || 0) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100 bg-blue-50 -mx-2 px-2 rounded", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calculator, { className: "w-4 h-4 text-blue-600" }), _jsx("span", { className: "text-blue-700 font-medium", children: "Activos Corrientes" })] }), _jsx("span", { className: "font-bold text-blue-700", children: formatCurrency(patrimony.assets.current_assets || 0) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100 group", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Car, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Activos Fijos" }), _jsxs("button", { onClick: () => openAssetsModal('asset_fixed'), className: "text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", children: [_jsx(Settings, { className: "w-3 h-3" }), "Gestionar"] })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.assets.fixed_assets) })] }), _jsxs("div", { className: "flex justify-between items-center py-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Receipt, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Otros Activos" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.assets.other_assets) })] })] })] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-10 h-10 bg-red-100 rounded-full flex items-center justify-center", children: _jsx(TrendingDown, { className: "w-5 h-5 text-red-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: "Pasivos" }), _jsx("p", { className: "text-2xl font-bold text-red-600", children: formatCurrency(patrimony.liabilities.total) })] })] }), _jsxs("div", { className: "space-y-3 border-t pt-4", children: [_jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Users, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Cuentas por Pagar Pendientes" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.liabilities.pending_payables) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Receipt, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Gastos Pendientes" })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.liabilities.pending_expenses) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 border-b border-gray-100 group", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Clock, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Pasivos Corrientes" }), _jsxs("button", { onClick: () => openAssetsModal('liability_current'), className: "text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", children: [_jsx(Settings, { className: "w-3 h-3" }), "Gestionar"] })] }), _jsx("span", { className: "font-medium text-orange-600", children: formatCurrency(patrimony.liabilities.current) })] }), _jsxs("div", { className: "flex justify-between items-center py-2 group", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-gray-600", children: "Pasivos Largo Plazo" }), _jsxs("button", { onClick: () => openAssetsModal('liability_long'), className: "text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1", children: [_jsx(Settings, { className: "w-3 h-3" }), "Gestionar"] })] }), _jsx("span", { className: "font-medium text-gray-800", children: formatCurrency(patrimony.liabilities.long_term) })] })] })] })] }), _jsxs("div", { className: "bg-gray-50 rounded-xl border border-gray-200 p-6", children: [_jsx("h4", { className: "text-sm font-medium text-gray-500 mb-4", children: "Ecuaci\u00F3n Patrimonial" }), _jsxs("div", { className: "flex items-center justify-center gap-4 flex-wrap", children: [_jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-gray-500", children: "Activos" }), _jsx("p", { className: "text-xl font-bold text-green-600", children: formatCurrency(patrimony.assets.total) })] }), _jsx("span", { className: "text-2xl text-gray-400", children: "\u2212" }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-gray-500", children: "Pasivos" }), _jsx("p", { className: "text-xl font-bold text-red-600", children: formatCurrency(patrimony.liabilities.total) })] }), _jsx("span", { className: "text-2xl text-gray-400", children: "=" }), _jsxs("div", { className: "text-center", children: [_jsx("p", { className: "text-sm text-gray-500", children: "Patrimonio" }), _jsx("p", { className: "text-xl font-bold text-blue-600", children: formatCurrency(patrimony.net_patrimony) })] })] })] })] })) : (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando patrimonio..." })] })) }));
    // Render action button based on current tab
    const renderActionButton = () => {
        if (activeTab === 'dashboard') {
            return (_jsxs("button", { onClick: () => setShowExpenseModal(true), className: "flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors", children: [_jsx(Plus, { className: "w-5 h-5" }), "Nuevo Gasto"] }));
        }
        return null;
    };
    if (loading) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando contabilidad..." })] }) }));
    }
    if (error) {
        return (_jsx(Layout, { children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadData, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) }) }));
    }
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800 flex items-center", children: [_jsx(Calculator, { className: "w-8 h-8 mr-3 text-blue-600" }), "Contabilidad"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Gesti\u00F3n financiera y balance general" })] }), renderActionButton()] }), renderTabs(), activeTab === 'dashboard' && renderDashboard(), activeTab === 'receivables' && renderReceivables(), activeTab === 'payables' && renderPayables(), activeTab === 'patrimony' && renderPatrimony(), showEditBalanceModal && editingAccount && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsxs("h3", { className: "text-lg font-semibold", children: ["Editar Balance de ", getAccountLabel(editingAccount)] }), _jsx("button", { onClick: () => {
                                        setShowEditBalanceModal(false);
                                        setEditingAccount(null);
                                    }, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Balance Actual" }), _jsx("p", { className: "text-lg font-semibold text-gray-800", children: formatCurrency(editingAccount === 'caja_menor' ? (cashBalances?.caja_menor?.balance || 0) :
                                                editingAccount === 'caja_mayor' ? (cashBalances?.caja_mayor?.balance || 0) :
                                                    editingAccount === 'nequi' ? (cashBalances?.nequi?.balance || 0) :
                                                        (cashBalances?.banco?.balance || 0)) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nuevo Balance" }), _jsx("input", { type: "text", inputMode: "decimal", value: newBalanceValue === 0 ? '' : newBalanceValue, onChange: (e) => {
                                                const val = e.target.value.replace(/[^0-9.]/g, '');
                                                setNewBalanceValue(val === '' ? 0 : parseFloat(val));
                                            }, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ingrese el nuevo balance" })] }), _jsx("p", { className: "text-sm text-gray-500", children: "Este ajuste quedar\u00E1 registrado en el historial de la cuenta." })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => {
                                        setShowEditBalanceModal(false);
                                        setEditingAccount(null);
                                    }, className: "px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveBalance, disabled: submitting, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Guardar"] })] })] }) })), showExpenseModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Nuevo Gasto" }), _jsx("button", { onClick: () => setShowExpenseModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Categor\u00EDa" }), _jsx("select", { value: expenseForm.category || 'other', onChange: (e) => setExpenseForm({ ...expenseForm, category: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: EXPENSE_CATEGORIES.map((cat) => (_jsx("option", { value: cat, children: getExpenseCategoryLabel(cat) }, cat))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n *" }), _jsx("input", { type: "text", value: expenseForm.description || '', onChange: (e) => setExpenseForm({ ...expenseForm, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Pago de arriendo local" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto *" }), _jsx("input", { type: "number", value: expenseForm.amount || '', onChange: (e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha *" }), _jsx(DatePicker, { value: expenseForm.expense_date || '', onChange: (value) => setExpenseForm({ ...expenseForm, expense_date: value }) })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Proveedor" }), _jsx("input", { type: "text", value: expenseForm.vendor || '', onChange: (e) => setExpenseForm({ ...expenseForm, vendor: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha vencimiento" }), _jsx(DatePicker, { value: expenseForm.due_date || '', onChange: (value) => setExpenseForm({ ...expenseForm, due_date: value }), minDate: expenseForm.expense_date })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notas" }), _jsx("textarea", { value: expenseForm.notes || '', onChange: (e) => setExpenseForm({ ...expenseForm, notes: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", rows: 2 })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowExpenseModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleCreateExpense, disabled: submitting || !expenseForm.description || !expenseForm.amount, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Crear Gasto"] })] })] }) })), showPaymentModal && selectedExpense && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Registrar Pago" }), _jsx("button", { onClick: () => setShowPaymentModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Gasto:" }), _jsx("p", { className: "font-medium", children: selectedExpense.description }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Pendiente: ", _jsx("span", { className: "font-medium text-red-600", children: formatCurrency(selectedExpense.balance) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto a pagar" }), _jsx("input", { type: "number", value: paymentAmount, onChange: (e) => setPaymentAmount(parseFloat(e.target.value) || 0), max: selectedExpense.balance, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u00E9todo de pago" }), _jsx("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: PAYMENT_METHODS.map((method) => (_jsx("option", { value: method, children: getPaymentMethodLabel(method) }, method))) })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowPaymentModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handlePayExpense, disabled: submitting || paymentAmount <= 0 || paymentAmount > selectedExpense.balance, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Registrar Pago"] })] })] }) })), showBalanceAccountModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Nueva Cuenta de Balance" }), _jsx("button", { onClick: () => setShowBalanceAccountModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tipo de Cuenta *" }), _jsxs("select", { value: balanceAccountForm.account_type || 'asset_current', onChange: (e) => setBalanceAccountForm({ ...balanceAccountForm, account_type: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: [_jsxs("optgroup", { label: "Activos", children: [_jsx("option", { value: "asset_current", children: "Activo Corriente" }), _jsx("option", { value: "asset_fixed", children: "Activo Fijo" }), _jsx("option", { value: "asset_other", children: "Otros Activos" })] }), _jsxs("optgroup", { label: "Pasivos", children: [_jsx("option", { value: "liability_current", children: "Pasivo Corriente" }), _jsx("option", { value: "liability_long", children: "Pasivo a Largo Plazo" }), _jsx("option", { value: "liability_other", children: "Otros Pasivos" })] }), _jsxs("optgroup", { label: "Patrimonio", children: [_jsx("option", { value: "equity_capital", children: "Capital" }), _jsx("option", { value: "equity_retained", children: "Utilidades Retenidas" }), _jsx("option", { value: "equity_other", children: "Otro Patrimonio" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", value: balanceAccountForm.name || '', onChange: (e) => setBalanceAccountForm({ ...balanceAccountForm, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Caja, Banco, Veh\u00EDculo, Pr\u00E9stamo Bancario..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Saldo Inicial *" }), _jsx("input", { type: "number", value: balanceAccountForm.balance || '', onChange: (e) => setBalanceAccountForm({ ...balanceAccountForm, balance: parseFloat(e.target.value) || 0 }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "C\u00F3digo (opcional)" }), _jsx("input", { type: "text", value: balanceAccountForm.code || '', onChange: (e) => setBalanceAccountForm({ ...balanceAccountForm, code: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: 1101" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n" }), _jsx("textarea", { value: balanceAccountForm.description || '', onChange: (e) => setBalanceAccountForm({ ...balanceAccountForm, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", rows: 2, placeholder: "Descripci\u00F3n opcional de la cuenta..." })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowBalanceAccountModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleCreateBalanceAccount, disabled: submitting || !balanceAccountForm.name, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Crear Cuenta"] })] })] }) })), showReceivableModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Nueva Cuenta por Cobrar" }), _jsx("button", { onClick: () => setShowReceivableModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n *" }), _jsx("input", { type: "text", value: receivableForm.description || '', onChange: (e) => setReceivableForm({ ...receivableForm, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Venta a cr\u00E9dito a Juan P\u00E9rez" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto *" }), _jsx("input", { type: "number", value: receivableForm.amount || '', onChange: (e) => setReceivableForm({ ...receivableForm, amount: parseFloat(e.target.value) || 0 }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha factura *" }), _jsx(DatePicker, { value: receivableForm.invoice_date || '', onChange: (value) => setReceivableForm({ ...receivableForm, invoice_date: value }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha vencimiento" }), _jsx(DatePicker, { value: receivableForm.due_date || '', onChange: (value) => setReceivableForm({ ...receivableForm, due_date: value }), minDate: receivableForm.invoice_date })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notas" }), _jsx("textarea", { value: receivableForm.notes || '', onChange: (e) => setReceivableForm({ ...receivableForm, notes: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", rows: 2 })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowReceivableModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleCreateReceivable, disabled: submitting || !receivableForm.description || !receivableForm.amount, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Crear Cuenta"] })] })] }) })), showPayReceivableModal && selectedReceivable && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Registrar Cobro" }), _jsx("button", { onClick: () => setShowPayReceivableModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-blue-50 rounded-lg p-4", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Cuenta por Cobrar:" }), _jsx("p", { className: "font-medium", children: selectedReceivable.description }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Pendiente: ", _jsx("span", { className: "font-medium text-blue-600", children: formatCurrency(selectedReceivable.balance) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto a cobrar" }), _jsx("input", { type: "number", value: paymentAmount, onChange: (e) => setPaymentAmount(parseFloat(e.target.value) || 0), max: selectedReceivable.balance, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u00E9todo de pago" }), _jsx("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: PAYMENT_METHODS.map((method) => (_jsx("option", { value: method, children: getPaymentMethodLabel(method) }, method))) })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowPayReceivableModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handlePayReceivable, disabled: submitting || paymentAmount <= 0 || paymentAmount > selectedReceivable.balance, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Registrar Cobro"] })] })] }) })), showPayableModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Nueva Cuenta por Pagar" }), _jsx("button", { onClick: () => setShowPayableModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Proveedor *" }), _jsx("input", { type: "text", value: payableForm.vendor || '', onChange: (e) => setPayableForm({ ...payableForm, vendor: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Nombre del proveedor" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n *" }), _jsx("input", { type: "text", value: payableForm.description || '', onChange: (e) => setPayableForm({ ...payableForm, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Compra de tela para uniformes" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto *" }), _jsx("input", { type: "number", value: payableForm.amount || '', onChange: (e) => setPayableForm({ ...payableForm, amount: parseFloat(e.target.value) || 0 }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "N\u00FAmero Factura" }), _jsx("input", { type: "text", value: payableForm.invoice_number || '', onChange: (e) => setPayableForm({ ...payableForm, invoice_number: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha factura *" }), _jsx(DatePicker, { value: payableForm.invoice_date || '', onChange: (value) => setPayableForm({ ...payableForm, invoice_date: value }) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha vencimiento" }), _jsx(DatePicker, { value: payableForm.due_date || '', onChange: (value) => setPayableForm({ ...payableForm, due_date: value }), minDate: payableForm.invoice_date })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Categor\u00EDa" }), _jsx("input", { type: "text", value: payableForm.category || '', onChange: (e) => setPayableForm({ ...payableForm, category: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Materia prima, Servicios, etc." })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notas" }), _jsx("textarea", { value: payableForm.notes || '', onChange: (e) => setPayableForm({ ...payableForm, notes: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", rows: 2 })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowPayableModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleCreatePayable, disabled: submitting || !payableForm.vendor || !payableForm.description || !payableForm.amount, className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Crear Cuenta"] })] })] }) })), showPayPayableModal && selectedPayable && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Registrar Pago" }), _jsx("button", { onClick: () => setShowPayPayableModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-red-50 rounded-lg p-4", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Cuenta por Pagar:" }), _jsx("p", { className: "font-medium", children: selectedPayable.description }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Proveedor: ", selectedPayable.vendor] }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Pendiente: ", _jsx("span", { className: "font-medium text-red-600", children: formatCurrency(selectedPayable.balance) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto a pagar" }), _jsx("input", { type: "number", value: paymentAmount, onChange: (e) => setPaymentAmount(parseFloat(e.target.value) || 0), max: selectedPayable.balance, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u00E9todo de pago" }), _jsx("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", children: PAYMENT_METHODS.map((method) => (_jsx("option", { value: method, children: getPaymentMethodLabel(method) }, method))) })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowPayPayableModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handlePayPayable, disabled: submitting || paymentAmount <= 0 || paymentAmount > selectedPayable.balance, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Registrar Pago"] })] })] }) })), showAssetsModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsxs("h3", { className: "text-lg font-semibold flex items-center gap-2", children: [assetsModalType === 'asset_fixed' && _jsx(Car, { className: "w-5 h-5 text-green-600" }), assetsModalType === 'liability_current' && _jsx(Clock, { className: "w-5 h-5 text-orange-600" }), assetsModalType === 'liability_long' && _jsx(CreditCard, { className: "w-5 h-5 text-red-600" }), getModalTitle(assetsModalType)] }), _jsx("button", { onClick: () => {
                                        setShowAssetsModal(false);
                                        setShowNewAccountForm(false);
                                        setEditingBalanceAccount(null);
                                        resetNewAccountForm();
                                    }, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: !showNewAccountForm ? (_jsxs(_Fragment, { children: [_jsx("div", { className: "mb-4", children: _jsxs("button", { onClick: () => {
                                                resetNewAccountForm(assetsModalType);
                                                setShowNewAccountForm(true);
                                                setEditingBalanceAccount(null);
                                            }, className: `flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${assetsModalType === 'asset_fixed'
                                                ? 'bg-green-600 hover:bg-green-700 text-white'
                                                : 'bg-red-600 hover:bg-red-700 text-white'}`, children: [_jsx(Plus, { className: "w-4 h-4" }), "Agregar ", assetsModalType === 'asset_fixed' ? 'Activo Fijo' : 'Pasivo'] }) }), loadingAccounts ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-blue-600" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Cargando..." })] })) : balanceAccountsList.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx(Package, { className: "w-12 h-12 mx-auto mb-3 text-gray-300" }), _jsxs("p", { children: ["No hay ", assetsModalType === 'asset_fixed' ? 'activos fijos' : 'pasivos', " registrados"] }), _jsx("p", { className: "text-sm mt-1", children: "Haz clic en \"Agregar\" para crear uno nuevo" })] })) : (_jsx("div", { className: "space-y-3", children: balanceAccountsList.map((account) => (_jsx("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-500 font-mono", children: account.code }), _jsx("h4", { className: "font-medium text-gray-800", children: account.name })] }), account.description && (_jsx("p", { className: "text-sm text-gray-500 mt-1", children: account.description })), _jsxs("div", { className: "flex gap-4 mt-2 text-sm", children: [_jsx("span", { className: `font-semibold ${assetsModalType === 'asset_fixed' ? 'text-green-600' : 'text-red-600'}`, children: formatCurrency(account.balance) }), assetsModalType === 'asset_fixed' && account.original_value && (_jsxs("span", { className: "text-gray-500", children: ["Valor original: ", formatCurrency(account.original_value)] })), (assetsModalType === 'liability_current' || assetsModalType === 'liability_long') && account.creditor && (_jsxs("span", { className: "text-gray-500", children: ["Acreedor: ", account.creditor] })), account.due_date && (_jsxs("span", { className: "text-gray-500", children: ["Vence: ", formatDate(account.due_date)] }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => startEditBalanceAccount(account), className: "p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors", title: "Editar", children: _jsx(Pencil, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleDeleteBalanceAccount(account.id), className: "p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors", title: "Eliminar", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }) }, account.id))) }))] })) : (
                            /* New/Edit Account Form */
                            _jsxs("div", { className: "space-y-4", children: [_jsxs("h4", { className: "font-medium text-gray-700", children: [editingBalanceAccount ? 'Editar' : 'Nuevo', " ", getModalTitle(assetsModalType)] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", value: newAccountForm.name || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: assetsModalType === 'asset_fixed' ? 'Ej: Vehículo, Maquinaria, Equipo de cómputo' : 'Ej: Préstamo bancario, Deuda con proveedor X' })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripci\u00F3n" }), _jsx("textarea", { value: newAccountForm.description || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, description: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", rows: 2, placeholder: "Descripci\u00F3n adicional..." })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: [assetsModalType === 'asset_fixed' ? 'Valor Actual' : 'Monto de la Deuda', " *"] }), _jsx("input", { type: "number", value: newAccountForm.balance || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, balance: parseFloat(e.target.value) || 0 }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0" })] }), assetsModalType === 'asset_fixed' && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Valor Original" }), _jsx("input", { type: "number", value: newAccountForm.original_value || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, original_value: parseFloat(e.target.value) || null }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0", placeholder: "Costo de adquisici\u00F3n" })] })), (assetsModalType === 'liability_current' || assetsModalType === 'liability_long') && (_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Acreedor" }), _jsx("input", { type: "text", value: newAccountForm.creditor || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, creditor: e.target.value || null }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Banco X, Proveedor Y" })] }))] }), assetsModalType === 'asset_fixed' && (_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Depreciaci\u00F3n Acumulada" }), _jsx("input", { type: "number", value: newAccountForm.accumulated_depreciation || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, accumulated_depreciation: parseFloat(e.target.value) || null }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Vida \u00DAtil (a\u00F1os)" }), _jsx("input", { type: "number", value: newAccountForm.useful_life_years || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, useful_life_years: parseInt(e.target.value) || null }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "1" })] })] })), (assetsModalType === 'liability_current' || assetsModalType === 'liability_long') && (_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tasa de Inter\u00E9s (%)" }), _jsx("input", { type: "number", value: newAccountForm.interest_rate || '', onChange: (e) => setNewAccountForm({ ...newAccountForm, interest_rate: parseFloat(e.target.value) || null }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", min: "0", max: "100", step: "0.1" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Fecha de Vencimiento" }), _jsx(DatePicker, { value: newAccountForm.due_date || '', onChange: (value) => setNewAccountForm({ ...newAccountForm, due_date: value || null }) })] })] }))] })) }), _jsx("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: showNewAccountForm ? (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => {
                                            setShowNewAccountForm(false);
                                            setEditingBalanceAccount(null);
                                            resetNewAccountForm();
                                        }, className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: editingBalanceAccount ? handleUpdateBalanceAccountGlobal : handleCreateBalanceAccountGlobal, disabled: submitting || !newAccountForm.name, className: `px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${assetsModalType === 'asset_fixed'
                                            ? 'bg-green-600 hover:bg-green-700'
                                            : 'bg-red-600 hover:bg-red-700'}`, children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), editingBalanceAccount ? 'Guardar Cambios' : 'Crear'] })] })) : (_jsx("button", { onClick: () => {
                                    setShowAssetsModal(false);
                                    resetNewAccountForm();
                                }, className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cerrar" })) })] }) }))] }));
}
