/**
 * Accounting Page - Financial management, transactions, and expenses
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  Calculator, TrendingUp, TrendingDown, DollarSign, Plus,
  Loader2, AlertCircle, Receipt, X
} from 'lucide-react';
import { accountingService, getExpenseCategoryLabel, getExpenseCategoryColor, getPaymentMethodLabel } from '../services/accountingService';
import { useSchoolStore } from '../stores/schoolStore';
import { useUserRole } from '../hooks/useUserRole';
import type {
  AccountingDashboard, ExpenseListItem,
  ExpenseCreate, ExpenseCategory, AccPaymentMethod
} from '../types/api';

// Expense categories for the form
const EXPENSE_CATEGORIES: ExpenseCategory[] = [
  'rent', 'utilities', 'payroll', 'supplies', 'inventory',
  'transport', 'maintenance', 'marketing', 'taxes', 'bank_fees', 'other'
];

// Payment methods for the form
const PAYMENT_METHODS: AccPaymentMethod[] = ['cash', 'transfer', 'card', 'credit', 'other'];

export default function Accounting() {
  const { currentSchool } = useSchoolStore();
  const { canAccessAccounting, isSuperuser } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard data
  const [dashboard, setDashboard] = useState<AccountingDashboard | null>(null);
  const [pendingExpenses, setPendingExpenses] = useState<ExpenseListItem[]>([]);

  // Modal states
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseListItem | null>(null);

  // Form state
  const [expenseForm, setExpenseForm] = useState<Partial<ExpenseCreate>>({
    category: 'other',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    notes: ''
  });
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<AccPaymentMethod>('cash');
  const [submitting, setSubmitting] = useState(false);

  const schoolId = currentSchool?.id || '';

  useEffect(() => {
    if (schoolId && (canAccessAccounting || isSuperuser)) {
      loadData();
    }
  }, [schoolId, canAccessAccounting, isSuperuser]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardData, pendingData] = await Promise.all([
        accountingService.getAccountingDashboard(schoolId),
        accountingService.getPendingExpenses(schoolId)
      ]);

      setDashboard(dashboardData);
      setPendingExpenses(pendingData);
    } catch (err: any) {
      console.error('Error loading accounting data:', err);
      setError(err.response?.data?.detail || 'Error al cargar datos de contabilidad');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateExpense = async () => {
    if (!expenseForm.description || !expenseForm.amount || !expenseForm.expense_date) {
      return;
    }

    try {
      setSubmitting(true);
      await accountingService.createExpense(schoolId, expenseForm as Omit<ExpenseCreate, 'school_id'>);
      setShowExpenseModal(false);
      setExpenseForm({
        category: 'other',
        description: '',
        amount: 0,
        expense_date: new Date().toISOString().split('T')[0],
        vendor: '',
        notes: ''
      });
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

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString('es-CO')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO');
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
          <p className="text-gray-600 mt-1">Gestión financiera y control de gastos</p>
        </div>
        <button
          onClick={() => setShowExpenseModal(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nuevo Gasto
        </button>
      </div>

      {/* Summary Cards */}
      {dashboard && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Today's Income */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Ingresos Hoy</p>
                <p className="text-2xl font-bold text-green-600 mt-1">
                  {formatCurrency(dashboard.today_income)}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          {/* Today's Expenses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gastos Hoy</p>
                <p className="text-2xl font-bold text-red-600 mt-1">
                  {formatCurrency(dashboard.today_expenses)}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          {/* Monthly Net */}
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

          {/* Pending Expenses */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Gastos Pendientes</p>
                <p className="text-2xl font-bold text-orange-600 mt-1">
                  {formatCurrency(dashboard.pending_expenses_amount)}
                </p>
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
              <div className="px-6 py-8 text-center text-gray-500">
                No hay transacciones recientes
              </div>
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Gastos Pendientes de Pago</h3>
          </div>
          <div className="divide-y divide-gray-100">
            {pendingExpenses.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-500">
                No hay gastos pendientes
              </div>
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
                    placeholder="0"
                    min="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
                  <input
                    type="date"
                    value={expenseForm.expense_date || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, expense_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                    placeholder="Nombre del proveedor"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de vencimiento</label>
                  <input
                    type="date"
                    value={expenseForm.due_date || ''}
                    onChange={(e) => setExpenseForm({ ...expenseForm, due_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                  placeholder="Notas adicionales..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
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
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
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
    </Layout>
  );
}
