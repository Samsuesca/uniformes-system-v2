import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Sale Changes Page - Create and manage change/return requests
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SaleChangeModal from '../components/SaleChangeModal';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Eye, Search, Plus, ShoppingCart } from 'lucide-react';
import { formatDateTimeSpanish } from '../components/DatePicker';
import { saleChangeService } from '../services/saleChangeService';
import { saleService } from '../services/saleService';
import { useSchoolStore } from '../stores/schoolStore';
export default function SaleChanges() {
    const navigate = useNavigate();
    const { currentSchool } = useSchoolStore();
    const [changes, setChanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingId, setProcessingId] = useState(null);
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    // Search for sales to create changes
    const [showSaleSearch, setShowSaleSearch] = useState(false);
    const [saleSearchTerm, setSaleSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [allSales, setAllSales] = useState([]);
    // Modal for creating change
    const [showChangeModal, setShowChangeModal] = useState(false);
    const [selectedSale, setSelectedSale] = useState(null);
    const [loadingSale, setLoadingSale] = useState(false);
    // Approval modal with payment method selection
    const [showApproveModal, setShowApproveModal] = useState(false);
    const [approveChangeData, setApproveChangeData] = useState(null);
    const [approvePaymentMethod, setApprovePaymentMethod] = useState('cash');
    const schoolId = currentSchool?.id || '';
    // Recargar datos cuando cambia el colegio seleccionado
    useEffect(() => {
        if (schoolId) {
            loadAllChanges();
            loadAllSales();
        }
    }, [schoolId]);
    const loadAllSales = async () => {
        try {
            const sales = await saleService.getSales(schoolId);
            // Only completed sales can have changes
            setAllSales(sales.filter(s => s.status === 'completed'));
        }
        catch (err) {
            console.error('Error loading sales:', err);
        }
    };
    // Search sales when typing
    useEffect(() => {
        if (!saleSearchTerm.trim()) {
            setSearchResults(allSales.slice(0, 10));
            return;
        }
        const term = saleSearchTerm.toLowerCase();
        const filtered = allSales.filter(sale => sale.code.toLowerCase().includes(term) ||
            (sale.client_name && sale.client_name.toLowerCase().includes(term)));
        setSearchResults(filtered.slice(0, 10));
    }, [saleSearchTerm, allSales]);
    const handleSelectSale = async (sale) => {
        try {
            setLoadingSale(true);
            const fullSale = await saleService.getSaleWithItems(schoolId, sale.id);
            setSelectedSale(fullSale);
            setShowSaleSearch(false);
            setShowChangeModal(true);
        }
        catch (err) {
            console.error('Error loading sale details:', err);
            alert('Error al cargar los detalles de la venta');
        }
        finally {
            setLoadingSale(false);
        }
    };
    const handleChangeCreated = () => {
        setShowChangeModal(false);
        setSelectedSale(null);
        loadAllChanges();
    };
    const loadAllChanges = async () => {
        try {
            setLoading(true);
            setError(null);
            // Get all sales first
            const sales = await saleService.getSales(schoolId);
            // Get changes for each sale
            const allChanges = [];
            for (const sale of sales) {
                try {
                    const saleChanges = await saleChangeService.getSaleChanges(schoolId, sale.id);
                    allChanges.push(...saleChanges);
                }
                catch (err) {
                    console.error(`Error loading changes for sale ${sale.id}:`, err);
                }
            }
            setChanges(allChanges);
        }
        catch (err) {
            console.error('Error loading changes:', err);
            setError(err.response?.data?.detail || 'Error al cargar las solicitudes de cambio');
        }
        finally {
            setLoading(false);
        }
    };
    // Open approval modal to select payment method
    const handleApproveClick = (change) => {
        const priceAdjustment = Number(change.price_adjustment);
        if (priceAdjustment !== 0) {
            // Show modal to select payment method for refund or additional payment
            setApproveChangeData({
                saleId: change.sale_id,
                changeId: change.id,
                priceAdjustment
            });
            setApprovePaymentMethod('cash');
            setShowApproveModal(true);
        }
        else {
            // No price adjustment, approve directly
            handleApprove(change.sale_id, change.id);
        }
    };
    const handleApprove = async (saleId, changeId, paymentMethod) => {
        if (!confirm('¿Confirmar aprobación de este cambio? Se ajustará el inventario automáticamente.')) {
            return;
        }
        try {
            setProcessingId(changeId);
            setError(null);
            setShowApproveModal(false);
            await saleChangeService.approveChange(schoolId, saleId, changeId, paymentMethod);
            setApproveChangeData(null);
            await loadAllChanges();
        }
        catch (err) {
            console.error('Error approving change:', err);
            setError(err.response?.data?.detail || 'Error al aprobar el cambio');
        }
        finally {
            setProcessingId(null);
        }
    };
    const handleReject = async (saleId, changeId) => {
        const reason = prompt('Motivo del rechazo (obligatorio):');
        if (!reason || reason.trim() === '') {
            alert('Debes proporcionar un motivo de rechazo');
            return;
        }
        try {
            setProcessingId(changeId);
            setError(null);
            await saleChangeService.rejectChange(schoolId, saleId, changeId, reason);
            await loadAllChanges();
        }
        catch (err) {
            console.error('Error rejecting change:', err);
            setError(err.response?.data?.detail || 'Error al rechazar el cambio');
        }
        finally {
            setProcessingId(null);
        }
    };
    const formatDate = (dateString) => {
        return formatDateTimeSpanish(dateString);
    };
    const getChangeTypeLabel = (type) => {
        switch (type) {
            case 'size_change': return 'Cambio de Talla';
            case 'product_change': return 'Cambio de Producto';
            case 'return': return 'Devolución';
            case 'defect': return 'Producto Defectuoso';
            default: return type;
        }
    };
    const getChangeStatusColor = (status) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'approved': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getChangeStatusIcon = (status) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'approved': return _jsx(CheckCircle, { className: "w-4 h-4" });
            case 'pending': return _jsx(Clock, { className: "w-4 h-4" });
            case 'rejected': return _jsx(XCircle, { className: "w-4 h-4" });
            default: return null;
        }
    };
    const getStatusLabel = (status) => {
        const s = status.toLowerCase();
        switch (s) {
            case 'approved': return 'Aprobado';
            case 'pending': return 'Pendiente';
            case 'rejected': return 'Rechazado';
            default: return status;
        }
    };
    // Filter changes (case-insensitive)
    const filteredChanges = changes.filter(change => {
        const matchesStatus = statusFilter === '' || change.status.toLowerCase() === statusFilter.toLowerCase();
        const matchesType = typeFilter === '' || change.change_type === typeFilter;
        return matchesStatus && matchesType;
    });
    // Sort by date (newest first)
    const sortedChanges = [...filteredChanges].sort((a, b) => new Date(b.change_date).getTime() - new Date(a.change_date).getTime());
    const pendingCount = changes.filter(c => c.status.toLowerCase() === 'pending').length;
    const approvedCount = changes.filter(c => c.status.toLowerCase() === 'approved').length;
    const rejectedCount = changes.filter(c => c.status.toLowerCase() === 'rejected').length;
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800 flex items-center", children: [_jsx(RefreshCw, { className: "w-8 h-8 mr-3 text-blue-600" }), "Gesti\u00F3n de Cambios y Devoluciones"] }), _jsx("p", { className: "text-gray-600 mt-1", children: loading ? 'Cargando...' : `${filteredChanges.length} solicitudes encontradas` })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => {
                                            loadAllChanges();
                                            loadAllSales();
                                        }, disabled: loading, className: "bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center transition disabled:opacity-50", title: "Actualizar lista", children: _jsx(RefreshCw, { className: `w-5 h-5 ${loading ? 'animate-spin' : ''}` }) }), _jsxs("button", { onClick: () => setShowSaleSearch(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Cambio/Devoluci\u00F3n"] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4 mb-6", children: [_jsx("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-yellow-700", children: "Pendientes" }), _jsx("p", { className: "text-2xl font-bold text-yellow-900", children: pendingCount })] }), _jsx(Clock, { className: "w-8 h-8 text-yellow-600" })] }) }), _jsx("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-green-700", children: "Aprobadas" }), _jsx("p", { className: "text-2xl font-bold text-green-900", children: approvedCount })] }), _jsx(CheckCircle, { className: "w-8 h-8 text-green-600" })] }) }), _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-red-700", children: "Rechazadas" }), _jsx("p", { className: "text-2xl font-bold text-red-900", children: rejectedCount })] }), _jsx(XCircle, { className: "w-8 h-8 text-red-600" })] }) })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6", children: _jsxs("div", { className: "flex items-center gap-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Search, { className: "w-5 h-5 text-gray-400" }), _jsx("span", { className: "text-sm font-medium text-gray-700", children: "Filtros:" })] }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "PENDING", children: "Pendientes" }), _jsx("option", { value: "APPROVED", children: "Aprobadas" }), _jsx("option", { value: "REJECTED", children: "Rechazadas" })] }), _jsxs("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "", children: "Todos los tipos" }), _jsx("option", { value: "size_change", children: "Cambio de Talla" }), _jsx("option", { value: "product_change", children: "Cambio de Producto" }), _jsx("option", { value: "return", children: "Devoluci\u00F3n" }), _jsx("option", { value: "defect", children: "Producto Defectuoso" })] })] }) })] }), showSaleSearch && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden", children: [_jsxs("div", { className: "p-6 border-b border-gray-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h2", { className: "text-xl font-bold text-gray-800 flex items-center", children: [_jsx(ShoppingCart, { className: "w-6 h-6 mr-2 text-blue-600" }), "Buscar Venta"] }), _jsx("button", { onClick: () => setShowSaleSearch(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(XCircle, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Buscar por c\u00F3digo de venta o nombre de cliente...", value: saleSearchTerm, onChange: (e) => setSaleSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", autoFocus: true })] })] }), _jsxs("div", { className: "overflow-y-auto max-h-[50vh]", children: [loadingSale && (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-blue-600 mr-2" }), _jsx("span", { children: "Cargando detalles de la venta..." })] })), !loadingSale && searchResults.length === 0 && (_jsxs("div", { className: "text-center py-8 text-gray-500", children: [_jsx(ShoppingCart, { className: "w-12 h-12 mx-auto mb-3 text-gray-300" }), _jsx("p", { children: "No se encontraron ventas completadas" }), _jsx("p", { className: "text-sm mt-1", children: "Solo las ventas completadas pueden tener cambios o devoluciones" })] })), !loadingSale && searchResults.map(sale => (_jsxs("button", { onClick: () => handleSelectSale(sale), className: "w-full p-4 border-b border-gray-100 hover:bg-blue-50 text-left transition flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: sale.code }), _jsxs("p", { className: "text-sm text-gray-600", children: [sale.client_name || 'Sin cliente', " \u2022 ", sale.items_count, " items"] }), _jsx("p", { className: "text-xs text-gray-400", children: formatDate(sale.sale_date) })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "font-semibold text-gray-900", children: ["$", Number(sale.total).toLocaleString()] }), _jsx("span", { className: "text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full", children: "Completada" })] })] }, sale.id)))] }), _jsx("div", { className: "p-4 border-t border-gray-200 bg-gray-50", children: _jsx("p", { className: "text-sm text-gray-600 text-center", children: "Selecciona una venta para crear un cambio o devoluci\u00F3n" }) })] }) })), showChangeModal && selectedSale && (_jsx(SaleChangeModal, { isOpen: showChangeModal, onClose: () => {
                    setShowChangeModal(false);
                    setSelectedSale(null);
                }, saleId: selectedSale.id, saleItems: selectedSale.items, schoolId: schoolId, onSuccess: handleChangeCreated })), loading && (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando solicitudes..." })] })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 mb-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadAllChanges, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) })), !loading && sortedChanges.length > 0 && (_jsx("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Venta" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Fecha" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tipo" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cant. Dev." }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cant. Nueva" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Ajuste" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Motivo" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: sortedChanges.map((change) => {
                                    const isProcessing = processingId === change.id;
                                    const isPending = change.status.toLowerCase() === 'pending';
                                    return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("button", { onClick: () => navigate(`/sales/${change.sale_id}`), className: "text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center", children: [change.sale_code, _jsx(Eye, { className: "w-4 h-4 ml-1" })] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: formatDate(change.change_date) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: getChangeTypeLabel(change.change_type) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: change.returned_quantity }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: change.new_quantity }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-right", children: _jsxs("span", { className: Number(change.price_adjustment) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium', children: ["$", Number(change.price_adjustment).toLocaleString()] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("span", { className: `px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${getChangeStatusColor(change.status)}`, children: [getChangeStatusIcon(change.status), getStatusLabel(change.status)] }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600 max-w-xs truncate", children: change.reason || '-' }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: [isPending && !isProcessing && (_jsxs("div", { className: "flex items-center justify-end gap-2", children: [_jsx("button", { onClick: () => handleApproveClick(change), className: "text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50 transition", title: "Aprobar", children: _jsx(CheckCircle, { className: "w-5 h-5" }) }), _jsx("button", { onClick: () => handleReject(change.sale_id, change.id), className: "text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition", title: "Rechazar", children: _jsx(XCircle, { className: "w-5 h-5" }) })] })), isProcessing && (_jsx(Loader2, { className: "w-5 h-5 animate-spin text-blue-600 mx-auto" })), !isPending && !isProcessing && (_jsx("span", { className: "text-gray-400 text-xs", children: "-" }))] })] }, change.id));
                                }) })] }) }) })), !loading && sortedChanges.length === 0 && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-12 text-center", children: [_jsx(RefreshCw, { className: "w-16 h-16 text-blue-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-blue-900 mb-2", children: statusFilter || typeFilter ? 'No se encontraron solicitudes' : 'No hay solicitudes de cambio' }), _jsx("p", { className: "text-blue-700 mb-4", children: statusFilter || typeFilter
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'Las solicitudes de cambio y devolución aparecerán aquí' }), !statusFilter && !typeFilter && (_jsxs("button", { onClick: () => setShowSaleSearch(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Crear Cambio/Devoluci\u00F3n"] }))] })), showApproveModal && approveChangeData && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("h2", { className: "text-xl font-bold text-gray-800 flex items-center", children: [_jsx(CheckCircle, { className: "w-6 h-6 mr-2 text-green-600" }), "Aprobar Cambio"] }) }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: `p-4 rounded-lg ${approveChangeData.priceAdjustment < 0 ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`, children: [_jsx("p", { className: "text-sm font-medium mb-1", children: approveChangeData.priceAdjustment < 0 ? 'Reembolso al cliente:' : 'Cobro adicional:' }), _jsxs("p", { className: `text-2xl font-bold ${approveChangeData.priceAdjustment < 0 ? 'text-red-600' : 'text-green-600'}`, children: ["$", Math.abs(approveChangeData.priceAdjustment).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: approveChangeData.priceAdjustment < 0 ? 'Método de Reembolso:' : 'Método de Pago:' }), _jsxs("select", { value: approvePaymentMethod, onChange: (e) => setApprovePaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "cash", children: "Efectivo" }), _jsx("option", { value: "nequi", children: "Nequi" }), _jsx("option", { value: "transfer", children: "Transferencia" }), _jsx("option", { value: "card", children: "Tarjeta" })] }), _jsx("p", { className: "mt-1 text-xs text-gray-500", children: approveChangeData.priceAdjustment < 0
                                                ? 'Selecciona cómo se realizará el reembolso al cliente'
                                                : 'Selecciona cómo pagará el cliente la diferencia' })] })] }), _jsxs("div", { className: "flex gap-3 p-6 border-t border-gray-200", children: [_jsx("button", { onClick: () => {
                                        setShowApproveModal(false);
                                        setApproveChangeData(null);
                                    }, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition", children: "Cancelar" }), _jsxs("button", { onClick: () => handleApprove(approveChangeData.saleId, approveChangeData.changeId, approvePaymentMethod), className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center", children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-2" }), "Confirmar Aprobaci\u00F3n"] })] })] }) }))] }));
}
