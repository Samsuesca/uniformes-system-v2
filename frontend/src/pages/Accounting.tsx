/**
 * Accounting Page - Financial management with Balance General, Receivables, and Payables
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  Calculator, TrendingUp, TrendingDown, DollarSign, Plus,
  Loader2, AlertCircle, Receipt, X, Building2, Users, Wallet,
  ChevronRight, ChevronDown, Landmark, CreditCard, Clock, CheckCircle
} from 'lucide-react';
import DatePicker, { formatDateSpanish } from '../components/DatePicker';
import {
  accountingService,
  getExpenseCategoryLabel,
  getExpenseCategoryColor,
  getPaymentMethodLabel
} from '../services/accountingService';
import { useSchoolStore } from '../stores/schoolStore';
import { useUserRole } from '../hooks/useUserRole';
import type {
  AccountingDashboard, ExpenseListItem,
  ExpenseCreate, ExpenseCategory, AccPaymentMethod,
  BalanceGeneralSummary, BalanceGeneralDetailed,
  ReceivablesPayablesSummary,
  BalanceAccountCreate, AccountType,
  AccountsReceivableCreate, AccountsReceivableListItem,
  AccountsPayableCreate, AccountsPayableListItem
} from '../types/api';

// Tabs
type TabType = 'dashboard' | 'balance' | 'receivables' | 'payables';

// Expense categories and payment methods
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'utilities', 'payroll', 'supplies', 'inventory',
  'transport', 'maintenance', 'marketing', 'taxes', 'bank_fees', 'other'
];

const PAYMENT_METHODS: AccPaymentMethod[] = ['cash', 'transfer', 'card', 'credit', 'other'];

export default function Accounting() {
  const { currentSchool } = useSchoolStore();
  const { canAccessAccounting, isSuperuser } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  // Dashboard data
  const [dashboard, setDashboard] = useState<AccountingDashboard | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<ExpenseListItem[]>([]);

  // Balance General data
  const [balanceSummary, setBalanceSummary] = useState<BalanceGeneralSummary | null>(null);
  const [balanceDetailed, setBalanceDetailed] = useState<BalanceGeneralDetailed | null>(null);
  const [receivablesPayables, setReceivablesPayables] = useState<ReceivablesPayablesSummary | null>(null);
  const [receivablesList, setReceivablesList] = useState<AccountsReceivableListItem[]>([]);
  const [payablesList, setPayablesList] = useState<AccountsPayableListItem[]>([]);

  // UI states
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    assets: true, liabilities: true, equity: true
  });

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showBalanceAccountModal, setShowBalanceAccountModal] = useState(false);
  const [showReceivableModal, setShowReceivableModal] = useState(false);
  const [showPayableModal, setShowPayableModal] = useState(false);
  const [showPayReceivableModal, setShowPayReceivableModal] = useState(false);
  const [showPayPayableModal, setShowPayPayableModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseListItem | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountsReceivableListItem | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayableListItem | null>(null);

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

  const schoolId = currentSchool?.id || '';

  useEffect(() => {
    if (schoolId && (canAccessAccounting || isSuperuser)) {
      loadData();
    }
  }, [schoolId, canAccessAccounting, isSuperuser, activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (activeTab === 'dashboard') {
        const [dashboardData, pendingData] = await Promise.all([
          accountingService.getAccountingDashboard(schoolId),
          accountingService.getPendingExpenses(schoolId)
        ]);
        setDashboard(dashboardData);
        setPendingExpenses(pendingData);
      } else if (activeTab === 'balance') {
        const [summary, detailed] = await Promise.all([
          accountingService.getBalanceGeneralSummary(schoolId),
          accountingService.getBalanceGeneralDetailed(schoolId)
        ]);
        setBalanceSummary(summary);
        setBalanceDetailed(detailed);
      } else if (activeTab === 'receivables' || activeTab === 'payables') {
        const [rpSummary, receivables, payables] = await Promise.all([
          accountingService.getReceivablesPayablesSummary(schoolId),
          accountingService.getAccountsReceivable(schoolId, { isPaid: false }),
          accountingService.getAccountsPayable(schoolId, { isPaid: false })
        ]);
        setReceivablesPayables(rpSummary);
        setReceivablesList(receivables);
        setPayablesList(payables);
      }
    } catch (err: any) {
      console.error('Error loading accounting data:', err);
      setError(err.response?.data?.detail || 'Error al cargar datos de contabilidad');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.expense_date) return;
    try {
      setSubmitting(true);
      await accountingService.createExpense(schoolId, expenseForm as Omit<ExpenseCreate, 'school_id'>);
      setShowExpenseModal(false);
      resetExpenseForm();
      await loadData();
    } catch (err: any) {
      console.error('Error creating expense:', err);
      setError(err.response?.data?.detail || 'Error al crear gasto');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayExpense = async () => {
    if (!selectedExpense || paymentAmount <= 0) return;
    try {
      setSubmitting(true);
      await accountingService.payExpense(schoolId, selectedExpense.id, {
        amount: paymentAmount,
        payment_method: paymentMethod
      });
      setShowPaymentModal(false);
      setSelectedExpense(null);
      setPaymentAmount(0);
      await loadData();
    } catch (err: any) {
      console.error('Error paying expense:', err);
      setError(err.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateBalanceAccount = async () => {
    if (!balanceAccountForm.name || !balanceAccountForm.account_type) return;
    try {
      setSubmitting(true);
      await accountingService.createBalanceAccount(schoolId, balanceAccountForm as BalanceAccountCreate);
      setShowBalanceAccountModal(false);
      resetBalanceAccountForm();
      await loadData();
    } catch (err: any) {
      console.error('Error creating balance account:', err);
      setError(err.response?.data?.detail || 'Error al crear cuenta');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateReceivable = async () => {
    if (!receivableForm.description || !receivableForm.amount) return;
    try {
      setSubmitting(true);
      await accountingService.createAccountReceivable(schoolId, receivableForm as AccountsReceivableCreate);
      setShowReceivableModal(false);
      resetReceivableForm();
      await loadData();
    } catch (err: any) {
      console.error('Error creating receivable:', err);
      setError(err.response?.data?.detail || 'Error al crear cuenta por cobrar');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayReceivable = async () => {
    if (!selectedReceivable || paymentAmount <= 0) return;
    try {
      setSubmitting(true);
      await accountingService.payAccountReceivable(schoolId, selectedReceivable.id, {
        amount: paymentAmount,
        payment_method: paymentMethod
      });
      setShowPayReceivableModal(false);
      setSelectedReceivable(null);
      setPaymentAmount(0);
      await loadData();
    } catch (err: any) {
      console.error('Error paying receivable:', err);
      setError(err.response?.data?.detail || 'Error al registrar cobro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreatePayable = async () => {
    if (!payableForm.vendor || !payableForm.description || !payableForm.amount) return;
    try {
      setSubmitting(true);
      await accountingService.createAccountPayable(schoolId, payableForm as AccountsPayableCreate);
      setShowPayableModal(false);
      resetPayableForm();
      await loadData();
    } catch (err: any) {
      console.error('Error creating payable:', err);
      setError(err.response?.data?.detail || 'Error al crear cuenta por pagar');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayPayable = async () => {
    if (!selectedPayable || paymentAmount <= 0) return;
    try {
      setSubmitting(true);
      await accountingService.payAccountPayable(schoolId, selectedPayable.id, {
        amount: paymentAmount,
        payment_method: paymentMethod
      });
      setShowPayPayableModal(false);
      setSelectedPayable(null);
      setPaymentAmount(0);
      await loadData();
    } catch (err: any) {
      console.error('Error paying payable:', err);
      setError(err.response?.data?.detail || 'Error al registrar pago');
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

  const formatCurrency = (amount: number) => `$${Number(amount).toLocaleString('es-CO')}`;
  const formatDate = (dateStr: string) => formatDateSpanish(dateStr);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
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
          { id: 'balance', label: 'Balance General', icon: Landmark },
          { id: 'receivables', label: 'Cuentas por Cobrar', icon: Users },
          { id: 'payables', label: 'Cuentas por Pagar', icon: Building2 }
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
      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(dashboard.today_income)}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gastos Hoy</p>
                <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(dashboard.today_expenses)}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Neto del Mes</p>
                <p className={`text-2xl font-bold mt-1 ${dashboard.month_net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(dashboard.month_net)}
                </p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${dashboard.month_net >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                <DollarSign className={`w-6 h-6 ${dashboard.month_net >= 0 ? 'text-green-600' : 'text-red-600'}`} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">{formatCurrency(dashboard.pending_expenses_amount)}</p>
                <p className="text-xs text-gray-400">{dashboard.pending_expenses} pendiente(s)</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                <Receipt className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Transacciones Recientes</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {dashboard?.recent_transactions.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">No hay transacciones recientes</div>
            ) : (
              dashboard?.recent_transactions.slice(0, 8).map((transaction) => (
                <div key={transaction.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        transaction.type === 'income' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {transaction.type === 'income' ? (
                          <TrendingUp className="w-5 h-5 text-green-600" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="ml-4">
                        <p className="text-sm font-medium text-gray-800">{transaction.description}</p>
                        <p className="text-xs text-gray-500">
                          {formatDate(transaction.transaction_date)} - {getPaymentMethodLabel(transaction.payment_method)}
                        </p>
                      </div>
                    </div>
                    <p className={`text-sm font-semibold ${
                      transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                    </p>
                  </div>
                </div>
              ))
            )}
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
                      <button
                        onClick={() => {
                          setSelectedExpense(expense);
                          setPaymentAmount(expense.balance);
                          setShowPaymentModal(true);
                        }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        Pagar
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Monthly Summary */}
      {dashboard && (
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Resumen del Mes</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(dashboard.month_income)}</p>
            </div>
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-gray-600 mb-1">Gastos del Mes</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(dashboard.month_expenses)}</p>
            </div>
            <div className={`text-center p-4 rounded-lg ${dashboard.month_net >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <p className="text-sm text-gray-600 mb-1">Utilidad Neta</p>
              <p className={`text-2xl font-bold ${dashboard.month_net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                {formatCurrency(dashboard.month_net)}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );

  // Render Balance General Tab
  const renderBalanceGeneral = () => (
    <>
      {/* Balance Summary Cards */}
      {balanceSummary && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-green-700">Activos</h3>
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(balanceSummary.total_assets)}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Corrientes</span>
                <span>{formatCurrency(balanceSummary.total_current_assets)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Fijos</span>
                <span>{formatCurrency(balanceSummary.total_fixed_assets)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Otros</span>
                <span>{formatCurrency(balanceSummary.total_other_assets)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-red-700">Pasivos</h3>
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(balanceSummary.total_liabilities)}</p>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Corrientes</span>
                <span>{formatCurrency(balanceSummary.total_current_liabilities)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Largo Plazo</span>
                <span>{formatCurrency(balanceSummary.total_long_liabilities)}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Otros</span>
                <span>{formatCurrency(balanceSummary.total_other_liabilities)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-blue-700">Patrimonio</h3>
              <Landmark className="w-6 h-6 text-blue-600" />
            </div>
            <p className="text-3xl font-bold text-blue-600">{formatCurrency(balanceSummary.total_equity)}</p>
          </div>
        </div>
      )}

      {/* Balance Equation Check */}
      {balanceSummary && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Ecuaci&oacute;n Contable</h3>
          <div className="flex items-center justify-center gap-4 text-lg">
            <div className="text-center">
              <p className="text-sm text-gray-500">Activos</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(balanceSummary.total_assets)}</p>
            </div>
            <span className="text-2xl text-gray-400">=</span>
            <div className="text-center">
              <p className="text-sm text-gray-500">Pasivos</p>
              <p className="text-2xl font-bold text-red-600">{formatCurrency(balanceSummary.total_liabilities)}</p>
            </div>
            <span className="text-2xl text-gray-400">+</span>
            <div className="text-center">
              <p className="text-sm text-gray-500">Patrimonio</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(balanceSummary.total_equity)}</p>
            </div>
          </div>
          <div className="text-center mt-4">
            {balanceSummary.is_balanced ? (
              <span className="text-green-600 flex items-center justify-center gap-2">
                <CheckCircle className="w-5 h-5" /> Balance cuadrado correctamente
              </span>
            ) : (
              <span className="text-red-600 flex items-center justify-center gap-2">
                <AlertCircle className="w-5 h-5" /> Diferencia detectada
              </span>
            )}
          </div>
        </div>
      )}

      {/* Detailed Balance Sections */}
      {balanceDetailed && (
        <div className="space-y-6">
          {/* Assets Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => toggleSection('assets')}
              className="w-full px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {expandedSections.assets ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <h3 className="text-lg font-semibold text-green-700">Activos</h3>
              </div>
              <span className="text-xl font-bold text-green-600">{formatCurrency(balanceDetailed.total_assets)}</span>
            </button>
            {expandedSections.assets && (
              <div className="p-6 space-y-6">
                {/* Current Assets */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{balanceDetailed.current_assets.account_type_label}</h4>
                    <span className="font-semibold text-green-600">{formatCurrency(balanceDetailed.current_assets.total)}</span>
                  </div>
                  {balanceDetailed.current_assets.accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceDetailed.current_assets.accounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{account.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Fixed Assets */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{balanceDetailed.fixed_assets.account_type_label}</h4>
                    <span className="font-semibold text-green-600">{formatCurrency(balanceDetailed.fixed_assets.total)}</span>
                  </div>
                  {balanceDetailed.fixed_assets.accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceDetailed.fixed_assets.accounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{account.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Other Assets */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{balanceDetailed.other_assets.account_type_label}</h4>
                    <span className="font-semibold text-green-600">{formatCurrency(balanceDetailed.other_assets.total)}</span>
                  </div>
                  {balanceDetailed.other_assets.accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceDetailed.other_assets.accounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{account.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Liabilities Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => toggleSection('liabilities')}
              className="w-full px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {expandedSections.liabilities ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <h3 className="text-lg font-semibold text-red-700">Pasivos</h3>
              </div>
              <span className="text-xl font-bold text-red-600">{formatCurrency(balanceDetailed.total_liabilities)}</span>
            </button>
            {expandedSections.liabilities && (
              <div className="p-6 space-y-6">
                {/* Current Liabilities */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{balanceDetailed.current_liabilities.account_type_label}</h4>
                    <span className="font-semibold text-red-600">{formatCurrency(balanceDetailed.current_liabilities.total)}</span>
                  </div>
                  {balanceDetailed.current_liabilities.accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceDetailed.current_liabilities.accounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{account.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Long-term Liabilities */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{balanceDetailed.long_liabilities.account_type_label}</h4>
                    <span className="font-semibold text-red-600">{formatCurrency(balanceDetailed.long_liabilities.total)}</span>
                  </div>
                  {balanceDetailed.long_liabilities.accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceDetailed.long_liabilities.accounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{account.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Other Liabilities */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium text-gray-700">{balanceDetailed.other_liabilities.account_type_label}</h4>
                    <span className="font-semibold text-red-600">{formatCurrency(balanceDetailed.other_liabilities.total)}</span>
                  </div>
                  {balanceDetailed.other_liabilities.accounts.length === 0 ? (
                    <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {balanceDetailed.other_liabilities.accounts.map(account => (
                        <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                          <span className="text-sm text-gray-700">{account.name}</span>
                          <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Equity Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <button
              onClick={() => toggleSection('equity')}
              className="w-full px-6 py-4 border-b border-gray-200 flex items-center justify-between hover:bg-gray-50"
            >
              <div className="flex items-center gap-3">
                {expandedSections.equity ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                <h3 className="text-lg font-semibold text-blue-700">Patrimonio</h3>
              </div>
              <span className="text-xl font-bold text-blue-600">{formatCurrency(balanceDetailed.total_equity)}</span>
            </button>
            {expandedSections.equity && (
              <div className="p-6 space-y-6">
                {balanceDetailed.equity.map((equityGroup) => (
                  <div key={equityGroup.account_type}>
                    <div className="flex justify-between items-center mb-3">
                      <h4 className="font-medium text-gray-700">{equityGroup.account_type_label}</h4>
                      <span className="font-semibold text-blue-600">{formatCurrency(equityGroup.total)}</span>
                    </div>
                    {equityGroup.accounts.length === 0 ? (
                      <p className="text-gray-400 text-sm">Sin cuentas registradas</p>
                    ) : (
                      <div className="space-y-2">
                        {equityGroup.accounts.map(account => (
                          <div key={account.id} className="flex justify-between items-center py-2 px-3 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{account.name}</span>
                            <span className="text-sm font-medium">{formatCurrency(account.net_value)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Empty state message */}
      {!balanceDetailed && !loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <Landmark className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">Sin cuentas de balance</h3>
          <p className="text-gray-500 mb-6">Comienza agregando activos, pasivos o patrimonio para visualizar tu balance general.</p>
          <button
            onClick={() => setShowBalanceAccountModal(true)}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            Agregar Cuenta
          </button>
        </div>
      )}
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
    if (activeTab === 'balance') {
      return (
        <button
          onClick={() => setShowBalanceAccountModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nueva Cuenta
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
      {activeTab === 'balance' && renderBalanceGeneral()}
      {activeTab === 'receivables' && renderReceivables()}
      {activeTab === 'payables' && renderPayables()}

      {/* ===================== MODALS ===================== */}

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
                  <input
                    type="number"
                    value={expenseForm.amount || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="0"
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
              <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
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
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                  max={selectedExpense.balance}
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
              <button onClick={() => setShowPaymentModal(false)} className="px-4 py-2 text-gray-600 hover:text-gray-800">
                Cancelar
              </button>
              <button
                onClick={handlePayExpense}
                disabled={submitting || paymentAmount <= 0 || paymentAmount > selectedExpense.balance}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Registrar Pago
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
    </Layout>
  );
}
