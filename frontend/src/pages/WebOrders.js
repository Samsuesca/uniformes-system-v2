import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * WebOrders - Page to manage orders from web portal
 * Filters orders with source='web_portal' and user_id=NULL
 * Includes stock verification and smart approval
 */
import { useState, useEffect, useMemo } from 'react';
import { Globe, Loader2, Search, Filter, RefreshCw, Clock, Wrench, CheckCircle, Package, Phone, Eye, DollarSign, AlertCircle, X, MessageCircle, ChevronRight, PackageCheck, PackageX, Boxes, Sparkles, Factory, Image as ImageIcon, FileText, Home, Truck } from 'lucide-react';
import Layout from '../components/Layout';
import { formatDateSpanish } from '../components/DatePicker';
import { useSchoolStore } from '../stores/schoolStore';
import { orderService } from '../services/orderService';
// Status configuration
const STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: 'text-yellow-700', icon: Clock, bgColor: 'bg-yellow-100' },
    in_production: { label: 'En Produccion', color: 'text-blue-700', icon: Wrench, bgColor: 'bg-blue-100' },
    ready: { label: 'Listo', color: 'text-green-700', icon: CheckCircle, bgColor: 'bg-green-100' },
    delivered: { label: 'Entregado', color: 'text-gray-700', icon: Package, bgColor: 'bg-gray-100' },
    cancelled: { label: 'Cancelado', color: 'text-red-700', icon: X, bgColor: 'bg-red-100' },
};
export default function WebOrders() {
    const { availableSchools } = useSchoolStore();
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [deliveryFilter, setDeliveryFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    // Detail modal
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [selectedOrderSchoolId, setSelectedOrderSchoolId] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    // Stock verification
    const [stockVerification, setStockVerification] = useState(null);
    const [loadingStock, setLoadingStock] = useState(false);
    const [approvingOrder, setApprovingOrder] = useState(false);
    // Payment modal
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState(0);
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentRef, setPaymentRef] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    // Status update
    const [updatingStatus, setUpdatingStatus] = useState(false);
    // Payment proof modal
    const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
    const [paymentProofUrl, setPaymentProofUrl] = useState(null);
    const [processingPaymentProof, setProcessingPaymentProof] = useState(false);
    useEffect(() => {
        if (availableSchools.length > 0) {
            loadOrders();
        }
    }, [availableSchools]);
    const loadOrders = async () => {
        if (availableSchools.length === 0)
            return;
        try {
            setLoading(true);
            setError(null);
            // Load orders from ALL available schools (not just current)
            const ordersPromises = availableSchools.map(school => orderService.getAllOrders({ school_id: school.id })
                .then(orders => orders.map(o => ({ ...o, school_name: school.name })))
                .catch(() => []) // Ignore errors for individual schools
            );
            const allSchoolOrders = await Promise.all(ordersPromises);
            const allOrders = allSchoolOrders.flat();
            // Filter for web portal orders (source = web_portal)
            const webOrders = allOrders
                .filter(o => o.source === 'web_portal')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            setOrders(webOrders);
        }
        catch (err) {
            console.error('Error loading web orders:', err);
            setError('Error al cargar pedidos web');
        }
        finally {
            setLoading(false);
        }
    };
    // Filter orders
    const filteredOrders = useMemo(() => {
        return orders.filter(order => {
            // Status filter
            if (statusFilter !== 'all' && order.status !== statusFilter)
                return false;
            // Delivery type filter
            if (deliveryFilter !== 'all') {
                const orderDeliveryType = order.delivery_type || 'pickup';
                if (orderDeliveryType !== deliveryFilter)
                    return false;
            }
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesCode = order.code.toLowerCase().includes(query);
                const matchesClient = order.client_name?.toLowerCase().includes(query);
                const matchesStudent = order.student_name?.toLowerCase().includes(query);
                if (!matchesCode && !matchesClient && !matchesStudent)
                    return false;
            }
            return true;
        });
    }, [orders, statusFilter, deliveryFilter, searchQuery]);
    // Statistics
    const stats = useMemo(() => {
        const webOrders = orders;
        return {
            pending: webOrders.filter(o => o.status === 'pending').length,
            in_production: webOrders.filter(o => o.status === 'in_production').length,
            ready: webOrders.filter(o => o.status === 'ready').length,
            delivered: webOrders.filter(o => o.status === 'delivered').length,
            total: webOrders.length,
            totalPending: webOrders.reduce((sum, o) => sum + (Number(o.balance) || 0), 0),
            // Delivery stats
            deliveryOrders: webOrders.filter(o => o.delivery_type === 'delivery').length,
            pickupOrders: webOrders.filter(o => o.delivery_type !== 'delivery').length,
        };
    }, [orders]);
    const handleViewDetail = async (orderId, schoolId) => {
        try {
            setLoadingDetail(true);
            setSelectedOrderSchoolId(schoolId);
            setStockVerification(null);
            const order = await orderService.getOrder(schoolId, orderId);
            setSelectedOrder(order);
            setShowDetailModal(true);
            // Load stock verification for pending orders
            if (order.status === 'pending') {
                setLoadingStock(true);
                try {
                    const stockInfo = await orderService.verifyOrderStock(schoolId, orderId);
                    setStockVerification(stockInfo);
                }
                catch (err) {
                    console.error('Error loading stock verification:', err);
                }
                finally {
                    setLoadingStock(false);
                }
            }
        }
        catch (err) {
            console.error('Error loading order detail:', err);
            setError('Error al cargar detalle del pedido');
        }
        finally {
            setLoadingDetail(false);
        }
    };
    const handleApproveWithStock = async (autoFulfill = true) => {
        if (!selectedOrderSchoolId || !selectedOrder)
            return;
        try {
            setApprovingOrder(true);
            await orderService.approveOrderWithStock(selectedOrderSchoolId, selectedOrder.id, {
                auto_fulfill_if_stock: autoFulfill
            });
            // Reload order detail and list
            const updatedOrder = await orderService.getOrder(selectedOrderSchoolId, selectedOrder.id);
            setSelectedOrder(updatedOrder);
            setStockVerification(null);
            loadOrders();
        }
        catch (err) {
            console.error('Error approving order:', err);
            setError(err.response?.data?.detail || 'Error al aprobar pedido');
        }
        finally {
            setApprovingOrder(false);
        }
    };
    const handleUpdateStatus = async (newStatus) => {
        if (!selectedOrderSchoolId || !selectedOrder)
            return;
        try {
            setUpdatingStatus(true);
            await orderService.updateStatus(selectedOrderSchoolId, selectedOrder.id, newStatus);
            // Reload order detail and list
            const updatedOrder = await orderService.getOrder(selectedOrderSchoolId, selectedOrder.id);
            setSelectedOrder(updatedOrder);
            loadOrders();
        }
        catch (err) {
            console.error('Error updating status:', err);
            setError('Error al actualizar estado');
        }
        finally {
            setUpdatingStatus(false);
        }
    };
    const handleAddPayment = async () => {
        if (!selectedOrderSchoolId || !selectedOrder || paymentAmount <= 0)
            return;
        try {
            setProcessingPayment(true);
            await orderService.addPayment(selectedOrderSchoolId, selectedOrder.id, {
                amount: paymentAmount,
                payment_method: paymentMethod,
                payment_reference: paymentRef || undefined,
                notes: paymentNotes || undefined,
            });
            // Reload order detail and list
            const updatedOrder = await orderService.getOrder(selectedOrderSchoolId, selectedOrder.id);
            setSelectedOrder(updatedOrder);
            setShowPaymentModal(false);
            setPaymentAmount(0);
            setPaymentMethod('cash');
            setPaymentRef('');
            setPaymentNotes('');
            loadOrders();
        }
        catch (err) {
            console.error('Error adding payment:', err);
            setError('Error al registrar pago');
        }
        finally {
            setProcessingPayment(false);
        }
    };
    const openWhatsApp = (phone) => {
        if (!phone)
            return;
        const cleanPhone = phone.replace(/\D/g, '');
        const formattedPhone = cleanPhone.startsWith('57') ? cleanPhone : `57${cleanPhone}`;
        window.open(`https://wa.me/${formattedPhone}`, '_blank');
    };
    const handleApprovePayment = async () => {
        if (!selectedOrderSchoolId || !selectedOrder)
            return;
        try {
            setProcessingPaymentProof(true);
            await orderService.approvePayment(selectedOrderSchoolId, selectedOrder.id);
            // Reload order detail
            const updatedOrder = await orderService.getOrder(selectedOrderSchoolId, selectedOrder.id);
            setSelectedOrder(updatedOrder);
            setShowPaymentProofModal(false);
            // CRITICAL: Reload the full orders list to update table
            await loadOrders();
        }
        catch (err) {
            console.error('Error approving payment:', err);
            setError('Error al aprobar el pago');
        }
        finally {
            setProcessingPaymentProof(false);
        }
    };
    const handleRejectPayment = async () => {
        if (!selectedOrderSchoolId || !selectedOrder)
            return;
        const reason = prompt('Motivo del rechazo:');
        if (!reason)
            return;
        try {
            setProcessingPaymentProof(true);
            await orderService.rejectPayment(selectedOrderSchoolId, selectedOrder.id, reason);
            // Reload order detail
            const updatedOrder = await orderService.getOrder(selectedOrderSchoolId, selectedOrder.id);
            setSelectedOrder(updatedOrder);
            setShowPaymentProofModal(false);
            // CRITICAL: Reload the full orders list to update table
            await loadOrders();
        }
        catch (err) {
            console.error('Error rejecting payment:', err);
            setError('Error al rechazar el pago');
        }
        finally {
            setProcessingPaymentProof(false);
        }
    };
    const formatDate = (dateStr) => {
        return formatDateSpanish(dateStr);
    };
    if (availableSchools.length === 0) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "p-8 text-center", children: [_jsx(Globe, { className: "w-12 h-12 mx-auto text-gray-300 mb-4" }), _jsx("p", { className: "text-gray-500", children: "No tienes acceso a ning\u00FAn colegio" })] }) }));
    }
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "flex items-center justify-between mb-6", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-900 flex items-center", children: [_jsx(Globe, { className: "w-7 h-7 mr-3 text-indigo-600" }), "Pedidos Web"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Gestiona los pedidos recibidos desde el portal web" })] }), _jsxs("button", { onClick: loadOrders, disabled: loading, className: "px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition flex items-center disabled:opacity-50", children: [_jsx(RefreshCw, { className: `w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}` }), "Actualizar"] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6", children: [_jsx("button", { onClick: () => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'pending'
                            ? 'bg-yellow-200 border-2 border-yellow-500 ring-2 ring-yellow-300'
                            : 'bg-yellow-50 border border-yellow-200 hover:border-yellow-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-yellow-700", children: "Pendientes" }), _jsx("p", { className: "text-2xl font-bold text-yellow-900", children: stats.pending })] }), _jsx(Clock, { className: "w-8 h-8 text-yellow-600" })] }) }), _jsx("button", { onClick: () => setStatusFilter(statusFilter === 'in_production' ? 'all' : 'in_production'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'in_production'
                            ? 'bg-blue-200 border-2 border-blue-500 ring-2 ring-blue-300'
                            : 'bg-blue-50 border border-blue-200 hover:border-blue-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-blue-700", children: "En Produccion" }), _jsx("p", { className: "text-2xl font-bold text-blue-900", children: stats.in_production })] }), _jsx(Wrench, { className: "w-8 h-8 text-blue-600" })] }) }), _jsx("button", { onClick: () => setStatusFilter(statusFilter === 'ready' ? 'all' : 'ready'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'ready'
                            ? 'bg-green-200 border-2 border-green-500 ring-2 ring-green-300'
                            : 'bg-green-50 border border-green-200 hover:border-green-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-green-700", children: "Listos" }), _jsx("p", { className: "text-2xl font-bold text-green-900", children: stats.ready })] }), _jsx(CheckCircle, { className: "w-8 h-8 text-green-600" })] }) }), _jsx("button", { onClick: () => setStatusFilter(statusFilter === 'delivered' ? 'all' : 'delivered'), className: `text-left rounded-lg p-4 transition-all ${statusFilter === 'delivered'
                            ? 'bg-gray-300 border-2 border-gray-500 ring-2 ring-gray-300'
                            : 'bg-gray-50 border border-gray-200 hover:border-gray-400'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-700", children: "Entregados" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.delivered })] }), _jsx(Package, { className: "w-8 h-8 text-gray-600" })] }) }), _jsx("div", { className: "bg-white border border-gray-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Total Pedidos" }), _jsx("p", { className: "text-2xl font-bold text-gray-900", children: stats.total })] }), _jsx(Globe, { className: "w-8 h-8 text-indigo-600" })] }) }), _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-red-700", children: "Saldo Pendiente" }), _jsxs("p", { className: "text-xl font-bold text-red-900", children: ["$", stats.totalPending.toLocaleString()] })] }), _jsx(DollarSign, { className: "w-8 h-8 text-red-600" })] }) })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6", children: _jsxs("div", { className: "flex flex-col sm:flex-row gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1", children: "Estado" }), _jsxs("div", { className: "relative", children: [_jsx(Filter, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "all", children: "Todos los estados" }), _jsx("option", { value: "pending", children: "Pendientes" }), _jsx("option", { value: "in_production", children: "En Produccion" }), _jsx("option", { value: "ready", children: "Listos" }), _jsx("option", { value: "delivered", children: "Entregados" }), _jsx("option", { value: "cancelled", children: "Cancelados" })] })] })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1", children: "Buscar" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Codigo, cliente, estudiante...", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), className: "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none" })] })] }), _jsxs("div", { className: "flex-1", children: [_jsx("label", { className: "block text-xs text-gray-500 mb-1", children: "Tipo de Entrega" }), _jsxs("div", { className: "relative", children: [_jsx(Truck, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsxs("select", { value: deliveryFilter, onChange: (e) => setDeliveryFilter(e.target.value), className: "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "all", children: "Todos" }), _jsxs("option", { value: "pickup", children: ["Retiro en tienda (", stats.pickupOrders, ")"] }), _jsxs("option", { value: "delivery", children: ["Domicilio (", stats.deliveryOrders, ")"] })] })] })] }), (statusFilter !== 'all' || deliveryFilter !== 'all' || searchQuery) && (_jsx("div", { className: "flex items-end", children: _jsx("button", { onClick: () => {
                                    setStatusFilter('all');
                                    setDeliveryFilter('all');
                                    setSearchQuery('');
                                }, className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Limpiar filtros" }) }))] }) }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-red-700", children: error }), _jsx("button", { onClick: () => setError(null), className: "ml-auto", children: _jsx(X, { className: "w-4 h-4 text-red-600" }) })] })), _jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden", children: loading ? (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-indigo-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando pedidos web..." })] })) : filteredOrders.length === 0 ? (_jsxs("div", { className: "text-center py-12", children: [_jsx(Globe, { className: "w-12 h-12 mx-auto text-gray-300 mb-4" }), _jsx("p", { className: "text-gray-500", children: orders.length === 0
                                ? 'No hay pedidos del portal web'
                                : 'No se encontraron pedidos con los filtros aplicados' })] })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { className: "text-xs text-gray-500 uppercase", children: [_jsx("th", { className: "px-4 py-3 text-left", children: "Codigo" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Colegio" }), _jsx("th", { className: "px-4 py-3 text-left", children: "Cliente" }), _jsx("th", { className: "px-4 py-3 text-center", children: "Items" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Total" }), _jsx("th", { className: "px-4 py-3 text-right", children: "Saldo" }), _jsx("th", { className: "px-4 py-3 text-center", children: "Comprobante" }), _jsx("th", { className: "px-4 py-3 text-center", children: "Estado" }), _jsx("th", { className: "px-4 py-3 text-center", children: "Fecha" }), _jsx("th", { className: "px-4 py-3 text-center", children: "Acciones" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: filteredOrders.map((order) => {
                                    const statusConfig = STATUS_CONFIG[order.status];
                                    const StatusIcon = statusConfig.icon;
                                    const balance = Number(order.balance) || 0;
                                    return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3", children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-mono font-medium text-indigo-600", children: order.code }), order.delivery_type === 'delivery' && (_jsx("span", { className: "inline-flex items-center text-blue-600", title: "Domicilio", children: _jsx(Home, { className: "w-4 h-4" }) }))] }) }), _jsx("td", { className: "px-4 py-3", children: _jsx("span", { className: "text-sm text-gray-700", children: order.school_name || '-' }) }), _jsx("td", { className: "px-4 py-3", children: _jsxs("div", { children: [_jsx("p", { className: "font-medium text-gray-900", children: order.client_name || 'Sin cliente' }), order.student_name && (_jsx("p", { className: "text-sm text-gray-500", children: order.student_name }))] }) }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsx("span", { className: "inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm", children: order.items_count }) }), _jsxs("td", { className: "px-4 py-3 text-right font-medium", children: ["$", Number(order.total).toLocaleString()] }), _jsx("td", { className: "px-4 py-3 text-right", children: _jsx("span", { className: `font-medium ${balance > 0 ? 'text-red-600' : 'text-green-600'}`, children: balance > 0 ? `$${balance.toLocaleString()}` : 'Pagado' }) }), _jsx("td", { className: "px-4 py-3 text-center", children: order.payment_proof_url ? (_jsx("button", { onClick: (e) => {
                                                        e.stopPropagation();
                                                        setPaymentProofUrl(order.payment_proof_url);
                                                        setSelectedOrder(null);
                                                        setSelectedOrderSchoolId(order.school_id);
                                                        handleViewDetail(order.id, order.school_id);
                                                        setTimeout(() => setShowPaymentProofModal(true), 300);
                                                    }, className: "inline-flex items-center text-blue-600 hover:text-blue-700", title: "Ver comprobante de pago", children: order.payment_proof_url.endsWith('.pdf') ? (_jsx(FileText, { className: "w-5 h-5" })) : (_jsx(ImageIcon, { className: "w-5 h-5" })) })) : (_jsx("span", { className: "text-xs text-gray-400", children: "Sin comprobante" })) }), _jsx("td", { className: "px-4 py-3 text-center", children: _jsxs("span", { className: `inline-flex items-center px-2 py-1 rounded text-xs font-medium ${statusConfig.bgColor} ${statusConfig.color}`, children: [_jsx(StatusIcon, { className: "w-3 h-3 mr-1" }), statusConfig.label] }) }), _jsx("td", { className: "px-4 py-3 text-center text-sm text-gray-600", children: formatDate(order.created_at) }), _jsx("td", { className: "px-4 py-3", children: _jsx("div", { className: "flex items-center justify-center gap-2", children: _jsx("button", { onClick: () => handleViewDetail(order.id, order.school_id), disabled: loadingDetail, className: "p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition", title: "Ver detalle", children: _jsx(Eye, { className: "w-4 h-4" }) }) }) })] }, order.id));
                                }) })] }) })) }), showDetailModal && selectedOrder && (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: () => setShowDetailModal(false) }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-800 flex items-center", children: [_jsx(Package, { className: "w-6 h-6 mr-2 text-indigo-600" }), "Pedido ", selectedOrder.code] }), _jsx("button", { onClick: () => setShowDetailModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "p-6 space-y-6", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-gray-800 mb-3", children: "Informacion del Cliente" }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Nombre" }), _jsx("p", { className: "font-medium", children: selectedOrder.client_name })] }), selectedOrder.student_name && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Estudiante" }), _jsx("p", { className: "font-medium", children: selectedOrder.student_name })] })), selectedOrder.client_phone && (_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Telefono" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("p", { className: "font-medium", children: selectedOrder.client_phone }), _jsx("button", { onClick: () => openWhatsApp(selectedOrder.client_phone), className: "p-1 text-green-600 hover:bg-green-50 rounded", title: "Enviar WhatsApp", children: _jsx(MessageCircle, { className: "w-4 h-4" }) }), _jsx("a", { href: `tel:${selectedOrder.client_phone}`, className: "p-1 text-blue-600 hover:bg-blue-50 rounded", title: "Llamar", children: _jsx(Phone, { className: "w-4 h-4" }) })] })] }))] })] }), selectedOrder.delivery_type === 'delivery' && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsxs("h3", { className: "font-medium text-blue-800 mb-3 flex items-center", children: [_jsx(Truck, { className: "w-5 h-5 mr-2" }), "Informacion de Domicilio"] }), _jsxs("div", { className: "grid grid-cols-2 gap-4 text-sm", children: [_jsxs("div", { children: [_jsx("p", { className: "text-blue-600", children: "Direccion" }), _jsx("p", { className: "font-medium text-blue-900", children: selectedOrder.delivery_address || '-' })] }), _jsxs("div", { children: [_jsx("p", { className: "text-blue-600", children: "Barrio" }), _jsx("p", { className: "font-medium text-blue-900", children: selectedOrder.delivery_neighborhood || '-' })] }), selectedOrder.delivery_city && (_jsxs("div", { children: [_jsx("p", { className: "text-blue-600", children: "Ciudad" }), _jsx("p", { className: "font-medium text-blue-900", children: selectedOrder.delivery_city })] })), selectedOrder.delivery_fee && Number(selectedOrder.delivery_fee) > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-blue-600", children: "Costo de Envio" }), _jsxs("p", { className: "font-bold text-blue-900", children: ["$", Number(selectedOrder.delivery_fee).toLocaleString()] })] })), selectedOrder.delivery_references && (_jsxs("div", { className: "col-span-2", children: [_jsx("p", { className: "text-blue-600", children: "Indicaciones" }), _jsx("p", { className: "font-medium text-blue-900", children: selectedOrder.delivery_references })] }))] })] })), selectedOrder.status === 'pending' && (_jsx("div", { className: `rounded-lg p-4 ${loadingStock
                                                ? 'bg-gray-50 border border-gray-200'
                                                : stockVerification?.can_fulfill_completely
                                                    ? 'bg-green-50 border border-green-200'
                                                    : stockVerification?.items_in_stock && stockVerification.items_in_stock > 0
                                                        ? 'bg-yellow-50 border border-yellow-200'
                                                        : 'bg-blue-50 border border-blue-200'}`, children: loadingStock ? (_jsxs("div", { className: "flex items-center", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin text-gray-500 mr-2" }), _jsx("span", { className: "text-gray-600", children: "Verificando disponibilidad de stock..." })] })) : stockVerification ? (_jsxs("div", { children: [_jsx("div", { className: "flex items-center justify-between mb-3", children: _jsx("h3", { className: "font-medium flex items-center", children: stockVerification.can_fulfill_completely ? (_jsxs(_Fragment, { children: [_jsx(PackageCheck, { className: "w-5 h-5 text-green-600 mr-2" }), _jsx("span", { className: "text-green-800", children: "Todos los items disponibles en stock" })] })) : stockVerification.items_in_stock > 0 ? (_jsxs(_Fragment, { children: [_jsx(Boxes, { className: "w-5 h-5 text-yellow-600 mr-2" }), _jsx("span", { className: "text-yellow-800", children: "Stock parcial disponible" })] })) : (_jsxs(_Fragment, { children: [_jsx(Factory, { className: "w-5 h-5 text-blue-600 mr-2" }), _jsx("span", { className: "text-blue-800", children: "Requiere produccion" })] })) }) }), _jsxs("div", { className: "grid grid-cols-3 gap-4 text-center mb-4", children: [_jsxs("div", { className: "bg-white rounded-lg p-2", children: [_jsx("p", { className: "text-xs text-gray-500", children: "En Stock" }), _jsx("p", { className: "text-lg font-bold text-green-600", children: stockVerification.items_in_stock })] }), _jsxs("div", { className: "bg-white rounded-lg p-2", children: [_jsx("p", { className: "text-xs text-gray-500", children: "Parcial" }), _jsx("p", { className: "text-lg font-bold text-yellow-600", children: stockVerification.items_partial })] }), _jsxs("div", { className: "bg-white rounded-lg p-2", children: [_jsx("p", { className: "text-xs text-gray-500", children: "A Producir" }), _jsx("p", { className: "text-lg font-bold text-blue-600", children: stockVerification.items_to_produce })] })] }), _jsx("div", { className: "flex gap-2", children: stockVerification.can_fulfill_completely ? (_jsxs("button", { onClick: () => handleApproveWithStock(true), disabled: approvingOrder, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center disabled:opacity-50", children: [approvingOrder ? (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })) : (_jsx(Sparkles, { className: "w-4 h-4 mr-2" })), "Aprobar y Despachar"] })) : stockVerification.items_in_stock > 0 ? (_jsx(_Fragment, { children: _jsxs("button", { onClick: () => handleApproveWithStock(true), disabled: approvingOrder, className: "flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition flex items-center justify-center disabled:opacity-50", children: [approvingOrder ? (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })) : (_jsx(PackageCheck, { className: "w-4 h-4 mr-2" })), "Despachar Stock + Producir Resto"] }) })) : (_jsxs("button", { onClick: () => handleApproveWithStock(false), disabled: approvingOrder, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center disabled:opacity-50", children: [approvingOrder ? (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })) : (_jsx(Factory, { className: "w-4 h-4 mr-2" })), "Enviar Todo a Produccion"] })) })] })) : null })), _jsxs("div", { children: [_jsx("h3", { className: "font-medium text-gray-800 mb-3", children: "Items del Pedido" }), _jsx("div", { className: "border border-gray-200 rounded-lg overflow-hidden", children: _jsxs("table", { className: "w-full text-sm", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-2 text-left", children: "Producto" }), _jsx("th", { className: "px-4 py-2 text-center", children: "Cant." }), selectedOrder.status === 'pending' && stockVerification && (_jsx("th", { className: "px-4 py-2 text-center", children: "Stock" })), _jsx("th", { className: "px-4 py-2 text-right", children: "Precio" }), _jsx("th", { className: "px-4 py-2 text-right", children: "Subtotal" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: selectedOrder.items.map((item) => {
                                                                    // Find stock info for this item
                                                                    const stockInfo = stockVerification?.items.find((si) => si.item_id === item.id);
                                                                    return (_jsxs("tr", { children: [_jsx("td", { className: "px-4 py-2", children: _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: item.garment_type_name }), _jsxs("p", { className: "text-xs text-gray-500", children: [item.size && `Talla: ${item.size}`, item.color && ` | Color: ${item.color}`] }), item.custom_measurements && (_jsx("p", { className: "text-xs text-purple-600", children: "Con medidas personalizadas" })), stockInfo?.product_code && (_jsxs("p", { className: "text-xs text-blue-600", children: ["Producto: ", stockInfo.product_code] }))] }) }), _jsx("td", { className: "px-4 py-2 text-center", children: item.quantity }), selectedOrder.status === 'pending' && stockVerification && (_jsx("td", { className: "px-4 py-2 text-center", children: stockInfo ? (_jsx("div", { className: "flex flex-col items-center", children: stockInfo.has_custom_measurements ? (_jsx("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs", children: "Yomber" })) : stockInfo.can_fulfill_from_stock ? (_jsxs("span", { className: "px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs flex items-center", children: [_jsx(PackageCheck, { className: "w-3 h-3 mr-1" }), stockInfo.stock_available] })) : stockInfo.stock_available > 0 ? (_jsxs("span", { className: "px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs", children: [stockInfo.stock_available, "/", item.quantity] })) : (_jsxs("span", { className: "px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs flex items-center", children: [_jsx(PackageX, { className: "w-3 h-3 mr-1" }), "0"] })) })) : (_jsx("span", { className: "text-gray-400", children: "-" })) })), _jsxs("td", { className: "px-4 py-2 text-right", children: ["$", Number(item.unit_price).toLocaleString()] }), _jsxs("td", { className: "px-4 py-2 text-right font-medium", children: ["$", Number(item.subtotal).toLocaleString()] })] }, item.id));
                                                                }) }), _jsx("tfoot", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("td", { colSpan: selectedOrder.status === 'pending' && stockVerification ? 4 : 3, className: "px-4 py-2 text-right font-medium", children: "Total:" }), _jsxs("td", { className: "px-4 py-2 text-right font-bold text-lg", children: ["$", Number(selectedOrder.total).toLocaleString()] })] }) })] }) })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsx("h3", { className: "font-medium text-gray-800", children: "Pagos" }), Number(selectedOrder.balance) > 0 && (_jsxs("button", { onClick: () => {
                                                                setPaymentAmount(Number(selectedOrder.balance));
                                                                setShowPaymentModal(true);
                                                            }, className: "px-3 py-1 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition flex items-center", children: [_jsx(DollarSign, { className: "w-4 h-4 mr-1" }), "Registrar Pago"] }))] }), _jsxs("div", { className: "grid grid-cols-3 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Total" }), _jsxs("p", { className: "font-bold text-lg", children: ["$", Number(selectedOrder.total).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Pagado" }), _jsxs("p", { className: "font-bold text-lg text-green-600", children: ["$", Number(selectedOrder.paid_amount).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Saldo" }), _jsx("p", { className: `font-bold text-lg ${Number(selectedOrder.balance) > 0 ? 'text-red-600' : 'text-green-600'}`, children: Number(selectedOrder.balance) > 0 ? `$${Number(selectedOrder.balance).toLocaleString()}` : 'Pagado' })] })] })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-gray-800 mb-3", children: "Estado del Pedido" }), _jsx("div", { className: "flex items-center gap-2 mb-4", children: (() => {
                                                        const config = STATUS_CONFIG[selectedOrder.status];
                                                        const StatusIcon = config.icon;
                                                        return (_jsxs("span", { className: `inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${config.bgColor} ${config.color}`, children: [_jsx(StatusIcon, { className: "w-4 h-4 mr-2" }), config.label] }));
                                                    })() }), selectedOrder.status !== 'delivered' && selectedOrder.status !== 'cancelled' && (_jsxs("div", { className: "flex flex-wrap gap-2", children: [selectedOrder.status === 'pending' && (_jsxs("button", { onClick: () => handleUpdateStatus('in_production'), disabled: updatingStatus, className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center disabled:opacity-50", children: [updatingStatus ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(ChevronRight, { className: "w-4 h-4 mr-1" }), "Pasar a Produccion"] })), selectedOrder.status === 'in_production' && (_jsxs("button", { onClick: () => handleUpdateStatus('ready'), disabled: updatingStatus, className: "px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center disabled:opacity-50", children: [updatingStatus ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(CheckCircle, { className: "w-4 h-4 mr-1" }), "Marcar Listo"] })), selectedOrder.status === 'ready' && (_jsxs("button", { onClick: () => handleUpdateStatus('delivered'), disabled: updatingStatus, className: "px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 transition flex items-center disabled:opacity-50", children: [updatingStatus ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Package, { className: "w-4 h-4 mr-1" }), "Entregar"] }))] }))] }), selectedOrder.notes && (_jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-medium text-yellow-800 mb-2", children: "Notas" }), _jsx("p", { className: "text-yellow-900", children: selectedOrder.notes })] }))] })] }) })] })), showPaymentModal && selectedOrder && (_jsxs("div", { className: "fixed inset-0 z-[60] overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: () => setShowPaymentModal(false) }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(DollarSign, { className: "w-5 h-5 mr-2 text-green-600" }), "Registrar Pago - ", selectedOrder.code] }), _jsx("button", { onClick: () => setShowPaymentModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-3 text-center", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Saldo Pendiente" }), _jsxs("p", { className: "text-2xl font-bold text-red-600", children: ["$", Number(selectedOrder.balance).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto *" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", children: "$" }), _jsx("input", { type: "number", min: "1", max: Number(selectedOrder.balance), value: paymentAmount || '', onChange: (e) => setPaymentAmount(parseInt(e.target.value) || 0), className: "w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Metodo de Pago" }), _jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "cash", children: "Efectivo" }), _jsx("option", { value: "nequi", children: "Nequi" }), _jsx("option", { value: "transfer", children: "Transferencia" }), _jsx("option", { value: "card", children: "Tarjeta" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Referencia (opcional)" }), _jsx("input", { type: "text", value: paymentRef, onChange: (e) => setPaymentRef(e.target.value), placeholder: "Numero de transaccion, recibo, etc.", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notas (opcional)" }), _jsx("textarea", { value: paymentNotes, onChange: (e) => setPaymentNotes(e.target.value), rows: 2, placeholder: "Observaciones del pago...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none resize-none" })] })] }), _jsxs("div", { className: "flex gap-3 p-6 border-t border-gray-200", children: [_jsx("button", { onClick: () => setShowPaymentModal(false), disabled: processingPayment, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { onClick: handleAddPayment, disabled: processingPayment || paymentAmount <= 0, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center", children: processingPayment ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Procesando..."] })) : ('Registrar Pago') })] })] }) })] })), showPaymentProofModal && paymentProofUrl && selectedOrder && (_jsxs("div", { className: "fixed inset-0 z-[70] overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-75", onClick: () => setShowPaymentProofModal(false) }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-800 flex items-center", children: [_jsx(ImageIcon, { className: "w-6 h-6 mr-2 text-blue-600" }), "Comprobante de Pago - ", selectedOrder.code] }), _jsx("button", { onClick: () => setShowPaymentProofModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "p-6", children: [_jsx("div", { className: "mb-6 bg-gray-100 rounded-lg p-4 flex items-center justify-center min-h-[400px]", children: paymentProofUrl.endsWith('.pdf') ? (_jsxs("div", { className: "text-center", children: [_jsx(FileText, { className: "w-16 h-16 mx-auto text-gray-400 mb-4" }), _jsx("p", { className: "text-gray-600 mb-4", children: "Archivo PDF" }), _jsx("a", { href: `https://api.uniformesconsuelorios.com${paymentProofUrl}`, target: "_blank", rel: "noopener noreferrer", className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition inline-block", children: "Abrir PDF" })] })) : (_jsx("img", { src: `https://api.uniformesconsuelorios.com${paymentProofUrl}`, alt: "Comprobante de pago", className: "max-w-full max-h-[600px] object-contain rounded", onError: (e) => {
                                                    console.error('Error loading image:', paymentProofUrl);
                                                    e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2YzZjRmNiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5FcnJvciBhbCBjYXJnYXIgaW1hZ2VuPC90ZXh0Pjwvc3ZnPg==';
                                                } })) }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-3 gap-4 text-center", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Total" }), _jsxs("p", { className: "font-bold text-lg", children: ["$", Number(selectedOrder.total).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Pagado" }), _jsxs("p", { className: "font-bold text-lg text-green-600", children: ["$", Number(selectedOrder.paid_amount).toLocaleString()] })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-600", children: "Saldo" }), _jsx("p", { className: `font-bold text-lg ${Number(selectedOrder.balance) > 0 ? 'text-red-600' : 'text-green-600'}`, children: Number(selectedOrder.balance) > 0 ? `$${Number(selectedOrder.balance).toLocaleString()}` : 'Pagado' })] })] }) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: () => setShowPaymentProofModal(false), disabled: processingPaymentProof, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cerrar" }), _jsxs("button", { onClick: handleRejectPayment, disabled: processingPaymentProof, className: "flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center", children: [processingPaymentProof ? (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })) : (_jsx(X, { className: "w-4 h-4 mr-2" })), "Rechazar"] }), _jsxs("button", { onClick: handleApprovePayment, disabled: processingPaymentProof, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center", children: [processingPaymentProof ? (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })) : (_jsx(CheckCircle, { className: "w-4 h-4 mr-2" })), "Aprobar Pago"] })] })] })] }) })] }))] }));
}
