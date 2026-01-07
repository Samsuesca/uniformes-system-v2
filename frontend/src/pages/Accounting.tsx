/**
 * Accounting Page - Financial management with Balance General, Receivables, and Payables
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  Calculator, TrendingUp, TrendingDown, DollarSign, Plus,
  Loader2, AlertCircle, Receipt, X, Building2, Users, Wallet,
  Landmark, CreditCard, Clock, PiggyBank, Pencil,
  Settings, Trash2, Car, Package
} from 'lucide-react';
import DatePicker, { formatDateSpanish } from '../components/DatePicker';
import CurrencyInput from '../components/CurrencyInput';
import {
  getExpenseCategoryLabel,
  getExpenseCategoryColor,
  getPaymentMethodLabel,
  type CashBalancesResponse
} from '../services/accountingService';
import {
  globalAccountingService,
  type GlobalPatrimonySummary,
  type GlobalBalanceAccountCreate,
  type GlobalBalanceAccountResponse
} from '../services/globalAccountingService';
import { useSchoolStore } from '../stores/schoolStore';
import { useUserRole } from '../hooks/useUserRole';
import type {
  ExpenseListItem,
  ExpenseCreate, ExpenseCategory, AccPaymentMethod,
  ReceivablesPayablesSummary,
  BalanceAccountCreate, AccountType,
  AccountsReceivableCreate, AccountsReceivableListItem,
  AccountsPayableCreate, AccountsPayableListItem
} from '../types/api';

// Tabs
type TabType = 'dashboard' | 'receivables' | 'payables' | 'patrimony';

// Balance Account Modal Type - uses lowercase values to match backend enum (asset_fixed, liability_current, liability_long)
type BalanceAccountModalType = 'asset_fixed' | 'liability_current' | 'liability_long';

// Global Dashboard Summary (simplified for global accounting)
interface GlobalDashboardSummary {
  total_expenses: number;
  cash_balance: number;
  expenses_pending: number;
  expenses_paid: number;
  transaction_count: number;
}

// Expense categories and payment methods
// Helper to extract error message from API response
const getErrorMessage = (err: any, defaultMsg: string): string => {
  const detail = err.response?.data?.detail;
  if (!detail) return defaultMsg;
  if (typeof detail === 'string') return detail;
  // FastAPI validation errors are arrays of objects
  if (Array.isArray(detail)) {
    return detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
  }
  // If it's an object with a message property
  if (typeof detail === 'object' && detail.msg) return detail.msg;
  if (typeof detail === 'object' && detail.message) return detail.message;
  return defaultMsg;
};

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'utilities', 'payroll', 'supplies', 'inventory',
  'transport', 'maintenance', 'marketing', 'taxes', 'bank_fees', 'other'
];

const PAYMENT_METHODS: AccPaymentMethod[] = ['cash', 'nequi', 'transfer', 'card', 'credit', 'other'];

export default function Accounting() {
  // Note: School store available for future filtering in reports
  useSchoolStore(); // Keep subscription active for navbar
  const { canAccessAccounting, isSuperuser } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Dashboard data
  const [dashboard, setDashboard] = useState<GlobalDashboardSummary | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<ExpenseListItem[]>([]);

  // Receivables/Payables data
  const [receivablesPayables, setReceivablesPayables] = useState<ReceivablesPayablesSummary | null>(null);
  const [receivablesList, setReceivablesList] = useState<AccountsReceivableListItem[]>([]);
  const [payablesList, setPayablesList] = useState<AccountsPayableListItem[]>([]);

  // Cash balances (Caja/Banco)
  const [cashBalances, setCashBalances] = useState<CashBalancesResponse | null>(null);

  // Global Patrimony data
  const [patrimony, setPatrimony] = useState<GlobalPatrimonySummary | null>(null);


  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showBalanceAccountModal, setShowBalanceAccountModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showPayReceivableModal, setShowPayReceivableModal] = useState(false);
  const [showPayPayableModal, setShowPayPayableModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseListItem | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountsReceivableListItem | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayableListItem | null>(null);
  const [showEditBalanceModal, setShowEditBalanceModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<'caja_menor' | 'caja_mayor' | 'nequi' | 'banco' | null>(null);
  const [newBalanceValue, setNewBalanceValue] = useState<number>(0);

  // Edit Expense states
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseListItem | null>(null);

  // Expense History Modal states
  const [showExpenseHistoryModal, setShowExpenseHistoryModal] = useState(false);
  const [expenseHistoryFilter, setExpenseHistoryFilter] = useState<'all' | 'pending' | 'paid'>('all');
  const [allExpenses, setAllExpenses] = useState<ExpenseListItem[]>([]);

  // Cash Fallback Modal states (when Caja Menor doesn't have enough funds)
  const [showCashFallbackModal, setShowCashFallbackModal] = useState(false);
  const [pendingPaymentData, setPendingPaymentData] = useState<{
    expense: ExpenseListItem;
    amount: number;
    sourceBalance: number;
    fallbackBalance: number;
  } | null>(null);

  // Fixed Assets / Liabilities Management Modal states
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [assetsModalType, setAssetsModalType] = useState<BalanceAccountModalType>('asset_fixed');
  const [balanceAccountsList, setBalanceAccountsList] = useState<GlobalBalanceAccountResponse[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [showNewAccountForm, setShowNewAccountForm] = useState(false);
  const [editingBalanceAccount, setEditingBalanceAccount] = useState<GlobalBalanceAccountResponse | null>(null);
  const [newAccountForm, setNewAccountForm] = useState<Partial<GlobalBalanceAccountCreate>>({
    account_type: 'asset_fixed' as AccountType,
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
  const [expenseForm, setExpenseForm] = useState<Partial<ExpenseCreate>>({
    category: 'other',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: ''
  });

  const [balanceAccountForm, setBalanceAccountForm] = useState<Partial<BalanceAccountCreate>>({
    account_type: 'asset_current',
    name: '',
    description: '',
    balance: 0
  });

  const [receivableForm, setReceivableForm] = useState<Partial<AccountsReceivableCreate>>({
    description: '',
    amount: 0,
    invoice_date: new Date().toISOString().split('T')[0]
  });

  const [payableForm, setPayableForm] = useState<Partial<AccountsPayableCreate>>({
    vendor: '',
    description: '',
    amount: 0,
    invoice_date: new Date().toISOString().split('T')[0]
  });

  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<AccPaymentMethod>('cash');
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
        const expensesData = await globalAccountingService.getGlobalExpenses();
        setAllExpenses(expensesData); // Store all expenses for history modal
        const totalExpenses = expensesData.reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const paidExpensesAmount = expensesData
          .filter(e => e.is_paid)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);
        const pendingExpensesAmount = pendingData.reduce(
          (sum, e) => sum + (Number(e.amount || 0) - Number(e.amount_paid || 0)), 0
        );

        setDashboard({
          total_expenses: totalExpenses,
          cash_balance: cashData.total_liquid,
          expenses_pending: pendingExpensesAmount,
          expenses_paid: paidExpensesAmount,
          transaction_count: expensesData.length
        });
      } else if (activeTab === 'receivables' || activeTab === 'payables') {
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
      } else if (activeTab === 'patrimony') {
        // Load global patrimony summary (business-wide)
        const patrimonyData = await globalAccountingService.getGlobalPatrimonySummary();
        setPatrimony(patrimonyData);
      }
    } catch (err: any) {
      console.error('Error loading accounting data:', err);
      setError(getErrorMessage(err, 'Error al cargar datos de contabilidad'));
    } finally {
      setLoading(false);
    }
  };

  // Open expense history modal with filter
  const openExpenseHistory = (filter: 'all' | 'pending' | 'paid') => {
    setExpenseHistoryFilter(filter);
    setShowExpenseHistoryModal(true);
  };

  // Get filtered expenses for history modal
  const getFilteredExpenses = () => {
    switch (expenseHistoryFilter) {
      case 'pending':
        return allExpenses.filter(e => !e.is_paid);
      case 'paid':
        return allExpenses.filter(e => e.is_paid);
      default:
        return allExpenses;
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.expense_date) return;
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
    } catch (err: any) {
      console.error('Error creating expense:', err);
      setError(getErrorMessage(err, 'Error al crear gasto'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayExpense = async (useFallback: boolean = false) => {
    if (!selectedExpense || paymentAmount <= 0) return;
    try {
      setSubmitting(true);
      setModalError(null);

      // For cash payments, check balance first (unless using fallback)
      if (paymentMethod === 'cash' && !useFallback) {
        const balanceCheck = await globalAccountingService.checkExpenseBalance(paymentAmount, paymentMethod);

        if (!balanceCheck.can_pay) {
          // Not enough in Caja Menor - check if fallback available
          if (balanceCheck.fallback_available) {
            // Show fallback modal
            setPendingPaymentData({
              expense: selectedExpense,
              amount: paymentAmount,
              sourceBalance: balanceCheck.source_balance,
              fallbackBalance: balanceCheck.fallback_balance || 0
            });
            setShowPaymentModal(false);
            setShowCashFallbackModal(true);
            setSubmitting(false);
            return;
          } else {
            // Neither Caja Menor nor Caja Mayor have enough
            setModalError(
              `Fondos insuficientes. Caja Menor: ${formatCurrency(balanceCheck.source_balance)}, ` +
              `Caja Mayor: ${formatCurrency(balanceCheck.fallback_balance || 0)}. ` +
              `Requerido: ${formatCurrency(paymentAmount)}`
            );
            setSubmitting(false);
            return;
          }
        }
      }

      // Proceed with payment
      await globalAccountingService.payGlobalExpense(selectedExpense.id, {
        amount: paymentAmount,
        payment_method: paymentMethod,
        use_fallback: useFallback
      });
      setShowPaymentModal(false);
      setSelectedExpense(null);
      setPaymentAmount(0);
      setModalError(null);
      await loadData();
    } catch (err: any) {
      console.error('Error paying expense:', err);
      setModalError(getErrorMessage(err, 'Error al registrar pago'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle payment from Caja Mayor (fallback)
  const handlePayExpenseFromCajaMayor = async () => {
    if (!pendingPaymentData) return;
    try {
      setSubmitting(true);
      setSelectedExpense(pendingPaymentData.expense);
      setPaymentAmount(pendingPaymentData.amount);

      await globalAccountingService.payGlobalExpense(pendingPaymentData.expense.id, {
        amount: pendingPaymentData.amount,
        payment_method: 'cash',
        use_fallback: true
      });

      setShowCashFallbackModal(false);
      setPendingPaymentData(null);
      setSelectedExpense(null);
      setPaymentAmount(0);
      await loadData();
    } catch (err: any) {
      console.error('Error paying expense from Caja Mayor:', err);
      setModalError(getErrorMessage(err, 'Error al pagar desde Caja Mayor'));
    } finally {
      setSubmitting(false);
    }
  };

  // Handle opening edit expense modal
  const handleOpenEditExpense = (expense: ExpenseListItem) => {
    // Check if expense has partial payments
    if (expense.amount_paid > 0) {
      setModalError('No se puede editar un gasto con pagos parciales');
      return;
    }
    setEditingExpense(expense);
    setExpenseForm({
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      expense_date: expense.expense_date,
      vendor: expense.vendor || '',
      notes: expense.notes || '',
      due_date: expense.due_date || undefined
    });
    setShowEditExpenseModal(true);
  };

  // Handle updating expense
  const handleUpdateExpense = async () => {
    if (!editingExpense || !expenseForm.description || !expenseForm.amount) return;
    try {
      setSubmitting(true);
      setModalError(null);
      await globalAccountingService.updateGlobalExpense(editingExpense.id, {
        category: expenseForm.category,
        description: expenseForm.description,
        amount: expenseForm.amount,
        expense_date: expenseForm.expense_date,
        vendor: expenseForm.vendor,
        notes: expenseForm.notes,
        due_date: expenseForm.due_date
      });
      setShowEditExpenseModal(false);
      setEditingExpense(null);
      resetExpenseForm();
      await loadData();
    } catch (err: any) {
      console.error('Error updating expense:', err);
      setModalError(getErrorMessage(err, 'Error al actualizar gasto'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBalanceAccount = async () => {
    if (!balanceAccountForm.name || !balanceAccountForm.account_type) return;
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
    } catch (err: any) {
      console.error('Error creating balance account:', err);
      setError(getErrorMessage(err, 'Error al crear cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReceivable = async () => {
    if (!receivableForm.description || !receivableForm.amount || !receivableForm.invoice_date) return;
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
    } catch (err: any) {
      console.error('Error creating receivable:', err);
      setError(getErrorMessage(err, 'Error al crear cuenta por cobrar'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayReceivable = async () => {
    if (!selectedReceivable || paymentAmount <= 0) return;
    try {
      setSubmitting(true);
      // Use global accounting service for payment
      await globalAccountingService.payGlobalReceivable(selectedReceivable.id, {
        amount: paymentAmount,
        payment_method: paymentMethod as 'cash' | 'transfer' | 'card'
      });
      setShowPayReceivableModal(false);
      setSelectedReceivable(null);
      setPaymentAmount(0);
      await loadData();
    } catch (err: any) {
      console.error('Error paying receivable:', err);
      setError(getErrorMessage(err, 'Error al registrar cobro'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayable = async () => {
    if (!payableForm.vendor || !payableForm.description || !payableForm.amount || !payableForm.invoice_date) return;
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
    } catch (err: any) {
      console.error('Error creating payable:', err);
      setError(getErrorMessage(err, 'Error al crear cuenta por pagar'));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPayable = async () => {
    if (!selectedPayable || paymentAmount <= 0) return;
    try {
      setSubmitting(true);
      // Use global accounting service for payment
      await globalAccountingService.payGlobalPayable(selectedPayable.id, {
        amount: paymentAmount,
        payment_method: paymentMethod as 'cash' | 'transfer' | 'card'
      });
      setShowPayPayableModal(false);
      setSelectedPayable(null);
      setPaymentAmount(0);
      await loadData();
    } catch (err: any) {
      console.error('Error paying payable:', err);
      setError(getErrorMessage(err, 'Error al registrar pago'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditBalance = (account: 'caja_menor' | 'caja_mayor' | 'nequi' | 'banco') => {
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

  const getAccountCode = (account: 'caja_menor' | 'caja_mayor' | 'nequi' | 'banco'): string => {
    const codes: Record<string, string> = {
      caja_menor: '1101',
      caja_mayor: '1102',
      nequi: '1103',
      banco: '1104'
    };
    return codes[account] || '1101';
  };

  const getAccountLabel = (account: 'caja_menor' | 'caja_mayor' | 'nequi' | 'banco'): string => {
    const labels: Record<string, string> = {
      caja_menor: 'Caja Menor',
      caja_mayor: 'Caja Mayor',
      nequi: 'Nequi',
      banco: 'Banco'
    };
    return labels[account] || account;
  };

  const handleSaveBalance = async () => {
    if (!editingAccount) return;
    try {
      setSubmitting(true);
      const accountCode = getAccountCode(editingAccount);
      await globalAccountingService.setGlobalAccountBalance(
        accountCode,
        newBalanceValue,
        `Ajuste manual de ${getAccountLabel(editingAccount)}`
      );
      setShowEditBalanceModal(false);
      setEditingAccount(null);
      await loadData();
    } catch (err: any) {
      console.error('Error updating balance:', err);
      setError(getErrorMessage(err, 'Error al actualizar balance'));
    } finally {
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

  const formatCurrency = (amount: number | string | null | undefined) => {
    const num = Number(amount ?? 0);
    return `$${isNaN(num) ? 0 : num.toLocaleString('es-CO')}`;
  };
  const formatDate = (dateStr: string) => formatDateSpanish(dateStr);


  // ============================================
  // Balance Accounts (Fixed Assets / Liabilities) Management
  // ============================================

  const getModalTitle = (type: BalanceAccountModalType) => {
    switch (type) {
      case 'asset_fixed': return 'Activos Fijos';
      case 'liability_current': return 'Pasivos Corrientes';
      case 'liability_long': return 'Pasivos a Largo Plazo';
    }
  };

  const openAssetsModal = async (type: BalanceAccountModalType) => {
    setAssetsModalType(type);
    setShowAssetsModal(true);
    setShowNewAccountForm(false);
    setEditingBalanceAccount(null);
    await loadBalanceAccounts(type);
  };

  const loadBalanceAccounts = async (type: BalanceAccountModalType) => {
    try {
      setLoadingAccounts(true);
      const accounts = await globalAccountingService.getGlobalBalanceAccounts(type as AccountType, true);
      setBalanceAccountsList(accounts as any);
    } catch (err) {
      console.error('Error loading balance accounts:', err);
      setError(getErrorMessage(err, 'Error al cargar cuentas'));
    } finally {
      setLoadingAccounts(false);
    }
  };

  const resetNewAccountForm = (type?: BalanceAccountModalType) => {
    setNewAccountForm({
      account_type: (type || assetsModalType) as AccountType,
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
    if (!newAccountForm.name) return;
    try {
      setSubmitting(true);
      await globalAccountingService.createGlobalBalanceAccount({
        ...newAccountForm,
        account_type: assetsModalType
      } as GlobalBalanceAccountCreate);
      setShowNewAccountForm(false);
      resetNewAccountForm();
      await loadBalanceAccounts(assetsModalType);
      await loadData(); // Refresh patrimony
    } catch (err: any) {
      console.error('Error creating balance account:', err);
      setError(getErrorMessage(err, 'Error al crear cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateBalanceAccountGlobal = async () => {
    if (!editingBalanceAccount) return;
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
    } catch (err: any) {
      console.error('Error updating balance account:', err);
      setError(getErrorMessage(err, 'Error al actualizar cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteBalanceAccount = async (accountId: string) => {
    if (!confirm('¿Está seguro de eliminar esta cuenta? Esta acción no se puede deshacer.')) return;
    try {
      setSubmitting(true);
      await globalAccountingService.deleteGlobalBalanceAccount(accountId);
      await loadBalanceAccounts(assetsModalType);
      await loadData(); // Refresh patrimony
    } catch (err: any) {
      console.error('Error deleting balance account:', err);
      setError(getErrorMessage(err, 'Error al eliminar cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  const startEditBalanceAccount = (account: GlobalBalanceAccountResponse) => {
    setEditingBalanceAccount(account);
    setNewAccountForm({
      account_type: account.account_type as any,
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
    return (
      <Layout>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center">
            <AlertCircle className="w-6 h-6 text-yellow-600 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Acceso Restringido</h3>
              <p className="mt-1 text-sm text-yellow-700">
                No tienes permisos para acceder a la contabilidad. Contacta al administrador.
              </p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Render Tab Navigation
  const renderTabs = () => (
    <div className="border-b border-gray-200 mb-6">
      <nav className="-mb-px flex space-x-8">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: Calculator },
          { id: 'receivables', label: 'Cuentas por Cobrar', icon: Users },
          { id: 'payables', label: 'Cuentas por Pagar', icon: Building2 },
          { id: 'patrimony', label: 'Patrimonio', icon: PiggyBank }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );

  // Render Dashboard Tab
  const renderDashboard = () => (
    <>
      {/* Summary Cards - Global accounting overview */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Liquidez Total</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(dashboard.cash_balance)}</p>
                <p className="text-xs text-gray-400">Caja + Banco</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <Wallet className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <button
            onClick={() => openExpenseHistory('all')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-red-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gastos Totales</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(dashboard.total_expenses)}</p>
                <p className="text-xs text-gray-400">{dashboard.transaction_count} registro(s) - Click para ver</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </button>

          <button
            onClick={() => openExpenseHistory('pending')}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-left hover:shadow-md hover:border-orange-300 transition-all cursor-pointer"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(dashboard.expenses_pending)}</p>
                <p className="text-xs text-gray-400">Por pagar - Click para ver</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </button>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Balance Neto</p>
                <p className={`text-2xl font-bold mt-1 ${dashboard.cash_balance - dashboard.expenses_pending >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboard.cash_balance - dashboard.expenses_pending)}
                </p>
                <p className="text-xs text-gray-400">Liquidez - Pendientes</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dashboard.cash_balance - dashboard.expenses_pending >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <DollarSign className={`w-6 h-6 ${dashboard.cash_balance - dashboard.expenses_pending >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Balances - 3 Cards: Cash (Efectivo), Banco (Digital), Total */}
      {cashBalances && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-600" />
            Saldos Actuales
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* CASH (Efectivo) = Caja Menor + Caja Mayor */}
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl border border-emerald-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-emerald-700 flex items-center gap-2">
                    <Wallet className="w-4 h-4" />
                    Efectivo (Cash)
                  </p>
                  <p className="text-2xl font-bold text-emerald-800 mt-1">
                    {formatCurrency((cashBalances.caja_menor?.balance || 0) + (cashBalances.caja_mayor?.balance || 0))}
                  </p>
                </div>
                <div className="w-10 h-10 bg-emerald-200 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-700" />
                </div>
              </div>
              {/* Subcuentas */}
              <div className="border-t border-emerald-200 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600">Caja Menor</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-emerald-700">
                      {formatCurrency(cashBalances.caja_menor?.balance || 0)}
                    </span>
                    <button
                      onClick={() => handleEditBalance('caja_menor')}
                      className="text-emerald-500 hover:text-emerald-700 p-1"
                      title="Editar Caja Menor"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-emerald-600">Caja Mayor</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-emerald-700">
                      {formatCurrency(cashBalances.caja_mayor?.balance || 0)}
                    </span>
                    <button
                      onClick={() => handleEditBalance('caja_mayor')}
                      className="text-emerald-500 hover:text-emerald-700 p-1"
                      title="Editar Caja Mayor"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* BANCO (Digital) = Nequi + Banco */}
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl border border-blue-200 p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                    <Landmark className="w-4 h-4" />
                    Banco (Digital)
                  </p>
                  <p className="text-2xl font-bold text-blue-800 mt-1">
                    {formatCurrency((cashBalances.nequi?.balance || 0) + (cashBalances.banco?.balance || 0))}
                  </p>
                </div>
                <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-blue-700" />
                </div>
              </div>
              {/* Subcuentas */}
              <div className="border-t border-blue-200 pt-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600">Nequi</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-700">
                      {formatCurrency(cashBalances.nequi?.balance || 0)}
                    </span>
                    <button
                      onClick={() => handleEditBalance('nequi')}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      title="Editar Nequi"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-blue-600">Cuenta Bancaria</span>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-blue-700">
                      {formatCurrency(cashBalances.banco?.balance || 0)}
                    </span>
                    <button
                      onClick={() => handleEditBalance('banco')}
                      className="text-blue-500 hover:text-blue-700 p-1"
                      title="Editar Banco"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Total Líquido */}
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-purple-700 flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Total Líquido
                  </p>
                  <p className="text-2xl font-bold text-purple-800 mt-1">
                    {formatCurrency(cashBalances.total_liquid)}
                  </p>
                </div>
                <div className="w-10 h-10 bg-purple-200 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-purple-700" />
                </div>
              </div>
              {/* Desglose */}
              <div className="border-t border-purple-200 pt-3 mt-3 space-y-1 text-sm">
                <div className="flex justify-between text-purple-600">
                  <span>Efectivo</span>
                  <span>{formatCurrency((cashBalances.caja_menor?.balance || 0) + (cashBalances.caja_mayor?.balance || 0))}</span>
                </div>
                <div className="flex justify-between text-purple-600">
                  <span>Digital</span>
                  <span>{formatCurrency((cashBalances.nequi?.balance || 0) + (cashBalances.banco?.balance || 0))}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        {/* Quick Stats Card */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Resumen Global</h3>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Total de Gastos Registrados</span>
                <span className="font-semibold text-gray-800">{dashboard?.transaction_count || 0}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-100">
                <span className="text-gray-600">Gastos Pagados</span>
                <span className="font-semibold text-green-600">{formatCurrency(dashboard?.expenses_paid || 0)}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-gray-600">Gastos Por Pagar</span>
                <span className="font-semibold text-orange-600">{formatCurrency(dashboard?.expenses_pending || 0)}</span>
              </div>
            </div>
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                💡 <strong>Tip:</strong> Usa la pestaña "Patrimonio" para ver el balance general completo del negocio incluyendo activos, pasivos e inventario.
              </p>
            </div>
          </div>
        </div>

        {/* Pending Expenses */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Gastos Pendientes</h3>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Nuevo
            </button>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingExpenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No hay gastos pendientes</div>
            ) : (
              pendingExpenses.slice(0, 8).map((expense) => (
                <div key={expense.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getExpenseCategoryColor(expense.category)}`}>
                        {getExpenseCategoryLabel(expense.category)}
                      </span>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">{expense.description}</p>
                        <p className="text-xs text-gray-500">
                          {expense.vendor && `${expense.vendor} - `}
                          Vence: {expense.due_date ? formatDate(expense.due_date) : 'Sin fecha'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-red-600">{formatCurrency(expense.balance)}</p>
                      <div className="flex items-center justify-end gap-2 mt-1">
                        {expense.amount_paid === 0 && (
                          <button
                            onClick={() => handleOpenEditExpense(expense)}
                            className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-blue-50 transition"
                            title="Editar gasto"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedExpense(expense);
                            setPaymentAmount(expense.balance);
                            setShowPaymentModal(true);
                          }}
                          className="text-xs text-green-600 hover:text-green-800 flex items-center gap-1 px-2 py-1 rounded hover:bg-green-50 transition"
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          Pagar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Note: Monthly reports available in the Reports page (coming soon) */}
    </>
  );

  // Render Accounts Receivable Tab
  const renderReceivables = () => (
    <>
      {/* Summary Cards */}
      {receivablesPayables && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total por Cobrar</p>
                <p className="text-2xl font-bold text-blue-600 mt-1">{formatCurrency(receivablesPayables.total_receivables)}</p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(receivablesPayables.receivables_pending)}</p>
                <p className="text-xs text-gray-400">{receivablesPayables.receivables_count} cuenta(s)</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Vencidas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(receivablesPayables.receivables_overdue)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Posici&oacute;n Neta</p>
                <p className={`text-2xl font-bold mt-1 ${receivablesPayables.net_position >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(receivablesPayables.net_position)}
                </p>
                <p className="text-xs text-gray-400">Por cobrar - Por pagar</p>
              </div>
              <DollarSign className={`w-8 h-8 ${receivablesPayables.net_position >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Receivables List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Cuentas por Cobrar</h3>
          <button
            onClick={() => setShowReceivableModal(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {receivablesList.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No hay cuentas por cobrar pendientes</p>
            </div>
          ) : (
            receivablesList.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      item.is_paid ? 'bg-green-500' : item.is_overdue ? 'bg-red-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-800">{item.description}</p>
                      <p className="text-sm text-gray-500">
                        {item.client_name || 'Sin cliente'}
                        {item.due_date && ` - Vence: ${formatDate(item.due_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(item.amount)}</p>
                      {item.amount_paid > 0 && (
                        <p className="text-xs text-gray-500">Pagado: {formatCurrency(item.amount_paid)}</p>
                      )}
                      {item.balance > 0 && (
                        <p className="text-sm font-medium text-blue-600">Saldo: {formatCurrency(item.balance)}</p>
                      )}
                    </div>
                    {!item.is_paid && (
                      <button
                        onClick={() => {
                          setSelectedReceivable(item);
                          setPaymentAmount(item.balance);
                          setShowPayReceivableModal(true);
                        }}
                        className="px-3 py-1 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200 transition-colors"
                      >
                        Cobrar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  // Render Accounts Payable Tab
  const renderPayables = () => (
    <>
      {/* Summary Cards */}
      {receivablesPayables && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total por Pagar</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(receivablesPayables.total_payables)}</p>
              </div>
              <Building2 className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(receivablesPayables.payables_pending)}</p>
                <p className="text-xs text-gray-400">{receivablesPayables.payables_count} cuenta(s)</p>
              </div>
              <Clock className="w-8 h-8 text-orange-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Vencidas</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(receivablesPayables.payables_overdue)}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Posici&oacute;n Neta</p>
                <p className={`text-2xl font-bold mt-1 ${receivablesPayables.net_position >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(receivablesPayables.net_position)}
                </p>
                <p className="text-xs text-gray-400">Por cobrar - Por pagar</p>
              </div>
              <DollarSign className={`w-8 h-8 ${receivablesPayables.net_position >= 0 ? 'text-green-400' : 'text-red-400'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Payables List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Cuentas por Pagar</h3>
          <button
            onClick={() => setShowPayableModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            Nueva Cuenta
          </button>
        </div>
        <div className="divide-y divide-gray-100">
          {payablesList.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No hay cuentas por pagar pendientes</p>
            </div>
          ) : (
            payablesList.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-3 h-3 rounded-full ${
                      item.is_paid ? 'bg-green-500' : item.is_overdue ? 'bg-red-500' : 'bg-orange-500'
                    }`} />
                    <div>
                      <p className="font-medium text-gray-800">{item.description}</p>
                      <p className="text-sm text-gray-500">
                        {item.vendor}
                        {item.invoice_number && ` - Fact: ${item.invoice_number}`}
                        {item.due_date && ` - Vence: ${formatDate(item.due_date)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-gray-800">{formatCurrency(item.amount)}</p>
                      {item.amount_paid > 0 && (
                        <p className="text-xs text-gray-500">Pagado: {formatCurrency(item.amount_paid)}</p>
                      )}
                      {item.balance > 0 && (
                        <p className="text-sm font-medium text-red-600">Saldo: {formatCurrency(item.balance)}</p>
                      )}
                    </div>
                    {!item.is_paid && (
                      <button
                        onClick={() => {
                          setSelectedPayable(item);
                          setPaymentAmount(item.balance);
                          setShowPayPayableModal(true);
                        }}
                        className="px-3 py-1 bg-red-100 text-red-700 rounded-lg text-sm hover:bg-red-200 transition-colors"
                      >
                        Pagar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );

  // Render Patrimony Tab
  const renderPatrimony = () => (
    <>
      {patrimony ? (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Patrimonio Neto</p>
                <p className="text-4xl font-bold mt-1">{formatCurrency(patrimony.net_patrimony)}</p>
                <p className="text-blue-100 text-sm mt-2">
                  Activos - Pasivos = Patrimonio
                </p>
              </div>
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <PiggyBank className="w-8 h-8" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Assets Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Activos</h3>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(patrimony.assets.total)}</p>
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Caja</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.assets.caja)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Banco</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.assets.banco)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Total Líquido</span>
                  </div>
                  <span className="font-medium text-blue-600">{formatCurrency(patrimony.assets.total_liquid)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Inventario</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.assets.inventory || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Cuentas por Cobrar</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.assets.receivables || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 bg-blue-50 -mx-2 px-2 rounded">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-4 h-4 text-blue-600" />
                    <span className="text-blue-700 font-medium">Activos Corrientes</span>
                  </div>
                  <span className="font-bold text-blue-700">{formatCurrency(patrimony.assets.current_assets || 0)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 group">
                  <div className="flex items-center gap-2">
                    <Car className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Activos Fijos</span>
                    <button
                      onClick={() => openAssetsModal('asset_fixed')}
                      className="text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Gestionar
                    </button>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.assets.fixed_assets)}</span>
                </div>
                <div className="flex justify-between items-center py-2">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Otros Activos</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.assets.other_assets)}</span>
                </div>
              </div>
            </div>

            {/* Liabilities Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">Pasivos</h3>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(patrimony.liabilities.total)}</p>
                </div>
              </div>
              <div className="space-y-3 border-t pt-4">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Cuentas por Pagar Pendientes</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.liabilities.pending_payables)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Gastos Pendientes</span>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.liabilities.pending_expenses)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100 group">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Pasivos Corrientes</span>
                    <button
                      onClick={() => openAssetsModal('liability_current')}
                      className="text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Gestionar
                    </button>
                  </div>
                  <span className="font-medium text-orange-600">{formatCurrency(patrimony.liabilities.current)}</span>
                </div>
                <div className="flex justify-between items-center py-2 group">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-600">Pasivos Largo Plazo</span>
                    <button
                      onClick={() => openAssetsModal('liability_long')}
                      className="text-xs text-blue-500 hover:text-blue-700 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                    >
                      <Settings className="w-3 h-3" />
                      Gestionar
                    </button>
                  </div>
                  <span className="font-medium text-gray-800">{formatCurrency(patrimony.liabilities.long_term)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Equation Card */}
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-6">
            <h4 className="text-sm font-medium text-gray-500 mb-4">Ecuación Patrimonial</h4>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="text-center">
                <p className="text-sm text-gray-500">Activos</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(patrimony.assets.total)}</p>
              </div>
              <span className="text-2xl text-gray-400">−</span>
              <div className="text-center">
                <p className="text-sm text-gray-500">Pasivos</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(patrimony.liabilities.total)}</p>
              </div>
              <span className="text-2xl text-gray-400">=</span>
              <div className="text-center">
                <p className="text-sm text-gray-500">Patrimonio</p>
                <p className="text-xl font-bold text-blue-600">{formatCurrency(patrimony.net_patrimony)}</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando patrimonio...</span>
        </div>
      )}
    </>
  );

  // Render action button based on current tab
  const renderActionButton = () => {
    if (activeTab === 'dashboard') {
      return (
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Gasto
        </button>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando contabilidad...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadData}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <Calculator className="w-8 h-8 mr-3 text-blue-600" />
            Contabilidad
          </h1>
          <p className="text-gray-600 mt-1">Gesti&oacute;n financiera y balance general</p>
        </div>
        {renderActionButton()}
      </div>

      {/* Tab Navigation */}
      {renderTabs()}

      {/* Tab Content */}
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'receivables' && renderReceivables()}
      {activeTab === 'payables' && renderPayables()}
      {activeTab === 'patrimony' && renderPatrimony()}

      {/* ===================== MODALS ===================== */}

      {/* Edit Balance Modal */}
      {showEditBalanceModal && editingAccount && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                Editar Balance de {getAccountLabel(editingAccount)}
              </h3>
              <button
                onClick={() => {
                  setShowEditBalanceModal(false);
                  setEditingAccount(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Balance Actual
                </label>
                <p className="text-lg font-semibold text-gray-800">
                  {formatCurrency(
                    editingAccount === 'caja_menor' ? (cashBalances?.caja_menor?.balance || 0) :
                    editingAccount === 'caja_mayor' ? (cashBalances?.caja_mayor?.balance || 0) :
                    editingAccount === 'nequi' ? (cashBalances?.nequi?.balance || 0) :
                    (cashBalances?.banco?.balance || 0)
                  )}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nuevo Balance
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={newBalanceValue === 0 ? '' : newBalanceValue}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9.]/g, '');
                    setNewBalanceValue(val === '' ? 0 : parseFloat(val));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ingrese el nuevo balance"
                />
              </div>
              <p className="text-sm text-gray-500">
                Este ajuste quedará registrado en el historial de la cuenta.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => {
                  setShowEditBalanceModal(false);
                  setEditingAccount(null);
                }}
                className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveBalance}
                disabled={submitting}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Nuevo Gasto</h3>
              <button onClick={() => setShowExpenseModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categor&iacute;a</label>
                <select
                  value={expenseForm.category || 'other'}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{getExpenseCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripci&oacute;n *</label>
                <input
                  type="text"
                  value={expenseForm.description || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Pago de arriendo local"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <CurrencyInput
                    value={expenseForm.amount || 0}
                    onChange={(value) => setExpenseForm({ ...expenseForm, amount: value })}
                    min={0}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <DatePicker
                    value={expenseForm.expense_date || ''}
                    onChange={(value) => setExpenseForm({ ...expenseForm, expense_date: value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={expenseForm.vendor || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <DatePicker
                    value={expenseForm.due_date || ''}
                    onChange={(value) => setExpenseForm({ ...expenseForm, due_date: value })}
                    minDate={expenseForm.expense_date}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={expenseForm.notes || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowExpenseModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleCreateExpense}
                disabled={submitting || !expenseForm.description || !expenseForm.amount}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Gasto
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Expense Modal */}
      {showPaymentModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Registrar Pago</h3>
              <button onClick={() => { setShowPaymentModal(false); setModalError(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Gasto:</p>
                <p className="font-medium">{selectedExpense.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Pendiente: <span className="font-medium text-red-600">{formatCurrency(selectedExpense.balance)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
                <CurrencyInput
                  value={paymentAmount}
                  onChange={setPaymentAmount}
                  max={Number(selectedExpense.balance)}
                  placeholder="$0"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as AccPaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                  ))}
                </select>
              </div>
              {/* Error Message */}
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm text-red-700">{modalError}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => { setShowPaymentModal(false); setModalError(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={() => handlePayExpense(false)}
                disabled={submitting || paymentAmount <= 0 || paymentAmount > Number(selectedExpense.balance)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Expense Modal */}
      {showEditExpenseModal && editingExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Editar Gasto</h3>
              <button onClick={() => { setShowEditExpenseModal(false); setEditingExpense(null); setModalError(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                <select
                  value={expenseForm.category || 'other'}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as ExpenseCategory })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{getExpenseCategoryLabel(cat)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripción *</label>
                <input
                  type="text"
                  value={expenseForm.description || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <CurrencyInput
                    value={expenseForm.amount || 0}
                    onChange={(value) => setExpenseForm({ ...expenseForm, amount: value })}
                    min={0}
                    placeholder="$0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <DatePicker
                    value={expenseForm.expense_date || ''}
                    onChange={(value) => setExpenseForm({ ...expenseForm, expense_date: value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
                  <input
                    type="text"
                    value={expenseForm.vendor || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, vendor: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <DatePicker
                    value={expenseForm.due_date || ''}
                    onChange={(value) => setExpenseForm({ ...expenseForm, due_date: value })}
                    minDate={expenseForm.expense_date}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={expenseForm.notes || ''}
                  onChange={(e) => setExpenseForm({ ...expenseForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
              {modalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-red-700">{modalError}</p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => { setShowEditExpenseModal(false); setEditingExpense(null); setModalError(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleUpdateExpense}
                disabled={submitting || !expenseForm.description || !expenseForm.amount}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense History Modal */}
      {showExpenseHistoryModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-600" />
                Historial de Gastos
                <span className="text-sm font-normal text-gray-500">
                  ({expenseHistoryFilter === 'all' ? 'Todos' : expenseHistoryFilter === 'pending' ? 'Pendientes' : 'Pagados'})
                </span>
              </h3>
              <button onClick={() => setShowExpenseHistoryModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter tabs */}
            <div className="px-6 py-3 border-b bg-gray-50 flex gap-2">
              {(['all', 'pending', 'paid'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setExpenseHistoryFilter(filter)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                    expenseHistoryFilter === filter
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {filter === 'all' ? 'Todos' : filter === 'pending' ? 'Pendientes' : 'Pagados'}
                </button>
              ))}
            </div>

            {/* Expenses list */}
            <div className="flex-1 overflow-y-auto p-6">
              {getFilteredExpenses().length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No hay gastos {expenseHistoryFilter === 'pending' ? 'pendientes' : expenseHistoryFilter === 'paid' ? 'pagados' : ''}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {getFilteredExpenses().map((expense) => (
                    <div
                      key={expense.id}
                      className={`border rounded-lg p-4 ${
                        expense.is_paid ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-0.5 text-xs font-medium rounded ${getExpenseCategoryColor(expense.category)}`}
                            >
                              {getExpenseCategoryLabel(expense.category)}
                            </span>
                            {expense.is_paid ? (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-green-100 text-green-700">
                                Pagado
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 text-xs font-medium rounded bg-orange-100 text-orange-700">
                                Pendiente
                              </span>
                            )}
                          </div>
                          <p className="font-medium text-gray-900">{expense.description}</p>
                          <p className="text-sm text-gray-500">
                            {expense.vendor && `${expense.vendor} • `}
                            {formatDateSpanish(expense.expense_date)}
                            {expense.due_date && ` • Vence: ${formatDateSpanish(expense.due_date)}`}
                          </p>
                        </div>
                        <div className="text-right ml-4">
                          <p className="text-lg font-bold text-gray-900">{formatCurrency(expense.amount)}</p>
                          {!expense.is_paid && expense.amount_paid > 0 && (
                            <p className="text-sm text-gray-500">
                              Pagado: {formatCurrency(expense.amount_paid)}
                            </p>
                          )}
                          {!expense.is_paid && (
                            <p className="text-sm font-medium text-red-600">
                              Pendiente: {formatCurrency(expense.balance)}
                            </p>
                          )}
                          {/* Edit button for expenses without payments */}
                          {expense.amount_paid === 0 && (
                            <button
                              onClick={() => {
                                setShowExpenseHistoryModal(false);
                                handleOpenEditExpense(expense);
                              }}
                              className="mt-2 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 ml-auto"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Summary footer */}
            <div className="px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">
                  Total ({getFilteredExpenses().length} gastos):
                </span>
                <span className="text-xl font-bold text-gray-900">
                  {formatCurrency(getFilteredExpenses().reduce((sum, e) => sum + Number(e.amount), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cash Fallback Modal (Caja Menor insufficient, use Caja Mayor?) */}
      {showCashFallbackModal && pendingPaymentData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-orange-600">Fondos Insuficientes</h3>
              <button onClick={() => { setShowCashFallbackModal(false); setPendingPaymentData(null); }} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-orange-50 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-2">Gasto a pagar:</p>
                <p className="font-medium">{pendingPaymentData.expense.description}</p>
                <p className="text-lg font-bold text-orange-600 mt-2">{formatCurrency(pendingPaymentData.amount)}</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Caja Menor</p>
                    <p className="text-xs text-gray-500">Saldo insuficiente</p>
                  </div>
                  <p className="font-semibold text-red-600">{formatCurrency(pendingPaymentData.sourceBalance)}</p>
                </div>

                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Caja Mayor</p>
                    <p className="text-xs text-gray-500">Disponible</p>
                  </div>
                  <p className="font-semibold text-green-600">{formatCurrency(pendingPaymentData.fallbackBalance)}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600 text-center">
                ¿Deseas pagar este gasto desde <strong>Caja Mayor</strong>?
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => { setShowCashFallbackModal(false); setPendingPaymentData(null); }} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handlePayExpenseFromCajaMayor}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Usar Caja Mayor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Balance Account Modal */}
      {showBalanceAccountModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Nueva Cuenta de Balance</h3>
              <button onClick={() => setShowBalanceAccountModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Cuenta *</label>
                <select
                  value={balanceAccountForm.account_type || 'asset_current'}
                  onChange={(e) => setBalanceAccountForm({ ...balanceAccountForm, account_type: e.target.value as AccountType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <optgroup label="Activos">
                    <option value="asset_current">Activo Corriente</option>
                    <option value="asset_fixed">Activo Fijo</option>
                    <option value="asset_other">Otros Activos</option>
                  </optgroup>
                  <optgroup label="Pasivos">
                    <option value="liability_current">Pasivo Corriente</option>
                    <option value="liability_long">Pasivo a Largo Plazo</option>
                    <option value="liability_other">Otros Pasivos</option>
                  </optgroup>
                  <optgroup label="Patrimonio">
                    <option value="equity_capital">Capital</option>
                    <option value="equity_retained">Utilidades Retenidas</option>
                    <option value="equity_other">Otro Patrimonio</option>
                  </optgroup>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  value={balanceAccountForm.name || ''}
                  onChange={(e) => setBalanceAccountForm({ ...balanceAccountForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Caja, Banco, Veh&iacute;culo, Pr&eacute;stamo Bancario..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Saldo Inicial *</label>
                  <input
                    type="number"
                    value={balanceAccountForm.balance || ''}
                    onChange={(e) => setBalanceAccountForm({ ...balanceAccountForm, balance: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">C&oacute;digo (opcional)</label>
                  <input
                    type="text"
                    value={balanceAccountForm.code || ''}
                    onChange={(e) => setBalanceAccountForm({ ...balanceAccountForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: 1101"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripci&oacute;n</label>
                <textarea
                  value={balanceAccountForm.description || ''}
                  onChange={(e) => setBalanceAccountForm({ ...balanceAccountForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                  placeholder="Descripci&oacute;n opcional de la cuenta..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowBalanceAccountModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleCreateBalanceAccount}
                disabled={submitting || !balanceAccountForm.name}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Receivable Modal */}
      {showReceivableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Nueva Cuenta por Cobrar</h3>
              <button onClick={() => setShowReceivableModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripci&oacute;n *</label>
                <input
                  type="text"
                  value={receivableForm.description || ''}
                  onChange={(e) => setReceivableForm({ ...receivableForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Venta a cr&eacute;dito a Juan P&eacute;rez"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    value={receivableForm.amount || ''}
                    onChange={(e) => setReceivableForm({ ...receivableForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha factura *</label>
                  <DatePicker
                    value={receivableForm.invoice_date || ''}
                    onChange={(value) => setReceivableForm({ ...receivableForm, invoice_date: value })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                <DatePicker
                  value={receivableForm.due_date || ''}
                  onChange={(value) => setReceivableForm({ ...receivableForm, due_date: value })}
                  minDate={receivableForm.invoice_date}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={receivableForm.notes || ''}
                  onChange={(e) => setReceivableForm({ ...receivableForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowReceivableModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleCreateReceivable}
                disabled={submitting || !receivableForm.description || !receivableForm.amount}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Receivable Modal */}
      {showPayReceivableModal && selectedReceivable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Registrar Cobro</h3>
              <button onClick={() => setShowPayReceivableModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Cuenta por Cobrar:</p>
                <p className="font-medium">{selectedReceivable.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Pendiente: <span className="font-medium text-blue-600">{formatCurrency(selectedReceivable.balance)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a cobrar</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  max={selectedReceivable.balance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">M&eacute;todo de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as AccPaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowPayReceivableModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handlePayReceivable}
                disabled={submitting || paymentAmount <= 0 || paymentAmount > selectedReceivable.balance}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Cobro
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Payable Modal */}
      {showPayableModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Nueva Cuenta por Pagar</h3>
              <button onClick={() => setShowPayableModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor *</label>
                <input
                  type="text"
                  value={payableForm.vendor || ''}
                  onChange={(e) => setPayableForm({ ...payableForm, vendor: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descripci&oacute;n *</label>
                <input
                  type="text"
                  value={payableForm.description || ''}
                  onChange={(e) => setPayableForm({ ...payableForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Compra de tela para uniformes"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
                  <input
                    type="number"
                    value={payableForm.amount || ''}
                    onChange={(e) => setPayableForm({ ...payableForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N&uacute;mero Factura</label>
                  <input
                    type="text"
                    value={payableForm.invoice_number || ''}
                    onChange={(e) => setPayableForm({ ...payableForm, invoice_number: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha factura *</label>
                  <DatePicker
                    value={payableForm.invoice_date || ''}
                    onChange={(value) => setPayableForm({ ...payableForm, invoice_date: value })}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha vencimiento</label>
                  <DatePicker
                    value={payableForm.due_date || ''}
                    onChange={(value) => setPayableForm({ ...payableForm, due_date: value })}
                    minDate={payableForm.invoice_date}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Categor&iacute;a</label>
                <input
                  type="text"
                  value={payableForm.category || ''}
                  onChange={(e) => setPayableForm({ ...payableForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Materia prima, Servicios, etc."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
                <textarea
                  value={payableForm.notes || ''}
                  onChange={(e) => setPayableForm({ ...payableForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowPayableModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handleCreatePayable}
                disabled={submitting || !payableForm.vendor || !payableForm.description || !payableForm.amount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Crear Cuenta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay Payable Modal */}
      {showPayPayableModal && selectedPayable && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">Registrar Pago</h3>
              <button onClick={() => setShowPayPayableModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-red-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Cuenta por Pagar:</p>
                <p className="font-medium">{selectedPayable.description}</p>
                <p className="text-sm text-gray-500">Proveedor: {selectedPayable.vendor}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Pendiente: <span className="font-medium text-red-600">{formatCurrency(selectedPayable.balance)}</span>
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monto a pagar</label>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  max={selectedPayable.balance}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">M&eacute;todo de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as AccPaymentMethod)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>{getPaymentMethodLabel(method)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button onClick={() => setShowPayPayableModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handlePayPayable}
                disabled={submitting || paymentAmount <= 0 || paymentAmount > selectedPayable.balance}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Pago
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Balance Accounts Management Modal (Fixed Assets / Liabilities) */}
      {showAssetsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                {assetsModalType === 'asset_fixed' && <Car className="w-5 h-5 text-green-600" />}
                {assetsModalType === 'liability_current' && <Clock className="w-5 h-5 text-orange-600" />}
                {assetsModalType === 'liability_long' && <CreditCard className="w-5 h-5 text-red-600" />}
                {getModalTitle(assetsModalType)}
              </h3>
              <button
                onClick={() => {
                  setShowAssetsModal(false);
                  setShowNewAccountForm(false);
                  setEditingBalanceAccount(null);
                  resetNewAccountForm();
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {!showNewAccountForm ? (
                <>
                  {/* Add Button */}
                  <div className="mb-4">
                    <button
                      onClick={() => {
                        resetNewAccountForm(assetsModalType);
                        setShowNewAccountForm(true);
                        setEditingBalanceAccount(null);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                        assetsModalType === 'asset_fixed'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'bg-red-600 hover:bg-red-700 text-white'
                      }`}
                    >
                      <Plus className="w-4 h-4" />
                      Agregar {assetsModalType === 'asset_fixed' ? 'Activo Fijo' : 'Pasivo'}
                    </button>
                  </div>

                  {/* Accounts List */}
                  {loadingAccounts ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                      <span className="ml-2 text-gray-600">Cargando...</span>
                    </div>
                  ) : balanceAccountsList.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No hay {assetsModalType === 'asset_fixed' ? 'activos fijos' : 'pasivos'} registrados</p>
                      <p className="text-sm mt-1">Haz clic en "Agregar" para crear uno nuevo</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {balanceAccountsList.map((account) => (
                        <div
                          key={account.id}
                          className="bg-gray-50 rounded-lg p-4 border border-gray-200 hover:border-gray-300 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500 font-mono">{account.code}</span>
                                <h4 className="font-medium text-gray-800">{account.name}</h4>
                              </div>
                              {account.description && (
                                <p className="text-sm text-gray-500 mt-1">{account.description}</p>
                              )}
                              <div className="flex gap-4 mt-2 text-sm">
                                <span className={`font-semibold ${
                                  assetsModalType === 'asset_fixed' ? 'text-green-600' : 'text-red-600'
                                }`}>
                                  {formatCurrency(account.balance)}
                                </span>
                                {assetsModalType === 'asset_fixed' && account.original_value && (
                                  <span className="text-gray-500">
                                    Valor original: {formatCurrency(account.original_value)}
                                  </span>
                                )}
                                {(assetsModalType === 'liability_current' || assetsModalType === 'liability_long') && account.creditor && (
                                  <span className="text-gray-500">
                                    Acreedor: {account.creditor}
                                  </span>
                                )}
                                {account.due_date && (
                                  <span className="text-gray-500">
                                    Vence: {formatDate(account.due_date)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => startEditBalanceAccount(account)}
                                className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="Editar"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBalanceAccount(account.id)}
                                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                /* New/Edit Account Form */
                <div className="space-y-4">
                  <h4 className="font-medium text-gray-700">
                    {editingBalanceAccount ? 'Editar' : 'Nuevo'} {getModalTitle(assetsModalType)}
                  </h4>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                    <input
                      type="text"
                      value={newAccountForm.name || ''}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder={assetsModalType === 'asset_fixed' ? 'Ej: Vehículo, Maquinaria, Equipo de cómputo' : 'Ej: Préstamo bancario, Deuda con proveedor X'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <textarea
                      value={newAccountForm.description || ''}
                      onChange={(e) => setNewAccountForm({ ...newAccountForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={2}
                      placeholder="Descripción adicional..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {assetsModalType === 'asset_fixed' ? 'Valor Actual' : 'Monto de la Deuda'} *
                      </label>
                      <input
                        type="number"
                        value={newAccountForm.balance || ''}
                        onChange={(e) => setNewAccountForm({ ...newAccountForm, balance: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        min="0"
                      />
                    </div>

                    {assetsModalType === 'asset_fixed' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Valor Original</label>
                        <input
                          type="number"
                          value={newAccountForm.original_value || ''}
                          onChange={(e) => setNewAccountForm({ ...newAccountForm, original_value: parseFloat(e.target.value) || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          placeholder="Costo de adquisición"
                        />
                      </div>
                    )}

                    {(assetsModalType === 'liability_current' || assetsModalType === 'liability_long') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Acreedor</label>
                        <input
                          type="text"
                          value={newAccountForm.creditor || ''}
                          onChange={(e) => setNewAccountForm({ ...newAccountForm, creditor: e.target.value || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ej: Banco X, Proveedor Y"
                        />
                      </div>
                    )}
                  </div>

                  {assetsModalType === 'asset_fixed' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Depreciación Acumulada</label>
                        <input
                          type="number"
                          value={newAccountForm.accumulated_depreciation || ''}
                          onChange={(e) => setNewAccountForm({ ...newAccountForm, accumulated_depreciation: parseFloat(e.target.value) || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vida Útil (años)</label>
                        <input
                          type="number"
                          value={newAccountForm.useful_life_years || ''}
                          onChange={(e) => setNewAccountForm({ ...newAccountForm, useful_life_years: parseInt(e.target.value) || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="1"
                        />
                      </div>
                    </div>
                  )}

                  {(assetsModalType === 'liability_current' || assetsModalType === 'liability_long') && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Tasa de Interés (%)</label>
                        <input
                          type="number"
                          value={newAccountForm.interest_rate || ''}
                          onChange={(e) => setNewAccountForm({ ...newAccountForm, interest_rate: parseFloat(e.target.value) || null })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          min="0"
                          max="100"
                          step="0.1"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento</label>
                        <DatePicker
                          value={newAccountForm.due_date || ''}
                          onChange={(value) => setNewAccountForm({ ...newAccountForm, due_date: value || null })}
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              {showNewAccountForm ? (
                <>
                  <button
                    onClick={() => {
                      setShowNewAccountForm(false);
                      setEditingBalanceAccount(null);
                      resetNewAccountForm();
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={editingBalanceAccount ? handleUpdateBalanceAccountGlobal : handleCreateBalanceAccountGlobal}
                    disabled={submitting || !newAccountForm.name}
                    className={`px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 ${
                      assetsModalType === 'asset_fixed'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                    {editingBalanceAccount ? 'Guardar Cambios' : 'Crear'}
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setShowAssetsModal(false);
                    resetNewAccountForm();
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cerrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
