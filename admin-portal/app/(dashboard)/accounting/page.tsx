'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  RefreshCw,
  DollarSign,
  CreditCard,
  Wallet,
  Building2,
  Receipt,
  CheckCircle,
  Clock,
  Filter,
} from 'lucide-react';
import accountingService, {
  Expense,
  ExpenseCreate,
  ExpenseCategory,
  PaymentMethod,
  CashBalances,
  EXPENSE_CATEGORY_LABELS,
} from '@/lib/services/accountingService';

const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'rent', label: 'Arriendo' },
  { value: 'utilities', label: 'Servicios' },
  { value: 'payroll', label: 'Nómina' },
  { value: 'supplies', label: 'Suministros' },
  { value: 'inventory', label: 'Inventario' },
  { value: 'transport', label: 'Transporte' },
  { value: 'maintenance', label: 'Mantenimiento' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'taxes', label: 'Impuestos' },
  { value: 'bank_fees', label: 'Comisiones Bancarias' },
  { value: 'other', label: 'Otros' },
];

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'nequi', label: 'Nequi' },
  { value: 'transfer', label: 'Transferencia' },
  { value: 'card', label: 'Tarjeta' },
];

export default function AccountingPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [cashBalances, setCashBalances] = useState<CashBalances | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterCategory, setFilterCategory] = useState<ExpenseCategory | ''>('');
  const [filterPaid, setFilterPaid] = useState<boolean | ''>('');

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [formData, setFormData] = useState<ExpenseCreate>({
    category: 'other',
    description: '',
    amount: 0,
    expense_date: new Date().toISOString().split('T')[0],
    vendor: '',
    receipt_number: '',
    is_recurring: false,
    notes: '',
  });
  const [paymentData, setPaymentData] = useState({
    amount: 0,
    payment_method: 'cash' as PaymentMethod,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [expensesData, balancesData] = await Promise.all([
        accountingService.listExpenses({
          category: filterCategory || undefined,
          is_paid: filterPaid === '' ? undefined : filterPaid,
          limit: 200,
        }),
        accountingService.getCashBalances(),
      ]);

      setExpenses(expensesData);
      setCashBalances(balancesData);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterCategory, filterPaid]);

  const openCreateModal = () => {
    setFormData({
      category: 'other',
      description: '',
      amount: 0,
      expense_date: new Date().toISOString().split('T')[0],
      vendor: '',
      receipt_number: '',
      is_recurring: false,
      notes: '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const openPayModal = (expense: Expense) => {
    setSelectedExpense(expense);
    setPaymentData({
      amount: expense.balance,
      payment_method: 'cash',
    });
    setFormError(null);
    setShowPayModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      await accountingService.createExpense(formData);
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpense) return;

    setFormError(null);
    setSaving(true);

    try {
      await accountingService.payExpense(selectedExpense.id, paymentData);
      setShowPayModal(false);
      setSelectedExpense(null);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al registrar pago');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate totals
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalPaid = expenses.reduce((sum, e) => sum + e.amount_paid, 0);
  const totalPending = expenses.reduce((sum, e) => sum + e.balance, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Contabilidad
          </h1>
          <p className="text-slate-600 mt-1">
            Gestión de gastos del negocio
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button
            onClick={openCreateModal}
            className="btn-primary flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo Gasto
          </button>
        </div>
      </div>

      {/* Cash Balances Cards */}
      {cashBalances && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Wallet className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Caja Menor</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(cashBalances.caja_menor?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Caja Mayor</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(cashBalances.caja_mayor?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Nequi</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(cashBalances.nequi?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500">Banco</p>
                <p className="text-lg font-bold text-slate-900">
                  {formatCurrency(cashBalances.banco?.balance || 0)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 rounded-lg">
              <Receipt className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Gastos</p>
              <p className="text-xl font-bold text-slate-900">
                {formatCurrency(totalExpenses)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pagado</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(totalPaid)}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Pendiente</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(totalPending)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-600">Filtros:</span>
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value as ExpenseCategory | '')}
          className="admin-input w-auto"
        >
          <option value="">Todas las categorías</option>
          {EXPENSE_CATEGORIES.map((cat) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
        <select
          value={filterPaid === '' ? '' : filterPaid.toString()}
          onChange={(e) => setFilterPaid(e.target.value === '' ? '' : e.target.value === 'true')}
          className="admin-input w-auto"
        >
          <option value="">Todos los estados</option>
          <option value="false">Pendientes</option>
          <option value="true">Pagados</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Proveedor</th>
                <th className="text-right">Monto</th>
                <th className="text-right">Pagado</th>
                <th className="text-right">Pendiente</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-brand-500"></div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-8 text-slate-500">
                    <Receipt className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    No hay gastos registrados
                  </td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td className="text-sm">{formatDate(expense.expense_date)}</td>
                    <td>
                      <span className="badge badge-info">
                        {EXPENSE_CATEGORY_LABELS[expense.category] || expense.category}
                      </span>
                    </td>
                    <td className="font-medium max-w-xs truncate">
                      {expense.description}
                    </td>
                    <td className="text-slate-600">{expense.vendor || '-'}</td>
                    <td className="text-right font-mono">
                      {formatCurrency(expense.amount)}
                    </td>
                    <td className="text-right font-mono text-green-600">
                      {formatCurrency(expense.amount_paid)}
                    </td>
                    <td className="text-right font-mono text-orange-600">
                      {formatCurrency(expense.balance)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          expense.is_paid ? 'badge-success' : 'badge-warning'
                        }`}
                      >
                        {expense.is_paid ? 'Pagado' : 'Pendiente'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        {!expense.is_paid && (
                          <button
                            onClick={() => openPayModal(expense)}
                            className="px-3 py-1 text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                          >
                            Pagar
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              Nuevo Gasto
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Categoría *</label>
                  <select
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    className="admin-input"
                    required
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="admin-label">Fecha *</label>
                  <input
                    type="date"
                    value={formData.expense_date}
                    onChange={(e) =>
                      setFormData({ ...formData, expense_date: e.target.value })
                    }
                    className="admin-input"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Descripción *</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="admin-input"
                  required
                  placeholder="Descripción del gasto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Monto (COP) *</label>
                  <input
                    type="number"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    className="admin-input"
                    required
                    min={0}
                    step={100}
                  />
                </div>
                <div>
                  <label className="admin-label">Proveedor</label>
                  <input
                    type="text"
                    value={formData.vendor}
                    onChange={(e) =>
                      setFormData({ ...formData, vendor: e.target.value })
                    }
                    className="admin-input"
                    placeholder="Nombre del proveedor"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formData.due_date || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, due_date: e.target.value || undefined })
                    }
                    className="admin-input"
                  />
                </div>
                <div>
                  <label className="admin-label">Número de Recibo</label>
                  <input
                    type="text"
                    value={formData.receipt_number}
                    onChange={(e) =>
                      setFormData({ ...formData, receipt_number: e.target.value })
                    }
                    className="admin-input"
                    placeholder="Ej: 12345"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Notas</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="admin-input"
                  rows={2}
                  placeholder="Notas adicionales..."
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_recurring}
                  onChange={(e) =>
                    setFormData({ ...formData, is_recurring: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
                />
                <span className="text-sm text-slate-600">Gasto recurrente</span>
              </label>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Guardando...' : 'Crear Gasto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pay Expense Modal */}
      {showPayModal && selectedExpense && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              Registrar Pago
            </h2>
            <p className="text-slate-600 mb-6">
              {selectedExpense.description}
            </p>

            <div className="p-4 bg-slate-50 rounded-lg mb-6">
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Monto total:</span>
                <span className="font-bold">{formatCurrency(selectedExpense.amount)}</span>
              </div>
              <div className="flex justify-between mb-2">
                <span className="text-slate-600">Ya pagado:</span>
                <span className="text-green-600">{formatCurrency(selectedExpense.amount_paid)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-200 pt-2">
                <span className="text-slate-600">Pendiente:</span>
                <span className="font-bold text-orange-600">{formatCurrency(selectedExpense.balance)}</span>
              </div>
            </div>

            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className="admin-label">Monto a Pagar *</label>
                <input
                  type="number"
                  value={paymentData.amount}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="admin-input"
                  required
                  min={0}
                  max={selectedExpense.balance}
                  step={100}
                />
              </div>

              <div>
                <label className="admin-label">Método de Pago *</label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) =>
                    setPaymentData({ ...paymentData, payment_method: e.target.value as PaymentMethod })
                  }
                  className="admin-input"
                  required
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method.value} value={method.value}>
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowPayModal(false);
                    setSelectedExpense(null);
                  }}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Procesando...' : 'Registrar Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
