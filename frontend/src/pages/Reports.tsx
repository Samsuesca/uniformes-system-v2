/**
 * Reports Page - Business analytics and reporting
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  BarChart3, TrendingUp, Package, Users, AlertTriangle, DollarSign,
  Loader2, AlertCircle, ShoppingBag, RefreshCw, Calendar, Filter,
  ArrowUpRight, ArrowDownRight, Wallet, Receipt, PieChart, ScrollText,
  Scissors, Clock, CheckCircle
} from 'lucide-react';
import DatePicker from '../components/DatePicker';
import { reportsService, type DashboardSummary, type TopProduct, type LowStockProduct, type TopClient, type SalesSummary, type DateFilters } from '../services/reportsService';
import { useSchoolStore } from '../stores/schoolStore';
import { globalAccountingService } from '../services/globalAccountingService';
import { alterationService } from '../services/alterationService';
import type { AlterationsSummary, AlterationListItem } from '../types/api';
import { ALTERATION_TYPE_LABELS, ALTERATION_STATUS_LABELS, ALTERATION_STATUS_COLORS } from '../types/api';

// Tab type
type ReportTab = 'sales' | 'financial' | 'movements' | 'alterations';

// Transaction types
interface TransactionItem {
  id: string;
  type: 'income' | 'expense' | 'transfer';
  amount: number;
  payment_method: string;
  description: string;
  category: string | null;
  reference_code: string | null;
  transaction_date: string;
  created_at: string;
  school_id: string | null;
  school_name: string | null;
}

interface ExpenseCategory {
  category: string;
  category_label: string;
  total_amount: number;
  paid_amount: number;
  pending_amount: number;
  count: number;
  percentage: number;
}

interface CashFlowPeriod {
  period: string;
  period_label: string;
  income: number;
  expenses: number;
  net: number;
}

interface CashFlowReport {
  period_start: string;
  period_end: string;
  group_by: string;
  total_income: number;
  total_expenses: number;
  net_flow: number;
  periods: CashFlowPeriod[];
}

// Preset date ranges
type DatePreset = 'today' | 'week' | 'month' | 'year' | 'custom' | 'all';

// Helper to format date as YYYY-MM-DD
const formatDateForAPI = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

// Helper to get preset date ranges
const getPresetDates = (preset: DatePreset): DateFilters => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  switch (preset) {
    case 'today':
      return {
        startDate: formatDateForAPI(today),
        endDate: formatDateForAPI(today)
      };
    case 'week': {
      const weekAgo = new Date(today);
      weekAgo.setDate(today.getDate() - 7);
      return {
        startDate: formatDateForAPI(weekAgo),
        endDate: formatDateForAPI(today)
      };
    }
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return {
        startDate: formatDateForAPI(monthStart),
        endDate: formatDateForAPI(today)
      };
    }
    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return {
        startDate: formatDateForAPI(yearStart),
        endDate: formatDateForAPI(today)
      };
    }
    case 'all':
    default:
      return {}; // No filters = all time
  }
};

// Helper to validate UUID format
const isValidUUID = (str: string): boolean => {
  if (!str) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
};

export const parseApiError = (err: any) => {
  // Error de red (backend caído, CORS, timeout)
  if (!err.response) {
    return {
      userMessage: 'No se pudo conectar con el servidor. Verifica tu conexión.',
      technicalMessage: err.message,
      status: null
    };
  }

  const { status, data } = err.response;

  // Errores comunes del backend
  const backendMessage =
    data?.detail ||
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors) ? data.errors.join(', ') : null);

  return {
    userMessage:
      backendMessage ||
      `Error del servidor (${status}). Intenta nuevamente.`,
    technicalMessage: JSON.stringify(data),
    status
  };
};


export default function Reports() {
  const { currentSchool } = useSchoolStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab state
  const [activeTab, setActiveTab] = useState<ReportTab>('sales');

  // Date filter state
  const [datePreset, setDatePreset] = useState<DatePreset>('month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  // Initialize with month preset to avoid race condition
  const [activeFilters, setActiveFilters] = useState<DateFilters>(() => getPresetDates('month'));
  const [filtersReady, setFiltersReady] = useState(false);

  // Dashboard data (Sales tab)
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);

  // Financial data (Financial tab)
  const [financialLoading, setFinancialLoading] = useState(false);
  const [financialError, setFinancialError] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<ExpenseCategory[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowReport | null>(null);

  // Movements Log data (Movements tab)
  const [movementsLoading, setMovementsLoading] = useState(false);
  const [movementsError, setMovementsError] = useState<string | null>(null);
  const [balanceEntries, setBalanceEntries] = useState<any[]>([]);
  const [entriesTotal, setEntriesTotal] = useState(0);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [balanceAccounts, setBalanceAccounts] = useState<any[]>([]);

  // Alterations data (Alterations tab)
  const [alterationsLoading, setAlterationsLoading] = useState(false);
  const [alterationsError, setAlterationsError] = useState<string | null>(null);
  const [alterationsSummary, setAlterationsSummary] = useState<AlterationsSummary | null>(null);
  const [alterationsList, setAlterationsList] = useState<AlterationListItem[]>([]);

  const schoolId = currentSchool?.id || '';

  // Mark filters as ready after initial render
  useEffect(() => {
    setFiltersReady(true);
  }, []);

  // Load data when filters are ready and change
  useEffect(() => {
    if (!filtersReady) return;

    if (Object.keys(activeFilters).length > 0 || datePreset === 'all') {
      if (activeTab === 'sales') {
        // Sales tab requires a valid schoolId - wait until it's available
        if (schoolId) {
          loadAllReports();
        } else {
          // No school selected yet - show empty state, not error
          setLoading(false);
        }
      } else if (activeTab === 'financial') {
        // Financial tab is global, doesn't need schoolId
        loadFinancialReports();
      } else if (activeTab === 'movements') {
        // Movements tab is global
        loadMovementsLog();
      } else if (activeTab === 'alterations') {
        // Alterations tab is global
        loadAlterationsReport();
      }
    }
  }, [activeFilters, schoolId, activeTab, filtersReady, selectedAccountId]);

 const loadFinancialReports = async () => {
  try {
    setFinancialLoading(true);
    setFinancialError(null);

    const { startDate, endDate } = activeFilters;

    let groupBy: 'day' | 'week' | 'month' = 'day';

    if (startDate && endDate) {
      const daysDiff = Math.ceil(
        (new Date(endDate).getTime() - new Date(startDate).getTime()) /
        (1000 * 60 * 60 * 24)
      );

      if (daysDiff > 90) groupBy = 'month';
      else if (daysDiff > 30) groupBy = 'week';
    }

    const [transactionsData, expensesData, cashFlowData] = await Promise.all([
      globalAccountingService.getGlobalTransactions({
        startDate,
        endDate,
        limit: 50
      }),
      globalAccountingService.getExpensesSummaryByCategory({
        startDate,
        endDate
      }),
      startDate && endDate
        ? globalAccountingService.getCashFlowReport(startDate, endDate, groupBy)
        : Promise.resolve(null)
    ]);

    setTransactions(transactionsData);
    setExpensesByCategory(expensesData);
    setCashFlow(cashFlowData);

  } catch (err: any) {
    const parsedError = parseApiError(err);

    console.error('[FinancialReportsError]', {
      status: parsedError.status,
      message: parsedError.technicalMessage,
      originalError: err
    });

    setFinancialError(parsedError.userMessage);
  } finally {
    setFinancialLoading(false);
  }
};

  const loadMovementsLog = async () => {
    try {
      setMovementsLoading(true);
      setMovementsError(null);

      const { startDate, endDate } = activeFilters;

      // Load balance accounts for filter dropdown (only once)
      if (balanceAccounts.length === 0) {
        const accounts = await globalAccountingService.getGlobalBalanceAccounts();
        // Filter only current assets (Caja, Nequi, Banco)
        const currentAssets = accounts.filter(a => a.account_type === 'asset_current');
        setBalanceAccounts(currentAssets);
      }

      // Load entries
      const response = await globalAccountingService.getUnifiedBalanceEntries({
        startDate,
        endDate,
        accountId: selectedAccountId || undefined,
        limit: 100
      });

      setBalanceEntries(response.items);
      setEntriesTotal(response.total);
    } catch (err: any) {
      const parsedError = parseApiError(err);
      console.error('[MovementsLogError]', {
        status: parsedError.status,
        message: parsedError.technicalMessage,
        originalError: err
      });
      setMovementsError(parsedError.userMessage);
    } finally {
      setMovementsLoading(false);
    }
  };

  const loadAlterationsReport = async () => {
    try {
      setAlterationsLoading(true);
      setAlterationsError(null);

      const { startDate, endDate } = activeFilters;

      const [summaryData, listData] = await Promise.all([
        alterationService.getSummary(),
        alterationService.getAll({
          start_date: startDate,
          end_date: endDate,
          limit: 50
        })
      ]);

      setAlterationsSummary(summaryData);
      setAlterationsList(listData);
    } catch (err: any) {
      const parsedError = parseApiError(err);
      console.error('[AlterationsReportError]', {
        status: parsedError.status,
        message: parsedError.technicalMessage,
        originalError: err
      });
      setAlterationsError(parsedError.userMessage);
    } finally {
      setAlterationsLoading(false);
    }
  };

  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const filters = getPresetDates(preset);
      setActiveFilters(filters);
    }
  };

  const handleApplyCustomDates = () => {
    if (customStartDate && customEndDate) {
      setActiveFilters({
        startDate: customStartDate,
        endDate: customEndDate
      });
    }
  };

  const loadAllReports = async () => {
    // Validate schoolId is a valid UUID before making API calls
    if (!isValidUUID(schoolId)) {
      setError('Por favor selecciona un colegio válido para ver reportes de ventas');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const [dashboardData, summaryData, productsData, stockData, clientsData] = await Promise.all([
        reportsService.getDashboardSummary(schoolId, activeFilters),
        reportsService.getSalesSummary(schoolId, activeFilters),
        reportsService.getTopProducts(schoolId, 5, activeFilters),
        reportsService.getLowStock(schoolId, 10),
        reportsService.getTopClients(schoolId, 5, activeFilters),
      ]);

      setDashboard(dashboardData);
      setSalesSummary(summaryData);
      setTopProducts(productsData);
      setLowStock(stockData);
      setTopClients(clientsData);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.response?.data?.detail || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString()}`;
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDateRangeLabel = (): string => {
    if (datePreset === 'all') return 'Todo el tiempo';
    if (!activeFilters.startDate || !activeFilters.endDate) return '';
    if (activeFilters.startDate === activeFilters.endDate) {
      return formatDateDisplay(activeFilters.startDate);
    }
    return `${formatDateDisplay(activeFilters.startDate)} - ${formatDateDisplay(activeFilters.endDate)}`;
  };

  // Only show full-page loading for initial sales tab load
  if (loading && activeTab === 'sales' && !dashboard) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando reportes...</span>
        </div>
      </Layout>
    );
  }

  // Only show full-page error for sales tab errors
  if (error && activeTab === 'sales') {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar reportes</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadAllReports}
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
      <div className="mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
            Reportes
          </h1>
          <p className="text-gray-600 mt-1">Resumen de métricas del negocio</p>
        </div>
        <button
          onClick={activeTab === 'sales' ? loadAllReports : activeTab === 'financial' ? loadFinancialReports : loadMovementsLog}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 transition self-start"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Actualizar
        </button>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              activeTab === 'sales'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ShoppingBag className="w-4 h-4 inline mr-2" />
            Ventas por Colegio
          </button>
          <button
            onClick={() => setActiveTab('financial')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              activeTab === 'financial'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Wallet className="w-4 h-4 inline mr-2" />
            Financiero Global
          </button>
          <button
            onClick={() => setActiveTab('movements')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              activeTab === 'movements'
                ? 'border-purple-600 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <ScrollText className="w-4 h-4 inline mr-2" />
            Log de Movimientos
          </button>
          <button
            onClick={() => setActiveTab('alterations')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition ${
              activeTab === 'alterations'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Scissors className="w-4 h-4 inline mr-2" />
            Arreglos
          </button>
        </nav>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
          </div>

          {/* Preset Buttons */}
          <div className="flex flex-wrap gap-2">
            {[
              { value: 'today', label: 'Hoy' },
              { value: 'week', label: 'Semana' },
              { value: 'month', label: 'Este Mes' },
              { value: 'year', label: 'Este Año' },
              { value: 'all', label: 'Todo' },
              { value: 'custom', label: 'Personalizado' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => handlePresetChange(option.value as DatePreset)}
                className={`px-3 py-1.5 text-sm rounded-lg transition ${
                  datePreset === option.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>

          {/* Custom Date Range */}
          {datePreset === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 ml-0 lg:ml-4 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-200 lg:pl-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <DatePicker
                  value={customStartDate}
                  onChange={(value) => setCustomStartDate(value)}
                  placeholder="Desde"
                  className="w-36"
                />
                <span className="text-gray-500">a</span>
                <DatePicker
                  value={customEndDate}
                  onChange={(value) => setCustomEndDate(value)}
                  placeholder="Hasta"
                  minDate={customStartDate}
                  className="w-36"
                />
              </div>
              <button
                onClick={handleApplyCustomDates}
                disabled={!customStartDate || !customEndDate}
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Aplicar
              </button>
            </div>
          )}
        </div>

        {/* Active Date Range Display */}
        {getDateRangeLabel() && (
          <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span>Mostrando datos de: <strong>{getDateRangeLabel()}</strong></span>
          </div>
        )}
      </div>

      {/* ===== SALES TAB CONTENT ===== */}
      {activeTab === 'sales' && (
        <>
      {/* No school selected warning */}
      {!schoolId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertTriangle className="w-6 h-6 text-yellow-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Selecciona un colegio</h3>
              <p className="mt-1 text-sm text-yellow-700">
                Para ver los reportes de ventas, selecciona un colegio en el menú superior.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Sales Summary for Period */}
      {schoolId && salesSummary && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 mb-6 text-white">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Resumen del Período
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <p className="text-blue-200 text-sm">Total Ventas</p>
              <p className="text-3xl font-bold">{salesSummary.total_sales}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Ingresos Totales</p>
              <p className="text-3xl font-bold">{formatCurrency(salesSummary.total_revenue)}</p>
            </div>
            <div>
              <p className="text-blue-200 text-sm">Ticket Promedio</p>
              <p className="text-3xl font-bold">{formatCurrency(salesSummary.average_ticket)}</p>
            </div>
          </div>
          {/* Payment Method Breakdown */}
          {salesSummary.sales_by_payment && Object.keys(salesSummary.sales_by_payment).length > 0 && (
            <div className="mt-4 pt-4 border-t border-blue-500">
              <p className="text-blue-200 text-sm mb-2">Por método de pago:</p>
              <div className="flex flex-wrap gap-4">
                {Object.entries(salesSummary.sales_by_payment).map(([method, data]) => (
                  <div key={method} className="bg-blue-500/30 rounded px-3 py-1">
                    <span className="capitalize">{method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'transfer' ? 'Transferencia' : method === 'credit' ? 'Crédito' : method}:</span>
                    <span className="ml-2 font-semibold">{data.count} ({formatCurrency(data.total)})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards - only show when school is selected */}
      {schoolId && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Today's Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">Hoy</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboard?.today.revenue || 0)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dashboard?.today.sales_count || 0} ventas
          </p>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Este Mes</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboard?.this_month.revenue || 0)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dashboard?.this_month.sales_count || 0} ventas · Ticket promedio: {formatCurrency(dashboard?.this_month.average_ticket || 0)}
          </p>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">Inventario</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboard?.inventory.total_value || 0)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dashboard?.inventory.total_products || 0} productos
          </p>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500">Alertas</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Stock bajo:</span>
              <span className={`font-bold ${(dashboard?.alerts.low_stock_count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {dashboard?.alerts.low_stock_count || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Encargos pendientes:</span>
              <span className={`font-bold ${(dashboard?.alerts.pending_orders_count || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {dashboard?.alerts.pending_orders_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>
      )}

      {/* Two Column Layout - only show when school is selected */}
      {schoolId && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
              Productos Más Vendidos
            </h2>
            <p className="text-sm text-gray-500 mt-1">{getDateRangeLabel() || 'Período seleccionado'}</p>
          </div>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Vendidos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product, index) => (
                    <tr key={product.product_id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.product_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.product_code} · {product.product_size}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {product.units_sold}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        {formatCurrency(product.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No hay datos de ventas para el período seleccionado
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Mejores Clientes
            </h2>
            <p className="text-sm text-gray-500 mt-1">{getDateRangeLabel() || 'Período seleccionado'}</p>
          </div>
          {topClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Compras
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topClients.map((client, index) => (
                    <tr key={client.client_id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.client_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {client.client_phone || client.client_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {client.total_purchases}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        {formatCurrency(client.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No hay datos de clientes para el período seleccionado
            </div>
          )}
        </div>
      </div>
      )}

      {/* Low Stock Alert - only show when school is selected */}
      {schoolId && lowStock.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Productos con Stock Bajo
            </h2>
            <p className="text-sm text-red-600 mt-1">
              {lowStock.length} productos necesitan reabastecimiento
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Talla
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Stock Mínimo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStock.map((product) => (
                  <tr key={product.product_id} className="hover:bg-red-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.product_code}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {product.product_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.product_size}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        product.current_stock === 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {product.min_stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
        </>
      )}

      {/* ===== FINANCIAL TAB CONTENT ===== */}
      {activeTab === 'financial' && (
        <>
          {financialLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="ml-3 text-gray-600">Cargando datos financieros...</span>
            </div>
          ) : financialError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <div className="flex items-start">
                <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Error al cargar datos financieros</h3>
                  <p className="mt-1 text-sm text-red-700">{financialError}</p>
                  <button
                    onClick={loadFinancialReports}
                    className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Financial KPI Cards */}
              {cashFlow && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  {/* Total Income */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-green-100 rounded-lg">
                        <ArrowUpRight className="w-6 h-6 text-green-600" />
                      </div>
                      <span className="text-xs text-gray-500">Ingresos</span>
                    </div>
                    <h3 className="text-2xl font-bold text-green-600">
                      {formatCurrency(cashFlow.total_income)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Total del período</p>
                  </div>

                  {/* Total Expenses */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-2 bg-red-100 rounded-lg">
                        <ArrowDownRight className="w-6 h-6 text-red-600" />
                      </div>
                      <span className="text-xs text-gray-500">Gastos</span>
                    </div>
                    <h3 className="text-2xl font-bold text-red-600">
                      {formatCurrency(cashFlow.total_expenses)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Total del período</p>
                  </div>

                  {/* Net Flow */}
                  <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`p-2 rounded-lg ${cashFlow.net_flow >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
                        <Wallet className={`w-6 h-6 ${cashFlow.net_flow >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
                      </div>
                      <span className="text-xs text-gray-500">Flujo Neto</span>
                    </div>
                    <h3 className={`text-2xl font-bold ${cashFlow.net_flow >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {cashFlow.net_flow >= 0 ? '+' : ''}{formatCurrency(cashFlow.net_flow)}
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">Ingresos - Gastos</p>
                  </div>
                </div>
              )}

              {/* Cash Flow Chart (simplified bar visualization) */}
              {cashFlow && cashFlow.periods.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                  <h2 className="text-lg font-semibold text-gray-800 flex items-center mb-4">
                    <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
                    Flujo de Caja por Período
                  </h2>
                  <div className="space-y-3">
                    {cashFlow.periods.slice(0, 10).map((period) => {
                      const maxValue = Math.max(...cashFlow.periods.map(p => Math.max(p.income, p.expenses)));
                      const incomeWidth = maxValue > 0 ? (period.income / maxValue) * 100 : 0;
                      const expenseWidth = maxValue > 0 ? (period.expenses / maxValue) * 100 : 0;
                      return (
                        <div key={period.period} className="flex items-center gap-4">
                          <div className="w-24 text-sm text-gray-600 flex-shrink-0">
                            {period.period_label}
                          </div>
                          <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 bg-green-500 rounded"
                                style={{ width: `${incomeWidth}%`, minWidth: period.income > 0 ? '4px' : '0' }}
                              />
                              <span className="text-xs text-green-600">{formatCurrency(period.income)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-4 bg-red-500 rounded"
                                style={{ width: `${expenseWidth}%`, minWidth: period.expenses > 0 ? '4px' : '0' }}
                              />
                              <span className="text-xs text-red-600">{formatCurrency(period.expenses)}</span>
                            </div>
                          </div>
                          <div className={`w-24 text-right text-sm font-medium ${period.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {period.net >= 0 ? '+' : ''}{formatCurrency(period.net)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-green-500 rounded" />
                      <span>Ingresos</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 bg-red-500 rounded" />
                      <span>Gastos</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Two Column Layout: Transactions & Expenses by Category */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Recent Transactions */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                      <Receipt className="w-5 h-5 mr-2 text-blue-600" />
                      Últimas Transacciones
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{getDateRangeLabel() || 'Período seleccionado'}</p>
                  </div>
                  {transactions.length > 0 ? (
                    <div className="overflow-x-auto max-h-96">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Fecha
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                              Descripción
                            </th>
                            <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                              Monto
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {transactions.slice(0, 20).map((tx) => (
                            <tr key={tx.id} className="hover:bg-gray-50">
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {formatDateDisplay(tx.transaction_date)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-sm text-gray-900 line-clamp-1">
                                  {tx.description}
                                </div>
                                {tx.school_name && (
                                  <div className="text-xs text-gray-500">{tx.school_name}</div>
                                )}
                              </td>
                              <td className={`px-4 py-3 text-right text-sm font-medium whitespace-nowrap ${
                                tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-600'
                              }`}>
                                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                                {formatCurrency(tx.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No hay transacciones para el período seleccionado
                    </div>
                  )}
                </div>

                {/* Expenses by Category */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                      <PieChart className="w-5 h-5 mr-2 text-purple-600" />
                      Gastos por Categoría
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">{getDateRangeLabel() || 'Período seleccionado'}</p>
                  </div>
                  {expensesByCategory.length > 0 ? (
                    <div className="p-6 space-y-4">
                      {expensesByCategory.map((cat) => (
                        <div key={cat.category}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{cat.category_label}</span>
                            <span className="text-sm text-gray-600">{formatCurrency(cat.total_amount)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-4 bg-gray-100 rounded overflow-hidden">
                              <div
                                className="h-full bg-purple-500 rounded"
                                style={{ width: `${cat.percentage}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 w-12 text-right">{Number(cat.percentage).toFixed(1)}%</span>
                          </div>
                          <div className="flex gap-4 mt-1 text-xs text-gray-500">
                            <span>Pagado: {formatCurrency(cat.paid_amount)}</span>
                            {cat.pending_amount > 0 && (
                              <span className="text-orange-600">Pendiente: {formatCurrency(cat.pending_amount)}</span>
                            )}
                            <span>{cat.count} gastos</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-6 text-center text-gray-500">
                      No hay gastos para el período seleccionado
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ===== MOVEMENTS LOG TAB CONTENT ===== */}
      {activeTab === 'movements' && (
        <>
          {/* Account Filter */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-700">Filtrar por cuenta:</span>
              </div>
              <select
                value={selectedAccountId}
                onChange={(e) => setSelectedAccountId(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Todas las cuentas</option>
                {balanceAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.code} - {account.name}
                  </option>
                ))}
              </select>
              {entriesTotal > 0 && (
                <span className="text-sm text-gray-500">
                  {entriesTotal} movimiento{entriesTotal !== 1 ? 's' : ''} encontrado{entriesTotal !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>

          {/* Loading State */}
          {movementsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              <span className="ml-3 text-gray-600">Cargando movimientos...</span>
            </div>
          )}

          {/* Error State */}
          {movementsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{movementsError}</p>
                  <button
                    onClick={loadMovementsLog}
                    className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Movements Table */}
          {!movementsLoading && !movementsError && (
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-indigo-50">
                <h2 className="text-lg font-semibold text-gray-800">
                  Historial de Movimientos
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {getDateRangeLabel() || 'Todos los movimientos'}
                </p>
              </div>

              {balanceEntries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha / Hora
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cuenta
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Descripción
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Referencia
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Monto
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Saldo Después
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {balanceEntries.map((entry) => {
                        const createdAt = new Date(entry.created_at);
                        const isPositive = entry.amount > 0;

                        return (
                          <tr key={entry.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="text-sm text-gray-900">
                                {createdAt.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })}
                              </div>
                              <div className="text-xs text-gray-500">
                                {createdAt.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                entry.account_code === '1101' ? 'bg-green-100 text-green-800' :
                                entry.account_code === '1102' ? 'bg-blue-100 text-blue-800' :
                                entry.account_code === '1103' ? 'bg-purple-100 text-purple-800' :
                                entry.account_code === '1104' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {entry.account_name}
                              </span>
                              <div className="text-xs text-gray-400 mt-0.5">{entry.account_code}</div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-sm text-gray-900 max-w-xs truncate" title={entry.description}>
                                {entry.description}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {entry.reference ? (
                                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                                  {entry.reference}
                                </span>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className={`px-4 py-3 text-right whitespace-nowrap text-sm font-semibold ${
                              isPositive ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {isPositive ? '+' : ''}{formatCurrency(entry.amount)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-sm text-gray-700">
                              {formatCurrency(entry.balance_after)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center text-gray-500">
                  <ScrollText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay movimientos para el período seleccionado</p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== ALTERATIONS TAB CONTENT ===== */}
      {activeTab === 'alterations' && (
        <>
          {/* Loading State */}
          {alterationsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
              <span className="ml-3 text-gray-600">Cargando datos de arreglos...</span>
            </div>
          )}

          {/* Error State */}
          {alterationsError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-red-700">{alterationsError}</p>
                  <button
                    onClick={loadAlterationsReport}
                    className="mt-2 text-sm text-red-700 hover:text-red-800 underline"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Alterations Content */}
          {!alterationsLoading && !alterationsError && (
            <>
              {/* Summary Cards */}
              {alterationsSummary && (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <Scissors className="w-4 h-4" />
                      Total
                    </div>
                    <p className="text-2xl font-semibold text-gray-900">{alterationsSummary.total_count}</p>
                  </div>
                  <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border border-yellow-100">
                    <div className="flex items-center gap-2 text-yellow-700 text-sm mb-1">
                      <Clock className="w-4 h-4" />
                      Pendientes
                    </div>
                    <p className="text-2xl font-semibold text-yellow-700">{alterationsSummary.pending_count}</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-100">
                    <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
                      <Scissors className="w-4 h-4" />
                      En Proceso
                    </div>
                    <p className="text-2xl font-semibold text-blue-700">{alterationsSummary.in_progress_count}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-100">
                    <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                      <CheckCircle className="w-4 h-4" />
                      Listos
                    </div>
                    <p className="text-2xl font-semibold text-green-700">{alterationsSummary.ready_count}</p>
                  </div>
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      Ingresos
                    </div>
                    <p className="text-xl font-semibold text-gray-900">{formatCurrency(alterationsSummary.total_revenue)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 shadow-sm border border-red-100">
                    <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                      <DollarSign className="w-4 h-4" />
                      Por Cobrar
                    </div>
                    <p className="text-xl font-semibold text-red-700">{formatCurrency(alterationsSummary.total_pending_payment)}</p>
                  </div>
                </div>
              )}

              {/* Alterations Table */}
              <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-orange-50 to-amber-50">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Listado de Arreglos
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    {getDateRangeLabel() || 'Todos los arreglos'}
                  </p>
                </div>

                {alterationsList.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Código
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Cliente
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Prenda
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Tipo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Estado
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Costo
                          </th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Saldo
                          </th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Recibido
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {alterationsList.map((alteration) => (
                          <tr key={alteration.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="font-mono text-sm text-orange-600 font-medium">
                                {alteration.code}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                              {alteration.client_display_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              {alteration.garment_name}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                                {ALTERATION_TYPE_LABELS[alteration.alteration_type]}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-1 text-xs rounded-full ${ALTERATION_STATUS_COLORS[alteration.status]}`}>
                                {ALTERATION_STATUS_LABELS[alteration.status]}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap text-sm font-medium text-gray-900">
                              {formatCurrency(alteration.cost)}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              {alteration.balance > 0 ? (
                                <span className="text-sm font-medium text-red-600">
                                  {formatCurrency(alteration.balance)}
                                </span>
                              ) : (
                                <span className="text-sm text-green-600 flex items-center justify-end gap-1">
                                  <CheckCircle className="w-4 h-4" />
                                  Pagado
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                              {new Date(alteration.received_date).toLocaleDateString('es-CO', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="p-12 text-center text-gray-500">
                    <Scissors className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No hay arreglos para el período seleccionado</p>
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </Layout>
  );
}
