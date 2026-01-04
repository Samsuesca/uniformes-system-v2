import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Orders Page - List and manage custom orders (encargos) - Multi-school view
 *
 * Features:
 * - Clickable stats cards for quick filtering
 * - Product demand statistics
 * - Yomber indicator
 * - Refresh button
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import OrderModal from '../components/OrderModal';
import { FileText, Plus, Search, AlertCircle, Loader2, Calendar, Package, Clock, CheckCircle, XCircle, Truck, Eye, Building2, RefreshCw, Ruler, BarChart3, TrendingUp, X, Wrench, Receipt } from 'lucide-react';
import { formatDateSpanish } from '../components/DatePicker';
import { orderService } from '../services/orderService';
import { useSchoolStore } from '../stores/schoolStore';
export default function Orders() {
    const navigate = useNavigate();
    const { currentSchool, availableSchools, loadSchools } = useSchoolStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedOrderForPayment, setSelectedOrderForPayment] = useState(null);
    // Stats
    const [stats, setStats] = useState({
        pending: 0,
        inProduction: 0,
        ready: 0,
        delivered: 0,
        yombers: 0,
    });
    // Product demand statistics
    const [productDemand, setProductDemand] = useState([]);
    const [showProductStats, setShowProductStats] = useState(false);
    const [loadingProductStats, setLoadingProductStats] = useState(false);
    // Yombers modal for confeccionista
    const [showYombersModal, setShowYombersModal] = useState(false);
    const [yomberItems, setYomberItems] = useState([]);
    const [loadingYombers, setLoadingYombers] = useState(false);
    const [yomberStatusFilter, setYomberStatusFilter] = useState('all');
    const [updatingYomberStatus, setUpdatingYomberStatus] = useState(null);
    // Measurement labels in Spanish
    const measurementLabels = {
        delantero: 'Delantero',
        trasero: 'Trasero',
        cintura: 'Cintura',
        largo: 'Largo',
        espalda: 'Espalda',
        cadera: 'Cadera',
        hombro: 'Hombro',
        pierna: 'Pierna',
        entrepierna: 'Entrepierna',
        manga: 'Manga',
        cuello: 'Cuello',
        pecho: 'Pecho',
        busto: 'Busto',
        tiro: 'Tiro',
    };
    // For creating new orders, use current school or first available
    const schoolIdForCreate = currentSchool?.id || availableSchools[0]?.id || '';
    useEffect(() => {
        // Load schools if not already loaded
        if (availableSchools.length === 0) {
            loadSchools();
        }
        loadOrders();
    }, []);
    // Reload when filters change
    useEffect(() => {
        loadOrders();
    }, [statusFilter, schoolFilter]);
    const handleSuccess = () => {
        loadOrders();
    };
    const loadOrders = async () => {
        try {
            setLoading(true);
            setError(null);
            // Load orders from all schools or filtered
            const data = await orderService.getAllOrders({
                school_id: schoolFilter || undefined,
                status: statusFilter || undefined,
                limit: 100
            });
            // Filter out web portal orders - they are managed in WebOrders page
            const desktopOrders = data.filter(o => o.source !== 'web_portal');
            setOrders(desktopOrders);
            // Calculate stats from current data (excluding web portal orders)
            const allOrders = (statusFilter || schoolFilter)
                ? await orderService.getAllOrders({ school_id: schoolFilter || undefined })
                : data;
            const filteredForStats = allOrders.filter(o => o.source !== 'web_portal');
            setStats({
                pending: filteredForStats.filter(o => o.status === 'pending').length,
                inProduction: filteredForStats.filter(o => o.status === 'in_production').length,
                ready: filteredForStats.filter(o => o.status === 'ready').length,
                delivered: filteredForStats.filter(o => o.status === 'delivered').length,
                yombers: 0, // Will be calculated when loading product stats
            });
        }
        catch (err) {
            console.error('Error loading orders:', err);
            setError(err.response?.data?.detail || 'Error al cargar encargos');
        }
        finally {
            setLoading(false);
        }
    };
    // Load product demand statistics
    const loadProductStats = async () => {
        try {
            setLoadingProductStats(true);
            // Get all pending/in_production orders with their items
            const ordersToAnalyze = orders.filter(o => o.status === 'pending' || o.status === 'in_production');
            // Fetch full order details to get items
            const demandMap = new Map();
            let yomberCount = 0;
            for (const order of ordersToAnalyze) {
                try {
                    const fullOrder = await orderService.getOrder(order.school_id || '', order.id);
                    for (const item of fullOrder.items) {
                        const key = `${item.garment_type_name}|${item.size || 'N/A'}|${item.color || 'N/A'}`;
                        if (item.has_custom_measurements) {
                            yomberCount += item.quantity;
                        }
                        if (demandMap.has(key)) {
                            const existing = demandMap.get(key);
                            existing.total_quantity += item.quantity;
                            existing.pending_quantity += order.status === 'pending' ? item.quantity : 0;
                            existing.order_count += 1;
                        }
                        else {
                            demandMap.set(key, {
                                garment_type_name: item.garment_type_name,
                                size: item.size,
                                color: item.color,
                                total_quantity: item.quantity,
                                pending_quantity: order.status === 'pending' ? item.quantity : 0,
                                order_count: 1,
                                has_custom_measurements: item.has_custom_measurements,
                            });
                        }
                    }
                }
                catch (err) {
                    console.error(`Error loading order ${order.id}:`, err);
                }
            }
            // Sort by total quantity descending
            const sortedDemand = Array.from(demandMap.values())
                .sort((a, b) => b.total_quantity - a.total_quantity);
            setProductDemand(sortedDemand);
            setStats(prev => ({ ...prev, yombers: yomberCount }));
        }
        catch (err) {
            console.error('Error loading product stats:', err);
        }
        finally {
            setLoadingProductStats(false);
        }
    };
    // Load product stats when showing the panel
    useEffect(() => {
        if (showProductStats && productDemand.length === 0 && orders.length > 0) {
            loadProductStats();
        }
    }, [showProductStats, orders]);
    // Load all yomber items for confeccionista view
    const loadYomberItems = async () => {
        try {
            setLoadingYombers(true);
            const yombers = [];
            // Get orders that are not delivered/cancelled (active production)
            const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'in_production' || o.status === 'ready');
            for (const order of activeOrders) {
                try {
                    const fullOrder = await orderService.getOrder(order.school_id || '', order.id);
                    for (const item of fullOrder.items) {
                        // Only include items with custom measurements (Yombers) that are not delivered/cancelled
                        if (item.custom_measurements &&
                            typeof item.custom_measurements === 'object' &&
                            Object.keys(item.custom_measurements).length > 0 &&
                            !['delivered', 'cancelled'].includes(item.item_status)) {
                            yombers.push({
                                id: item.id,
                                order_id: order.id,
                                order_code: order.code,
                                order_status: order.status,
                                item_status: item.item_status,
                                school_id: order.school_id || '',
                                client_name: fullOrder.client_name || 'Sin cliente',
                                student_name: fullOrder.student_name,
                                delivery_date: order.delivery_date,
                                garment_type_name: item.garment_type_name,
                                quantity: item.quantity,
                                size: item.size,
                                color: item.color,
                                gender: item.gender,
                                custom_measurements: item.custom_measurements,
                                notes: item.notes,
                                created_at: order.created_at,
                            });
                        }
                    }
                }
                catch (err) {
                    console.error(`Error loading order ${order.id}:`, err);
                }
            }
            // Sort by item_status (pending first), then by delivery date, then by created date
            yombers.sort((a, b) => {
                // Prioritize by item_status: pending > in_production > ready
                const statusOrder = { pending: 0, in_production: 1, ready: 2 };
                const statusDiff = (statusOrder[a.item_status] ?? 3) - (statusOrder[b.item_status] ?? 3);
                if (statusDiff !== 0)
                    return statusDiff;
                // Then by delivery date
                if (a.delivery_date && b.delivery_date) {
                    return new Date(a.delivery_date).getTime() - new Date(b.delivery_date).getTime();
                }
                if (a.delivery_date)
                    return -1;
                if (b.delivery_date)
                    return 1;
                // Finally by created date
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });
            setYomberItems(yombers);
            setStats(prev => ({ ...prev, yombers: yombers.reduce((sum, y) => sum + y.quantity, 0) }));
        }
        catch (err) {
            console.error('Error loading yomber items:', err);
        }
        finally {
            setLoadingYombers(false);
        }
    };
    // Load yombers when opening modal
    useEffect(() => {
        if (showYombersModal && yomberItems.length === 0 && orders.length > 0) {
            loadYomberItems();
        }
    }, [showYombersModal, orders]);
    // Filter yomber items by item_status (individual item tracking)
    const filteredYomberItems = yomberItems.filter(item => {
        if (yomberStatusFilter === 'all')
            return true;
        return item.item_status === yomberStatusFilter;
    });
    // Yomber stats based on item_status
    const yomberStats = {
        pending: yomberItems.filter(y => y.item_status === 'pending').length,
        in_production: yomberItems.filter(y => y.item_status === 'in_production').length,
        ready: yomberItems.filter(y => y.item_status === 'ready').length,
        total: yomberItems.length,
        totalQuantity: yomberItems.reduce((sum, y) => sum + y.quantity, 0),
    };
    // Handle yomber item status change
    const handleYomberStatusChange = async (yomber, newStatus) => {
        try {
            setUpdatingYomberStatus(yomber.id);
            await orderService.updateItemStatus(yomber.school_id, yomber.order_id, yomber.id, newStatus);
            // Reload yombers to get updated statuses
            setYomberItems([]);
            await loadYomberItems();
        }
        catch (err) {
            console.error('Error updating yomber status:', err);
        }
        finally {
            setUpdatingYomberStatus(null);
        }
    };
    // Filter orders by search term
    const filteredOrders = orders.filter(order => {
        const searchLower = searchTerm.toLowerCase();
        return searchTerm === '' ||
            order.code.toLowerCase().includes(searchLower) ||
            (order.client_name && order.client_name.toLowerCase().includes(searchLower)) ||
            (order.student_name && order.student_name.toLowerCase().includes(searchLower));
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
    const formatDate = (dateString) => {
        if (!dateString)
            return 'Sin fecha';
        return formatDateSpanish(dateString);
    };
    const formatCurrency = (amount) => {
        return `$${Number(amount).toLocaleString()}`;
    };
    const getStatusConfig = (status) => {
        switch (status) {
            case 'pending':
                return {
                    label: 'Pendiente',
                    color: 'bg-yellow-100 text-yellow-800',
                    icon: _jsx(Clock, { className: "w-4 h-4" }),
                };
            case 'in_production':
                return {
                    label: 'En Producción',
                    color: 'bg-blue-100 text-blue-800',
                    icon: _jsx(Package, { className: "w-4 h-4" }),
                };
            case 'ready':
                return {
                    label: 'Listo',
                    color: 'bg-green-100 text-green-800',
                    icon: _jsx(CheckCircle, { className: "w-4 h-4" }),
                };
            case 'delivered':
                return {
                    label: 'Entregado',
                    color: 'bg-gray-100 text-gray-800',
                    icon: _jsx(Truck, { className: "w-4 h-4" }),
                };
            case 'cancelled':
                return {
                    label: 'Cancelado',
                    color: 'bg-red-100 text-red-800',
                    icon: _jsx(XCircle, { className: "w-4 h-4" }),
                };
            default:
                return {
                    label: status,
                    color: 'bg-gray-100 text-gray-800',
                    icon: null,
                };
        }
    };
    const handleViewOrder = (orderId, schoolId) => {
        navigate(`/orders/${orderId}?school_id=${schoolId}`);
    };
    const handleApprovePayment = async (orderId) => {
        if (!selectedOrderForPayment)
            return;
        try {
            await orderService.approvePayment(selectedOrderForPayment.school_id || '', orderId);
            setSelectedOrderForPayment(null);
            loadOrders();
        }
        catch (err) {
            console.error('Error approving payment:', err);
            alert(err.response?.data?.detail || 'Error al aprobar pago');
        }
    };
    const handleRejectPayment = async (orderId, rejectionNotes) => {
        if (!selectedOrderForPayment)
            return;
        try {
            await orderService.rejectPayment(selectedOrderForPayment.school_id || '', orderId, rejectionNotes);
            setSelectedOrderForPayment(null);
            loadOrders();
        }
        catch (err) {
            console.error('Error rejecting payment:', err);
            alert(err.response?.data?.detail || 'Error al rechazar pago');
        }
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Encargos" }), _jsxs("p", { className: "text-gray-600 mt-1", children: [loading ? 'Cargando...' : `${filteredOrders.length} encargos encontrados`, schoolFilter && availableSchools.length > 1 && (_jsx("span", { className: "ml-2 text-blue-600", children: "\u2022 Filtrado por colegio" })), statusFilter && (_jsx("span", { className: "ml-2 text-purple-600", children: "\u2022 Filtrado por estado" }))] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => {
                                    loadOrders();
                                    if (showProductStats) {
                                        setProductDemand([]);
                                        loadProductStats();
                                    }
                                }, disabled: loading, className: "bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-lg flex items-center transition disabled:opacity-50", title: "Actualizar", children: _jsx(RefreshCw, { className: `w-5 h-5 ${loading ? 'animate-spin' : ''}` }) }), _jsx("button", { onClick: () => setShowProductStats(!showProductStats), className: `px-3 py-2 rounded-lg flex items-center transition ${showProductStats
                                    ? 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                    : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`, title: "Estad\u00EDsticas de productos", children: _jsx(BarChart3, { className: "w-5 h-5" }) }), _jsxs("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Encargo"] })] })] }), _jsx(OrderModal, { isOpen: isModalOpen, onClose: () => setIsModalOpen(false), onSuccess: handleSuccess, initialSchoolId: schoolIdForCreate }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-5 gap-4 mb-6", children: [_jsx("button", { onClick: () => setStatusFilter(statusFilter === 'pending' ? '' : 'pending'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'pending'
                            ? 'bg-yellow-200 border-2 border-yellow-500 ring-2 ring-yellow-300'
                            : 'bg-yellow-50 border border-yellow-200 hover:border-yellow-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-yellow-700", children: "Pendientes" }), _jsx("p", { className: "text-2xl font-bold text-yellow-900", children: stats.pending })] }), _jsx(Clock, { className: "w-8 h-8 text-yellow-600" })] }) }), _jsx("button", { onClick: () => setStatusFilter(statusFilter === 'in_production' ? '' : 'in_production'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'in_production'
                            ? 'bg-blue-200 border-2 border-blue-500 ring-2 ring-blue-300'
                            : 'bg-blue-50 border border-blue-200 hover:border-blue-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-blue-700", children: "En Producci\u00F3n" }), _jsx("p", { className: "text-2xl font-bold text-blue-900", children: stats.inProduction })] }), _jsx(Package, { className: "w-8 h-8 text-blue-600" })] }) }), _jsx("button", { onClick: () => setStatusFilter(statusFilter === 'ready' ? '' : 'ready'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'ready'
                            ? 'bg-green-200 border-2 border-green-500 ring-2 ring-green-300'
                            : 'bg-green-50 border border-green-200 hover:border-green-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-green-700", children: "Listos" }), _jsx("p", { className: "text-2xl font-bold text-green-900", children: stats.ready })] }), _jsx(CheckCircle, { className: "w-8 h-8 text-green-600" })] }) }), _jsx("button", { onClick: () => setStatusFilter(statusFilter === 'delivered' ? '' : 'delivered'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'delivered'
                            ? 'bg-gray-300 border-2 border-gray-500 ring-2 ring-gray-300'
                            : 'bg-gray-50 border border-gray-200 hover:border-gray-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-700", children: "Entregados" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.delivered })] }), _jsx(Truck, { className: "w-8 h-8 text-gray-600" })] }) }), _jsxs("button", { onClick: () => setShowYombersModal(true), className: "text-left bg-purple-50 border border-purple-200 rounded-lg p-4 hover:bg-purple-100 hover:border-purple-400 transition-all cursor-pointer", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-purple-700", children: "Yombers" }), _jsx("p", { className: "text-2xl font-bold text-purple-900", children: loadingYombers ? '...' : stats.yombers })] }), _jsx(Ruler, { className: "w-8 h-8 text-purple-600" })] }), _jsx("p", { className: "text-xs text-purple-500 mt-1", children: "Click para ver detalle" })] })] }), statusFilter && (_jsx("div", { className: "mb-4", children: _jsxs("button", { onClick: () => setStatusFilter(''), className: "text-sm text-gray-600 hover:text-gray-800 flex items-center gap-1", children: [_jsx(XCircle, { className: "w-4 h-4" }), "Limpiar filtro de estado"] }) })), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6", children: _jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px] relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Buscar por c\u00F3digo, cliente, estudiante...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), availableSchools.length > 1 && (_jsxs("select", { value: schoolFilter, onChange: (e) => setSchoolFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "", children: "Todos los colegios" }), availableSchools.map(school => (_jsx("option", { value: school.id, children: school.name }, school.id)))] })), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "", children: "Todos los estados" }), _jsx("option", { value: "pending", children: "Pendiente" }), _jsx("option", { value: "in_production", children: "En Producci\u00F3n" }), _jsx("option", { value: "ready", children: "Listo" }), _jsx("option", { value: "delivered", children: "Entregado" }), _jsx("option", { value: "cancelled", children: "Cancelado" })] })] }) }), showProductStats && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6 mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(TrendingUp, { className: "w-5 h-5 mr-2 text-purple-600" }), "Demanda de Productos (Pendientes + En Producci\u00F3n)"] }), _jsxs("button", { onClick: loadProductStats, disabled: loadingProductStats, className: "text-sm text-purple-600 hover:text-purple-800 flex items-center gap-1", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${loadingProductStats ? 'animate-spin' : ''}` }), "Actualizar"] })] }), loadingProductStats && (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-purple-600 mr-2" }), _jsx("span", { className: "text-gray-600", children: "Analizando encargos..." })] })), !loadingProductStats && productDemand.length === 0 && (_jsx("p", { className: "text-gray-500 text-center py-4", children: "No hay encargos pendientes o en producci\u00F3n para analizar." })), !loadingProductStats && productDemand.length > 0 && (_jsxs("div", { className: "overflow-x-auto", children: [_jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Producto" }), _jsx("th", { className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Talla" }), _jsx("th", { className: "px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase", children: "Color" }), _jsx("th", { className: "px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase", children: "Tipo" }), _jsx("th", { className: "px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase", children: "Cantidad Total" }), _jsx("th", { className: "px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase", children: "Pendientes" }), _jsx("th", { className: "px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase", children: "# Encargos" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: productDemand.slice(0, 20).map((item, index) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-2 text-sm font-medium text-gray-900", children: item.garment_type_name }), _jsx("td", { className: "px-4 py-2 text-sm text-gray-600", children: item.size || '-' }), _jsx("td", { className: "px-4 py-2 text-sm text-gray-600", children: item.color || '-' }), _jsx("td", { className: "px-4 py-2 text-center", children: item.has_custom_measurements ? (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full", children: [_jsx(Ruler, { className: "w-3 h-3" }), "Yomber"] })) : (_jsx("span", { className: "text-xs text-gray-400", children: "Est\u00E1ndar" })) }), _jsx("td", { className: "px-4 py-2 text-right", children: _jsx("span", { className: "text-sm font-semibold text-gray-900", children: item.total_quantity }) }), _jsx("td", { className: "px-4 py-2 text-right", children: _jsx("span", { className: `text-sm font-medium ${item.pending_quantity > 0 ? 'text-yellow-700' : 'text-gray-500'}`, children: item.pending_quantity }) }), _jsx("td", { className: "px-4 py-2 text-right text-sm text-gray-600", children: item.order_count })] }, index))) })] }), productDemand.length > 20 && (_jsxs("p", { className: "text-xs text-gray-500 text-center mt-2", children: ["Mostrando los 20 productos m\u00E1s demandados de ", productDemand.length, " total"] }))] }))] })), loading && (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando encargos..." })] })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 mb-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar encargos" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadOrders, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) })), !loading && !error && filteredOrders.length > 0 && (_jsx("div", { className: "bg-white rounded-lg shadow-sm overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "C\u00F3digo" }), availableSchools.length > 1 && (_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Colegio" })), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cliente" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Entrega" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Total" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Saldo" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Items" }), _jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Comprobante" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: filteredOrders.map((order) => {
                                const statusConfig = getStatusConfig(order.status);
                                const hasBalance = order.balance > 0;
                                return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-6 py-4 whitespace-nowrap", children: [_jsx("span", { className: "text-sm font-medium text-gray-900", children: order.code }), getSourceBadge(order.source)] }), availableSchools.length > 1 && (_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Building2, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "truncate max-w-[120px]", title: order.school_name || '', children: order.school_name || 'Sin colegio' }), order.school_name?.startsWith('+') && (_jsx("span", { className: "px-2 py-0.5 text-xs bg-yellow-100 text-yellow-800 rounded font-medium whitespace-nowrap", children: "+Colegio Nuevo" }))] }) })), _jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "text-sm text-gray-900", children: order.client_name || 'Sin cliente' }), order.student_name && (_jsx("div", { className: "text-xs text-gray-500", children: order.student_name }))] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("span", { className: `px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${statusConfig.color}`, children: [statusConfig.icon, statusConfig.label] }), order.items_delivered > 0 && order.items_delivered < order.items_total && (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx("span", { className: "px-2 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full", children: "Entrega Parcial" }), _jsxs("span", { className: "text-xs text-gray-500", children: [order.items_delivered, "/", order.items_total] })] }))] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(Calendar, { className: "w-4 h-4 mr-1 text-gray-400" }), formatDate(order.delivery_date)] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right", children: _jsx("span", { className: "text-sm font-medium text-gray-900", children: formatCurrency(order.total) }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right", children: _jsx("span", { className: `text-sm font-medium ${hasBalance ? 'text-red-600' : 'text-green-600'}`, children: hasBalance ? formatCurrency(order.balance) : 'Pagado' }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right", children: _jsx("span", { className: "text-sm text-gray-600", children: order.items_count }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-center", children: order.payment_proof_url ? (_jsxs("button", { onClick: () => setSelectedOrderForPayment(order), className: "text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50 transition inline-flex items-center gap-1", title: "Ver comprobante de pago", children: [_jsx(Receipt, { className: "w-5 h-5" }), _jsx("span", { className: "text-xs", children: "Ver" })] })) : (_jsx("span", { className: "text-xs text-gray-400", children: "Sin comprobante" })) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right", children: _jsx("button", { onClick: () => handleViewOrder(order.id, order.school_id || ''), className: "text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition", title: "Ver detalle", children: _jsx(Eye, { className: "w-5 h-5" }) }) })] }, order.id));
                            }) })] }) })), !loading && !error && filteredOrders.length === 0 && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-12 text-center", children: [_jsx(FileText, { className: "w-16 h-16 text-blue-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-blue-900 mb-2", children: searchTerm || statusFilter || schoolFilter ? 'No se encontraron encargos' : 'No hay encargos' }), _jsx("p", { className: "text-blue-700 mb-4", children: searchTerm || statusFilter || schoolFilter
                            ? 'Intenta ajustar los filtros de búsqueda'
                            : 'Comienza creando tu primer encargo' }), !searchTerm && !statusFilter && !schoolFilter && (_jsxs("button", { onClick: () => setIsModalOpen(true), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Encargo"] }))] })), showYombersModal && (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: () => setShowYombersModal(false) }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 bg-purple-50", children: [_jsxs("div", { children: [_jsxs("h2", { className: "text-xl font-bold text-purple-800 flex items-center", children: [_jsx(Ruler, { className: "w-6 h-6 mr-2" }), "Vista de Confecci\u00F3n - Yombers"] }), _jsxs("p", { className: "text-sm text-purple-600 mt-1", children: [yomberStats.total, " yombers pendientes (", yomberStats.totalQuantity, " unidades)"] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => {
                                                        setYomberItems([]);
                                                        loadYomberItems();
                                                    }, disabled: loadingYombers, className: "p-2 text-purple-600 hover:bg-purple-100 rounded-lg transition", title: "Actualizar", children: _jsx(RefreshCw, { className: `w-5 h-5 ${loadingYombers ? 'animate-spin' : ''}` }) }), _jsx("button", { onClick: () => setShowYombersModal(false), className: "p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition", children: _jsx(X, { className: "w-6 h-6" }) })] })] }), _jsx("div", { className: "p-4 border-b border-gray-200 bg-gray-50", children: _jsxs("div", { className: "flex flex-wrap gap-3", children: [_jsxs("button", { onClick: () => setYomberStatusFilter('all'), className: `px-4 py-2 rounded-lg text-sm font-medium transition ${yomberStatusFilter === 'all'
                                                    ? 'bg-purple-600 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-purple-400'}`, children: ["Todos (", yomberStats.total, ")"] }), _jsxs("button", { onClick: () => setYomberStatusFilter('pending'), className: `px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${yomberStatusFilter === 'pending'
                                                    ? 'bg-yellow-500 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-yellow-400'}`, children: [_jsx(Clock, { className: "w-4 h-4" }), "Pendientes (", yomberStats.pending, ")"] }), _jsxs("button", { onClick: () => setYomberStatusFilter('in_production'), className: `px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${yomberStatusFilter === 'in_production'
                                                    ? 'bg-blue-500 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-400'}`, children: [_jsx(Wrench, { className: "w-4 h-4" }), "En Producci\u00F3n (", yomberStats.in_production, ")"] }), _jsxs("button", { onClick: () => setYomberStatusFilter('ready'), className: `px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2 ${yomberStatusFilter === 'ready'
                                                    ? 'bg-green-500 text-white'
                                                    : 'bg-white border border-gray-300 text-gray-700 hover:border-green-400'}`, children: [_jsx(CheckCircle, { className: "w-4 h-4" }), "Listos (", yomberStats.ready, ")"] })] }) }), _jsx("div", { className: "flex-1 overflow-y-auto p-4", children: loadingYombers ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-purple-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando yombers..." })] })) : filteredYomberItems.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(Ruler, { className: "w-16 h-16 text-gray-300 mx-auto mb-4" }), _jsx("p", { className: "text-gray-500", children: yomberItems.length === 0
                                                    ? 'No hay yombers en producción'
                                                    : 'No hay yombers con este filtro' })] })) : (_jsx("div", { className: "space-y-4", children: filteredYomberItems.map((yomber) => {
                                            const statusConfig = {
                                                pending: { label: 'Pendiente', color: 'text-yellow-700', bg: 'bg-yellow-100', icon: '🟡' },
                                                in_production: { label: 'En Producción', color: 'text-blue-700', bg: 'bg-blue-100', icon: '🔵' },
                                                ready: { label: 'Listo', color: 'text-green-700', bg: 'bg-green-100', icon: '🟢' },
                                            };
                                            const status = statusConfig[yomber.item_status] || statusConfig.pending;
                                            const isUpdating = updatingYomberStatus === yomber.id;
                                            return (_jsxs("div", { className: "bg-white border border-purple-200 rounded-lg p-4 hover:shadow-md transition", children: [_jsxs("div", { className: "flex items-start justify-between mb-3", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2 mb-1", children: [_jsx("span", { className: "font-mono font-bold text-purple-700", children: yomber.order_code }), _jsxs("span", { className: `px-2 py-0.5 rounded text-xs font-medium ${status.bg} ${status.color}`, children: [status.icon, " ", status.label] }), _jsxs("span", { className: "text-sm text-gray-500", children: ["x", yomber.quantity] })] }), _jsxs("p", { className: "text-sm text-gray-700", children: [_jsx("span", { className: "font-medium", children: yomber.garment_type_name }), yomber.size && ` - Talla ${yomber.size}`, yomber.color && ` - ${yomber.color}`] }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Cliente: ", yomber.client_name, yomber.student_name && ` (${yomber.student_name})`] })] }), _jsxs("div", { className: "text-right", children: [yomber.delivery_date && (_jsxs("p", { className: "text-sm", children: [_jsx("span", { className: "text-gray-500", children: "Entrega:" }), ' ', _jsx("span", { className: "font-medium text-purple-700", children: formatDateSpanish(yomber.delivery_date) })] })), _jsx("button", { onClick: () => {
                                                                            setShowYombersModal(false);
                                                                            navigate(`/orders/${yomber.order_id}`);
                                                                        }, className: "text-xs text-purple-600 hover:text-purple-800 mt-1", children: "Ver encargo \u2192" })] })] }), _jsxs("div", { className: "bg-purple-50 rounded-lg p-3", children: [_jsx("p", { className: "text-xs text-purple-600 uppercase font-medium mb-2", children: "Medidas" }), _jsxs("div", { className: "grid grid-cols-4 sm:grid-cols-7 gap-2", children: [['delantero', 'trasero', 'cintura', 'largo'].map(key => {
                                                                        const value = yomber.custom_measurements[key];
                                                                        if (value === undefined)
                                                                            return null;
                                                                        return (_jsxs("div", { className: "bg-white rounded px-2 py-1.5 text-center border border-purple-200", children: [_jsx("span", { className: "text-xs text-purple-600 block", children: measurementLabels[key] }), _jsx("span", { className: "text-lg font-bold text-purple-800", children: value })] }, key));
                                                                    }), Object.entries(yomber.custom_measurements)
                                                                        .filter(([key]) => !['delantero', 'trasero', 'cintura', 'largo'].includes(key))
                                                                        .map(([key, value]) => (_jsxs("div", { className: "bg-gray-50 rounded px-2 py-1.5 text-center", children: [_jsx("span", { className: "text-xs text-gray-500 block", children: measurementLabels[key] || key }), _jsx("span", { className: "text-sm font-semibold text-gray-700", children: value })] }, key)))] })] }), yomber.notes && (_jsxs("div", { className: "mt-2 text-sm text-gray-600 bg-yellow-50 rounded px-3 py-2", children: [_jsx("span", { className: "font-medium", children: "Notas:" }), " ", yomber.notes] })), _jsx("div", { className: "mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-2", children: isUpdating ? (_jsxs("div", { className: "flex items-center text-sm text-gray-500", children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin mr-2" }), "Actualizando..."] })) : (_jsxs(_Fragment, { children: [yomber.item_status === 'pending' && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleYomberStatusChange(yomber, 'in_production'), className: "px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition flex items-center gap-1", children: [_jsx(Wrench, { className: "w-3 h-3" }), "Iniciar Producci\u00F3n"] }), _jsxs("button", { onClick: () => handleYomberStatusChange(yomber, 'ready'), className: "px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-1", children: [_jsx(CheckCircle, { className: "w-3 h-3" }), "Marcar Listo"] })] })), yomber.item_status === 'in_production' && (_jsxs(_Fragment, { children: [_jsxs("button", { onClick: () => handleYomberStatusChange(yomber, 'ready'), className: "px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition flex items-center gap-1", children: [_jsx(CheckCircle, { className: "w-3 h-3" }), "Marcar Listo"] }), _jsxs("button", { onClick: () => handleYomberStatusChange(yomber, 'delivered'), className: "px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-1", children: [_jsx(Truck, { className: "w-3 h-3" }), "Entregar"] })] })), yomber.item_status === 'ready' && (_jsxs("button", { onClick: () => handleYomberStatusChange(yomber, 'delivered'), className: "px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition flex items-center gap-1", children: [_jsx(Truck, { className: "w-3 h-3" }), "Marcar Entregado"] }))] })) })] }, yomber.id));
                                        }) })) }), _jsx("div", { className: "p-4 border-t border-gray-200 bg-gray-50 text-center", children: _jsxs("p", { className: "text-sm text-gray-500", children: ["Mostrando ", filteredYomberItems.length, " de ", yomberItems.length, " yombers"] }) })] }) })] }))] }));
}
