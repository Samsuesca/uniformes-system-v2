import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Sales Page - List and manage sales (Multi-school view)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SaleModal from '../components/SaleModal';
import { ShoppingCart, Plus, Search, AlertCircle, Loader2, Eye, Calendar, User, DollarSign, Building2, History } from 'lucide-react';
import { formatDateTimeSpanish } from '../components/DatePicker';
import { saleService } from '../services/saleService';
import { useSchoolStore } from '../stores/schoolStore';
export default function Sales() {
    const navigate = useNavigate();
    const { currentSchool, availableSchools, loadSchools } = useSchoolStore();
    const [sales, setSales] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    // For creating new sales, use current school or first available
    const schoolIdForCreate = currentSchool?.id || availableSchools[0]?.id || '';
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    const handleSuccess = () => {
        loadSales();
    };
    useEffect(() => {
        // Load schools if not already loaded
        if (availableSchools.length === 0) {
            loadSchools();
        }
        loadSales();
    }, []);
    // Reload when school filter changes
    useEffect(() => {
        loadSales();
    }, [schoolFilter]);
    const loadSales = async () => {
        try {
            setLoading(true);
            setError(null);
            // Load sales from all schools or filtered by school
            const salesData = await saleService.getAllSales({
                school_id: schoolFilter || undefined,
                limit: 100
            });
            setSales(salesData);
        }
        catch (err) {
            console.error('Error loading sales:', err);
            setError(err.response?.data?.detail || 'Error al cargar ventas');
        }
        finally {
            setLoading(false);
        }
    };
    // Filter sales locally by search and status
    const filteredSales = sales.filter(sale => {
        const matchesSearch = searchTerm === '' ||
            sale.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (sale.client_name && sale.client_name.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesStatus = statusFilter === '' || sale.status === statusFilter;
        return matchesSearch && matchesStatus;
    });
    const getSourceBadge = (source) => {
        if (!source)
            return null;
        const sourceConfig = {
            desktop_app: { label: 'Desktop', color: 'bg-blue-100 text-blue-700' },
            web_portal: { label: 'Web', color: 'bg-purple-100 text-purple-700' },
            api: { label: 'API', color: 'bg-gray-100 text-gray-700' }
        };
        const config = sourceConfig[source] || { label: source, color: 'bg-gray-100 text-gray-700' };
        return (_jsx("span", { className: `ml-2 px-1.5 py-0.5 text-xs rounded ${config.color}`, children: config.label }));
    };
    const getHistoricalBadge = (isHistorical) => {
        if (!isHistorical)
            return null;
        return (_jsxs("span", { className: "ml-2 px-1.5 py-0.5 text-xs rounded bg-amber-100 text-amber-700 flex items-center gap-1 inline-flex", children: [_jsx(History, { className: "w-3 h-3" }), "Hist\u00F3rica"] }));
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'paid':
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'paid':
                return 'Pagada';
            case 'completed':
                return 'Completada';
            case 'pending':
                return 'Pendiente';
            case 'cancelled':
                return 'Cancelada';
            default:
                return status;
        }
    };
    const formatDate = (dateString) => {
        if (!dateString)
            return 'Fecha no disponible';
        const formatted = formatDateTimeSpanish(dateString);
        return formatted === '-' ? 'Fecha inválida' : formatted;
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Ventas" }), _jsxs("p", { className: "text-gray-600 mt-1", children: [loading ? 'Cargando...' : `${filteredSales.length} ventas encontradas`, schoolFilter && availableSchools.length > 1 && (_jsx("span", { className: "ml-2 text-blue-600", children: "\u2022 Filtrado por colegio" }))] })] }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nueva Venta"] })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6", children: _jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px] relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Buscar por c\u00F3digo o cliente...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), availableSchools.length > 1 && (_jsxs("select", { value: schoolFilter, onChange: (e) => setSchoolFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "", children: "Todos los colegios" }), availableSchools.map(school => (_jsx("option", { value: school.id, children: school.name }, school.id)))] })), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "completed", children: "Completadas" }), _jsx("option", { value: "paid", children: "Pagadas" }), _jsx("option", { value: "pending", children: "Pendientes" }), _jsx("option", { value: "cancelled", children: "Canceladas" })] })] }) }), loading && (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando ventas..." })] })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 mb-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar ventas" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadSales, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) })), !loading && !error && filteredSales.length > 0 && (_jsx("div", { className: "bg-white rounded-lg shadow-sm overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "C\u00F3digo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Fecha" }), availableSchools.length > 1 && (_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Colegio" })), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cliente" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Total" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "M\u00E9todo Pago" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: filteredSales.map((sale) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900", children: _jsxs("div", { className: "flex items-center flex-wrap gap-1", children: [sale.code, getSourceBadge(sale.source), getHistoricalBadge(sale.is_historical)] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Calendar, { className: "w-4 h-4 mr-2 text-gray-400" }), formatDate(sale.sale_date)] }) }), availableSchools.length > 1 && (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Building2, { className: "w-4 h-4 mr-2 text-gray-400" }), _jsx("span", { className: "truncate max-w-[150px]", title: sale.school_name || '', children: sale.school_name || 'Sin colegio' })] }) })), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center", children: [_jsx(User, { className: "w-4 h-4 mr-2 text-gray-400" }), sale.client_name || 'Venta directa'] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900", children: _jsxs("div", { className: "flex items-center", children: [_jsx(DollarSign, { className: "w-4 h-4 mr-1 text-gray-400" }), "$", Number(sale.total).toLocaleString()] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: sale.payment_method || 'N/A' }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: `px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sale.status)}`, children: getStatusText(sale.status) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: _jsxs("button", { onClick: () => navigate(`/sales/${sale.id}`), className: "text-blue-600 hover:text-blue-800 flex items-center transition", children: [_jsx(Eye, { className: "w-4 h-4 mr-1" }), "Ver"] }) })] }, sale.id))) })] }) })), !loading && !error && filteredSales.length === 0 && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-12 text-center", children: [_jsx(ShoppingCart, { className: "w-16 h-16 text-blue-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-blue-900 mb-2", children: searchTerm || statusFilter || schoolFilter ? 'No se encontraron ventas' : 'No hay ventas registradas' }), _jsx("p", { className: "text-blue-700 mb-4", children: searchTerm || statusFilter || schoolFilter
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'Comienza creando tu primera venta' }), !searchTerm && !statusFilter && !schoolFilter && (_jsxs("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nueva Venta"] }))] })), _jsx(SaleModal, { isOpen: isModalOpen, onClose: handleCloseModal, onSuccess: handleSuccess, initialSchoolId: schoolIdForCreate })] }));
}
