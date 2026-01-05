import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Reports Page - Business analytics and reporting
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { BarChart3, TrendingUp, Package, Users, AlertTriangle, DollarSign, Loader2, AlertCircle, ShoppingBag, RefreshCw, Calendar, Filter, ArrowUpRight, ArrowDownRight, Wallet, Receipt, PieChart } from 'lucide-react';
import DatePicker from '../components/DatePicker';
import { reportsService } from '../services/reportsService';
import { useSchoolStore } from '../stores/schoolStore';
import { globalAccountingService } from '../services/globalAccountingService';
// Helper to format date as YYYY-MM-DD
const formatDateForAPI = (date) => {
    return date.toISOString().split('T')[0];
};
// Helper to get preset date ranges
const getPresetDates = (preset) => {
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
export default function Reports() {
    const { currentSchool } = useSchoolStore();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Tab state
    const [activeTab, setActiveTab] = useState('sales');
    // Date filter state
    const [datePreset, setDatePreset] = useState('month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    const [activeFilters, setActiveFilters] = useState({});
    // Dashboard data (Sales tab)
    const [dashboard, setDashboard] = useState(null);
    const [salesSummary, setSalesSummary] = useState(null);
    const [topProducts, setTopProducts] = useState([]);
    const [lowStock, setLowStock] = useState([]);
    const [topClients, setTopClients] = useState([]);
    // Financial data (Financial tab)
    const [financialLoading, setFinancialLoading] = useState(false);
    const [transactions, setTransactions] = useState([]);
    const [expensesByCategory, setExpensesByCategory] = useState([]);
    const [cashFlow, setCashFlow] = useState(null);
    const schoolId = currentSchool?.id || '';
    useEffect(() => {
        // Set initial filters
        const initialFilters = getPresetDates('month');
        setActiveFilters(initialFilters);
    }, []);
    useEffect(() => {
        if (Object.keys(activeFilters).length > 0 || datePreset === 'all') {
            if (activeTab === 'sales') {
                loadAllReports();
            }
            else {
                loadFinancialReports();
            }
        }
    }, [activeFilters, schoolId, activeTab]);
    const loadFinancialReports = async () => {
        try {
            setFinancialLoading(true);
            setError(null);
            const startDate = activeFilters.startDate;
            const endDate = activeFilters.endDate;
            // Determine group_by based on date range
            let groupBy = 'day';
            if (startDate && endDate) {
                const daysDiff = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff > 90)
                    groupBy = 'month';
                else if (daysDiff > 30)
                    groupBy = 'week';
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
        }
        catch (err) {
            console.error('Error loading financial reports:', err);
            setError(err.response?.data?.detail || 'Error al cargar reportes financieros');
        }
        finally {
            setFinancialLoading(false);
        }
    };
    const handlePresetChange = (preset) => {
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
        }
        catch (err) {
            console.error('Error loading reports:', err);
            setError(err.response?.data?.detail || 'Error al cargar los reportes');
        }
        finally {
            setLoading(false);
        }
    };
    const formatCurrency = (amount) => {
        return `$${Number(amount).toLocaleString()}`;
    };
    const formatDateDisplay = (dateStr) => {
        if (!dateStr)
            return '';
        const date = new Date(dateStr + 'T00:00:00');
        return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
    };
    const getDateRangeLabel = () => {
        if (datePreset === 'all')
            return 'Todo el tiempo';
        if (!activeFilters.startDate || !activeFilters.endDate)
            return '';
        if (activeFilters.startDate === activeFilters.endDate) {
            return formatDateDisplay(activeFilters.startDate);
        }
        return `${formatDateDisplay(activeFilters.startDate)} - ${formatDateDisplay(activeFilters.endDate)}`;
    };
    if (loading) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando reportes..." })] }) }));
    }
    if (error) {
        return (_jsx(Layout, { children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar reportes" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadAllReports, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) }) }));
    }
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800 flex items-center", children: [_jsx(BarChart3, { className: "w-8 h-8 mr-3 text-blue-600" }), "Reportes"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Resumen de m\u00E9tricas del negocio" })] }), _jsxs("button", { onClick: activeTab === 'sales' ? loadAllReports : loadFinancialReports, className: "bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 transition self-start", children: [_jsx(RefreshCw, { className: "w-5 h-5 mr-2" }), "Actualizar"] })] }), _jsx("div", { className: "mb-6 border-b border-gray-200", children: _jsxs("nav", { className: "flex gap-4", children: [_jsxs("button", { onClick: () => setActiveTab('sales'), className: `pb-3 px-1 text-sm font-medium border-b-2 transition ${activeTab === 'sales'
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: [_jsx(ShoppingBag, { className: "w-4 h-4 inline mr-2" }), "Ventas por Colegio"] }), _jsxs("button", { onClick: () => setActiveTab('financial'), className: `pb-3 px-1 text-sm font-medium border-b-2 transition ${activeTab === 'financial'
                                ? 'border-green-600 text-green-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: [_jsx(Wallet, { className: "w-4 h-4 inline mr-2" }), "Financiero Global"] })] }) }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6", children: [_jsxs("div", { className: "flex flex-col lg:flex-row lg:items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Filter, { className: "w-5 h-5 text-gray-500" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Per\u00EDodo:" })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: [
                                    { value: 'today', label: 'Hoy' },
                                    { value: 'week', label: 'Semana' },
                                    { value: 'month', label: 'Este Mes' },
                                    { value: 'year', label: 'Este Año' },
                                    { value: 'all', label: 'Todo' },
                                    { value: 'custom', label: 'Personalizado' },
                                ].map((option) => (_jsx("button", { onClick: () => handlePresetChange(option.value), className: `px-3 py-1.5 text-sm rounded-lg transition ${datePreset === option.value
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`, children: option.label }, option.value))) }), datePreset === 'custom' && (_jsxs("div", { className: "flex flex-wrap items-center gap-2 ml-0 lg:ml-4 pt-2 lg:pt-0 border-t lg:border-t-0 lg:border-l border-gray-200 lg:pl-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Calendar, { className: "w-4 h-4 text-gray-500" }), _jsx(DatePicker, { value: customStartDate, onChange: (value) => setCustomStartDate(value), placeholder: "Desde", className: "w-36" }), _jsx("span", { className: "text-gray-500", children: "a" }), _jsx(DatePicker, { value: customEndDate, onChange: (value) => setCustomEndDate(value), placeholder: "Hasta", minDate: customStartDate, className: "w-36" })] }), _jsx("button", { onClick: handleApplyCustomDates, disabled: !customStartDate || !customEndDate, className: "px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed", children: "Aplicar" })] }))] }), getDateRangeLabel() && (_jsxs("div", { className: "mt-3 text-sm text-gray-600 flex items-center gap-2", children: [_jsx(Calendar, { className: "w-4 h-4" }), _jsxs("span", { children: ["Mostrando datos de: ", _jsx("strong", { children: getDateRangeLabel() })] })] }))] }), activeTab === 'sales' && (_jsxs(_Fragment, { children: [salesSummary && (_jsxs("div", { className: "bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-sm p-6 mb-6 text-white", children: [_jsxs("h2", { className: "text-lg font-semibold mb-4 flex items-center", children: [_jsx(TrendingUp, { className: "w-5 h-5 mr-2" }), "Resumen del Per\u00EDodo"] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6", children: [_jsxs("div", { children: [_jsx("p", { className: "text-blue-200 text-sm", children: "Total Ventas" }), _jsx("p", { className: "text-3xl font-bold", children: salesSummary.total_sales })] }), _jsxs("div", { children: [_jsx("p", { className: "text-blue-200 text-sm", children: "Ingresos Totales" }), _jsx("p", { className: "text-3xl font-bold", children: formatCurrency(salesSummary.total_revenue) })] }), _jsxs("div", { children: [_jsx("p", { className: "text-blue-200 text-sm", children: "Ticket Promedio" }), _jsx("p", { className: "text-3xl font-bold", children: formatCurrency(salesSummary.average_ticket) })] })] }), salesSummary.sales_by_payment && Object.keys(salesSummary.sales_by_payment).length > 0 && (_jsxs("div", { className: "mt-4 pt-4 border-t border-blue-500", children: [_jsx("p", { className: "text-blue-200 text-sm mb-2", children: "Por m\u00E9todo de pago:" }), _jsx("div", { className: "flex flex-wrap gap-4", children: Object.entries(salesSummary.sales_by_payment).map(([method, data]) => (_jsxs("div", { className: "bg-blue-500/30 rounded px-3 py-1", children: [_jsxs("span", { className: "capitalize", children: [method === 'cash' ? 'Efectivo' : method === 'card' ? 'Tarjeta' : method === 'transfer' ? 'Transferencia' : method === 'credit' ? 'Crédito' : method, ":"] }), _jsxs("span", { className: "ml-2 font-semibold", children: [data.count, " (", formatCurrency(data.total), ")"] })] }, method))) })] }))] })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: "p-2 bg-blue-100 rounded-lg", children: _jsx(DollarSign, { className: "w-6 h-6 text-blue-600" }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Hoy" })] }), _jsx("h3", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(dashboard?.today.revenue || 0) }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: [dashboard?.today.sales_count || 0, " ventas"] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: "p-2 bg-green-100 rounded-lg", children: _jsx(TrendingUp, { className: "w-6 h-6 text-green-600" }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Este Mes" })] }), _jsx("h3", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(dashboard?.this_month.revenue || 0) }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: [dashboard?.this_month.sales_count || 0, " ventas \u00B7 Ticket promedio: ", formatCurrency(dashboard?.this_month.average_ticket || 0)] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: "p-2 bg-purple-100 rounded-lg", children: _jsx(Package, { className: "w-6 h-6 text-purple-600" }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Inventario" })] }), _jsx("h3", { className: "text-2xl font-bold text-gray-900", children: formatCurrency(dashboard?.inventory.total_value || 0) }), _jsxs("p", { className: "text-sm text-gray-600 mt-1", children: [dashboard?.inventory.total_products || 0, " productos"] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: "p-2 bg-orange-100 rounded-lg", children: _jsx(AlertTriangle, { className: "w-6 h-6 text-orange-600" }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Alertas" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Stock bajo:" }), _jsx("span", { className: `font-bold ${(dashboard?.alerts.low_stock_count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`, children: dashboard?.alerts.low_stock_count || 0 })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Encargos pendientes:" }), _jsx("span", { className: `font-bold ${(dashboard?.alerts.pending_orders_count || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`, children: dashboard?.alerts.pending_orders_count || 0 })] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(ShoppingBag, { className: "w-5 h-5 mr-2 text-blue-600" }), "Productos M\u00E1s Vendidos"] }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: getDateRangeLabel() || 'Período seleccionado' })] }), topProducts.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Producto" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Vendidos" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Ingresos" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: topProducts.map((product, index) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-3", children: index + 1 }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: product.product_name }), _jsxs("div", { className: "text-xs text-gray-500", children: [product.product_code, " \u00B7 ", product.product_size] })] })] }) }), _jsx("td", { className: "px-6 py-4 text-right text-sm font-medium text-gray-900", children: product.units_sold }), _jsx("td", { className: "px-6 py-4 text-right text-sm font-medium text-green-600", children: formatCurrency(product.total_revenue) })] }, product.product_id))) })] }) })) : (_jsx("div", { className: "p-6 text-center text-gray-500", children: "No hay datos de ventas para el per\u00EDodo seleccionado" }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(Users, { className: "w-5 h-5 mr-2 text-green-600" }), "Mejores Clientes"] }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: getDateRangeLabel() || 'Período seleccionado' })] }), topClients.length > 0 ? (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Cliente" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Compras" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Total" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: topClients.map((client, index) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4", children: _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold mr-3", children: index + 1 }), _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900", children: client.client_name }), _jsx("div", { className: "text-xs text-gray-500", children: client.client_phone || client.client_code })] })] }) }), _jsx("td", { className: "px-6 py-4 text-right text-sm text-gray-900", children: client.total_purchases }), _jsx("td", { className: "px-6 py-4 text-right text-sm font-medium text-green-600", children: formatCurrency(client.total_spent) })] }, client.client_id))) })] }) })) : (_jsx("div", { className: "p-6 text-center text-gray-500", children: "No hay datos de clientes para el per\u00EDodo seleccionado" }))] })] }), lowStock.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200 bg-red-50", children: [_jsxs("h2", { className: "text-lg font-semibold text-red-800 flex items-center", children: [_jsx(AlertTriangle, { className: "w-5 h-5 mr-2" }), "Productos con Stock Bajo"] }), _jsxs("p", { className: "text-sm text-red-600 mt-1", children: [lowStock.length, " productos necesitan reabastecimiento"] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "C\u00F3digo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Producto" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Talla" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Stock Actual" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Stock M\u00EDnimo" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: lowStock.map((product) => (_jsxs("tr", { className: "hover:bg-red-50", children: [_jsx("td", { className: "px-6 py-4 text-sm text-gray-900", children: product.product_code }), _jsx("td", { className: "px-6 py-4 text-sm font-medium text-gray-900", children: product.product_name }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600", children: product.product_size }), _jsx("td", { className: "px-6 py-4 text-right", children: _jsx("span", { className: `px-2 py-1 text-xs font-bold rounded ${product.current_stock === 0
                                                                ? 'bg-red-100 text-red-800'
                                                                : 'bg-yellow-100 text-yellow-800'}`, children: product.current_stock }) }), _jsx("td", { className: "px-6 py-4 text-right text-sm text-gray-600", children: product.min_stock })] }, product.product_id))) })] }) })] }))] })), activeTab === 'financial' && (_jsx(_Fragment, { children: financialLoading ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-green-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando datos financieros..." })] })) : (_jsxs(_Fragment, { children: [cashFlow && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-6 mb-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: "p-2 bg-green-100 rounded-lg", children: _jsx(ArrowUpRight, { className: "w-6 h-6 text-green-600" }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Ingresos" })] }), _jsx("h3", { className: "text-2xl font-bold text-green-600", children: formatCurrency(cashFlow.total_income) }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Total del per\u00EDodo" })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: "p-2 bg-red-100 rounded-lg", children: _jsx(ArrowDownRight, { className: "w-6 h-6 text-red-600" }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Gastos" })] }), _jsx("h3", { className: "text-2xl font-bold text-red-600", children: formatCurrency(cashFlow.total_expenses) }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Total del per\u00EDodo" })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsx("div", { className: `p-2 rounded-lg ${cashFlow.net_flow >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`, children: _jsx(Wallet, { className: `w-6 h-6 ${cashFlow.net_flow >= 0 ? 'text-blue-600' : 'text-orange-600'}` }) }), _jsx("span", { className: "text-xs text-gray-500", children: "Flujo Neto" })] }), _jsxs("h3", { className: `text-2xl font-bold ${cashFlow.net_flow >= 0 ? 'text-blue-600' : 'text-orange-600'}`, children: [cashFlow.net_flow >= 0 ? '+' : '', formatCurrency(cashFlow.net_flow)] }), _jsx("p", { className: "text-sm text-gray-600 mt-1", children: "Ingresos - Gastos" })] })] })), cashFlow && cashFlow.periods.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6 mb-6", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center mb-4", children: [_jsx(TrendingUp, { className: "w-5 h-5 mr-2 text-blue-600" }), "Flujo de Caja por Per\u00EDodo"] }), _jsx("div", { className: "space-y-3", children: cashFlow.periods.slice(0, 10).map((period) => {
                                        const maxValue = Math.max(...cashFlow.periods.map(p => Math.max(p.income, p.expenses)));
                                        const incomeWidth = maxValue > 0 ? (period.income / maxValue) * 100 : 0;
                                        const expenseWidth = maxValue > 0 ? (period.expenses / maxValue) * 100 : 0;
                                        return (_jsxs("div", { className: "flex items-center gap-4", children: [_jsx("div", { className: "w-24 text-sm text-gray-600 flex-shrink-0", children: period.period_label }), _jsxs("div", { className: "flex-1 space-y-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "h-4 bg-green-500 rounded", style: { width: `${incomeWidth}%`, minWidth: period.income > 0 ? '4px' : '0' } }), _jsx("span", { className: "text-xs text-green-600", children: formatCurrency(period.income) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "h-4 bg-red-500 rounded", style: { width: `${expenseWidth}%`, minWidth: period.expenses > 0 ? '4px' : '0' } }), _jsx("span", { className: "text-xs text-red-600", children: formatCurrency(period.expenses) })] })] }), _jsxs("div", { className: `w-24 text-right text-sm font-medium ${period.net >= 0 ? 'text-blue-600' : 'text-orange-600'}`, children: [period.net >= 0 ? '+' : '', formatCurrency(period.net)] })] }, period.period));
                                    }) }), _jsxs("div", { className: "mt-4 flex items-center gap-4 text-xs text-gray-500", children: [_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-3 h-3 bg-green-500 rounded" }), _jsx("span", { children: "Ingresos" })] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("div", { className: "w-3 h-3 bg-red-500 rounded" }), _jsx("span", { children: "Gastos" })] })] })] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(Receipt, { className: "w-5 h-5 mr-2 text-blue-600" }), "\u00DAltimas Transacciones"] }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: getDateRangeLabel() || 'Período seleccionado' })] }), transactions.length > 0 ? (_jsx("div", { className: "overflow-x-auto max-h-96", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50 sticky top-0", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Fecha" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Monto" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: transactions.slice(0, 20).map((tx) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 text-sm text-gray-600 whitespace-nowrap", children: formatDateDisplay(tx.transaction_date) }), _jsxs("td", { className: "px-4 py-3", children: [_jsx("div", { className: "text-sm text-gray-900 line-clamp-1", children: tx.description }), tx.school_name && (_jsx("div", { className: "text-xs text-gray-500", children: tx.school_name }))] }), _jsxs("td", { className: `px-4 py-3 text-right text-sm font-medium whitespace-nowrap ${tx.type === 'income' ? 'text-green-600' : tx.type === 'expense' ? 'text-red-600' : 'text-gray-600'}`, children: [tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : '', formatCurrency(tx.amount)] })] }, tx.id))) })] }) })) : (_jsx("div", { className: "p-6 text-center text-gray-500", children: "No hay transacciones para el per\u00EDodo seleccionado" }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(PieChart, { className: "w-5 h-5 mr-2 text-purple-600" }), "Gastos por Categor\u00EDa"] }), _jsx("p", { className: "text-sm text-gray-500 mt-1", children: getDateRangeLabel() || 'Período seleccionado' })] }), expensesByCategory.length > 0 ? (_jsx("div", { className: "p-6 space-y-4", children: expensesByCategory.map((cat) => (_jsxs("div", { children: [_jsxs("div", { className: "flex items-center justify-between mb-1", children: [_jsx("span", { className: "text-sm font-medium text-gray-700", children: cat.category_label }), _jsx("span", { className: "text-sm text-gray-600", children: formatCurrency(cat.total_amount) })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "flex-1 h-4 bg-gray-100 rounded overflow-hidden", children: _jsx("div", { className: "h-full bg-purple-500 rounded", style: { width: `${cat.percentage}%` } }) }), _jsxs("span", { className: "text-xs text-gray-500 w-12 text-right", children: [Number(cat.percentage).toFixed(1), "%"] })] }), _jsxs("div", { className: "flex gap-4 mt-1 text-xs text-gray-500", children: [_jsxs("span", { children: ["Pagado: ", formatCurrency(cat.paid_amount)] }), cat.pending_amount > 0 && (_jsxs("span", { className: "text-orange-600", children: ["Pendiente: ", formatCurrency(cat.pending_amount)] })), _jsxs("span", { children: [cat.count, " gastos"] })] })] }, cat.category))) })) : (_jsx("div", { className: "p-6 text-center text-gray-500", children: "No hay gastos para el per\u00EDodo seleccionado" }))] })] })] })) }))] }));
}
