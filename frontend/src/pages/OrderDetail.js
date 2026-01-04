import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Order Detail Page - View and manage a single order
 */
import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Calendar, User, Package, DollarSign, AlertCircle, Loader2, Clock, CheckCircle, XCircle, Truck, Edit2, Save, X, Ruler, ChevronDown, ChevronUp } from 'lucide-react';
import DatePicker, { formatDateSpanish } from '../components/DatePicker';
import { orderService } from '../services/orderService';
import { useSchoolStore } from '../stores/schoolStore';
// Item status configuration
const ITEM_STATUS_CONFIG = {
    pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: '🟡' },
    in_production: { label: 'En Producción', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🔵' },
    ready: { label: 'Listo', color: 'text-green-700', bgColor: 'bg-green-100', icon: '🟢' },
    delivered: { label: 'Entregado', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '✅' },
    cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100', icon: '❌' },
};
export default function OrderDetail() {
    const { orderId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { currentSchool } = useSchoolStore();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [processingStatus, setProcessingStatus] = useState(false);
    // Payment modal state
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentAmount, setPaymentAmount] = useState('');
    const [paymentMethod, setPaymentMethod] = useState('cash');
    const [paymentLoading, setPaymentLoading] = useState(false);
    // Edit delivery date state
    const [editingDeliveryDate, setEditingDeliveryDate] = useState(false);
    const [newDeliveryDate, setNewDeliveryDate] = useState('');
    const [savingDeliveryDate, setSavingDeliveryDate] = useState(false);
    // Expanded measurements for yomber items
    const [expandedMeasurements, setExpandedMeasurements] = useState(new Set());
    // Item status update loading state (by item ID)
    const [updatingItemStatus, setUpdatingItemStatus] = useState(null);
    // Get school_id from URL query param, fallback to currentSchool
    const schoolId = searchParams.get('school_id') || currentSchool?.id || '';
    // Toggle measurement visibility
    const toggleMeasurements = (itemId) => {
        const newExpanded = new Set(expandedMeasurements);
        if (newExpanded.has(itemId)) {
            newExpanded.delete(itemId);
        }
        else {
            newExpanded.add(itemId);
        }
        setExpandedMeasurements(newExpanded);
    };
    // Labels for measurements in Spanish
    const measurementLabels = {
        delantero: 'Talle Delantero',
        trasero: 'Talle Trasero',
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
    useEffect(() => {
        if (orderId) {
            loadOrder();
        }
    }, [orderId]);
    const loadOrder = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await orderService.getOrder(schoolId, orderId);
            setOrder(data);
        }
        catch (err) {
            console.error('Error loading order:', err);
            setError(err.response?.data?.detail || 'Error al cargar el encargo');
        }
        finally {
            setLoading(false);
        }
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
                return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: _jsx(Clock, { className: "w-5 h-5" }) };
            case 'in_production':
                return { label: 'En Producción', color: 'bg-blue-100 text-blue-800', icon: _jsx(Package, { className: "w-5 h-5" }) };
            case 'ready':
                return { label: 'Listo para Entregar', color: 'bg-green-100 text-green-800', icon: _jsx(CheckCircle, { className: "w-5 h-5" }) };
            case 'delivered':
                return { label: 'Entregado', color: 'bg-gray-100 text-gray-800', icon: _jsx(Truck, { className: "w-5 h-5" }) };
            case 'cancelled':
                return { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: _jsx(XCircle, { className: "w-5 h-5" }) };
            default:
                return { label: status, color: 'bg-gray-100 text-gray-800', icon: null };
        }
    };
    const getNextStatus = (currentStatus) => {
        switch (currentStatus) {
            case 'pending': return 'in_production';
            case 'in_production': return 'ready';
            case 'ready': return 'delivered';
            default: return null;
        }
    };
    const getNextStatusLabel = (currentStatus) => {
        switch (currentStatus) {
            case 'pending': return 'Iniciar Producción';
            case 'in_production': return 'Marcar como Listo';
            case 'ready': return 'Marcar como Entregado';
            default: return '';
        }
    };
    const handleUpdateStatus = async (newStatus) => {
        if (!order)
            return;
        try {
            setProcessingStatus(true);
            await orderService.updateStatus(schoolId, order.id, newStatus);
            await loadOrder();
        }
        catch (err) {
            console.error('Error updating status:', err);
            setError(err.response?.data?.detail || 'Error al actualizar el estado');
        }
        finally {
            setProcessingStatus(false);
        }
    };
    const handleAddPayment = async () => {
        if (!order || !paymentAmount)
            return;
        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('Ingresa un monto válido');
            return;
        }
        try {
            setPaymentLoading(true);
            await orderService.addPayment(schoolId, order.id, {
                amount,
                payment_method: paymentMethod,
            });
            setShowPaymentModal(false);
            setPaymentAmount('');
            setPaymentMethod('cash');
            await loadOrder();
        }
        catch (err) {
            console.error('Error adding payment:', err);
            setError(err.response?.data?.detail || 'Error al registrar el pago');
        }
        finally {
            setPaymentLoading(false);
        }
    };
    const handleEditDeliveryDate = () => {
        setNewDeliveryDate(order?.delivery_date || '');
        setEditingDeliveryDate(true);
    };
    const handleSaveDeliveryDate = async () => {
        if (!order)
            return;
        try {
            setSavingDeliveryDate(true);
            await orderService.updateOrder(schoolId, order.id, {
                delivery_date: newDeliveryDate || undefined,
            });
            setEditingDeliveryDate(false);
            await loadOrder();
        }
        catch (err) {
            console.error('Error updating delivery date:', err);
            setError(err.response?.data?.detail || 'Error al actualizar la fecha de entrega');
        }
        finally {
            setSavingDeliveryDate(false);
        }
    };
    const handleCancelEditDeliveryDate = () => {
        setEditingDeliveryDate(false);
        setNewDeliveryDate('');
    };
    // Handle item status change
    const handleItemStatusChange = async (itemId, newStatus) => {
        if (!order)
            return;
        try {
            setUpdatingItemStatus(itemId);
            await orderService.updateItemStatus(schoolId, order.id, itemId, newStatus);
            // Reload order to get updated item statuses and potentially updated order status
            await loadOrder();
        }
        catch (err) {
            console.error('Error updating item status:', err);
            setError(err.response?.data?.detail || 'Error al actualizar el estado del item');
        }
        finally {
            setUpdatingItemStatus(null);
        }
    };
    // Check if item status can be changed
    const canChangeItemStatus = (itemStatus) => {
        return !['delivered', 'cancelled'].includes(itemStatus);
    };
    if (loading) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando encargo..." })] }) }));
    }
    if (error || !order) {
        return (_jsx(Layout, { children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar el encargo" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error || 'Encargo no encontrado' }), _jsx("button", { onClick: () => navigate('/orders'), className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Volver a encargos" })] })] }) }) }));
    }
    const statusConfig = getStatusConfig(order.status);
    const nextStatus = getNextStatus(order.status);
    const hasBalance = order.balance > 0;
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6", children: [_jsxs("button", { onClick: () => navigate('/orders'), className: "flex items-center text-gray-600 hover:text-gray-800 mb-4 transition", children: [_jsx(ArrowLeft, { className: "w-5 h-5 mr-2" }), "Volver a encargos"] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800", children: ["Encargo ", order.code] }), _jsxs("p", { className: "text-gray-600 mt-1", children: ["Creado el ", formatDate(order.created_at)] })] }), _jsxs("div", { className: "flex gap-3", children: [nextStatus && order.status !== 'cancelled' && (_jsxs("button", { onClick: () => handleUpdateStatus(nextStatus), disabled: processingStatus, className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition disabled:opacity-50", children: [processingStatus ? (_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" })) : (_jsx(CheckCircle, { className: "w-5 h-5 mr-2" })), getNextStatusLabel(order.status)] })), hasBalance && order.status !== 'cancelled' && (_jsxs("button", { onClick: () => setShowPaymentModal(true), className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(DollarSign, { className: "w-5 h-5 mr-2" }), "Registrar Pago"] }))] })] })] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-sm text-red-700", children: error })] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800 mb-4", children: "Estado" }), _jsxs("div", { className: `inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.color}`, children: [statusConfig.icon, _jsx("span", { className: "font-semibold", children: statusConfig.label })] }), _jsxs("div", { className: "mt-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center text-gray-600", children: [_jsx(Calendar, { className: "w-5 h-5 mr-2 text-gray-400" }), _jsx("span", { className: "text-sm font-medium", children: "Fecha de Entrega:" })] }), !editingDeliveryDate && order.status !== 'cancelled' && order.status !== 'delivered' && (_jsx("button", { onClick: handleEditDeliveryDate, className: "text-blue-600 hover:text-blue-700 p-1 rounded transition", title: "Editar fecha de entrega", children: _jsx(Edit2, { className: "w-4 h-4" }) }))] }), editingDeliveryDate ? (_jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx(DatePicker, { value: newDeliveryDate, onChange: (value) => setNewDeliveryDate(value), className: "flex-1" }), _jsx("button", { onClick: handleSaveDeliveryDate, disabled: savingDeliveryDate, className: "p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50", title: "Guardar", children: savingDeliveryDate ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : (_jsx(Save, { className: "w-4 h-4" })) }), _jsx("button", { onClick: handleCancelEditDeliveryDate, disabled: savingDeliveryDate, className: "p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition", title: "Cancelar", children: _jsx(X, { className: "w-4 h-4" }) })] })) : (_jsx("p", { className: "mt-1 text-gray-900 font-medium", children: order.delivery_date ? formatDate(order.delivery_date) : 'Sin fecha asignada' }))] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800 mb-4", children: "Cliente" }), _jsxs("div", { className: "flex items-center", children: [_jsx(User, { className: "w-5 h-5 mr-2 text-gray-400" }), _jsx("span", { className: "font-medium text-gray-900", children: order.client_name })] }), order.student_name && (_jsxs("p", { className: "text-sm text-gray-600 mt-2", children: ["Estudiante: ", order.student_name] })), order.client_phone && (_jsxs("p", { className: "text-sm text-gray-600 mt-1", children: ["Tel: ", order.client_phone] }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800 mb-4", children: "Pagos" }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Total:" }), _jsx("span", { className: "font-bold text-gray-900", children: formatCurrency(order.total) })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Pagado:" }), _jsx("span", { className: "font-medium text-green-600", children: formatCurrency(order.paid_amount) })] }), _jsxs("div", { className: "flex justify-between border-t pt-2", children: [_jsx("span", { className: "text-gray-600", children: "Saldo:" }), _jsx("span", { className: `font-bold ${hasBalance ? 'text-red-600' : 'text-green-600'}`, children: hasBalance ? formatCurrency(order.balance) : 'Pagado' })] })] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(Package, { className: "w-5 h-5 mr-2" }), "Items del Encargo"] }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Producto" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tipo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Talla / Color" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cantidad" }), _jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Precio Unit." }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Subtotal" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: order.items.map((item) => {
                                        // Check if item has custom measurements (Yomber)
                                        const hasValidMeasurements = item.custom_measurements &&
                                            typeof item.custom_measurements === 'object' &&
                                            Object.keys(item.custom_measurements).length > 0;
                                        const isYomber = item.has_custom_measurements || hasValidMeasurements;
                                        const isExpanded = expandedMeasurements.has(item.id);
                                        return (_jsxs(Fragment, { children: [_jsxs("tr", { className: isYomber ? 'bg-purple-50' : '', children: [_jsxs("td", { className: "px-6 py-4 text-sm text-gray-900", children: [_jsxs("div", { className: "flex items-center", children: [item.garment_type_name, item.embroidery_text && (_jsxs("span", { className: "ml-2 text-xs text-gray-500", children: ["(Bordado: ", item.embroidery_text, ")"] }))] }), item.notes && (_jsx("p", { className: "text-xs text-gray-500 mt-1", children: item.notes }))] }), _jsx("td", { className: "px-6 py-4", children: isYomber ? (hasValidMeasurements ? (_jsxs("button", { onClick: () => toggleMeasurements(item.id), className: "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition", children: [_jsx(Ruler, { className: "w-3 h-3" }), "Yomber", isExpanded ? (_jsx(ChevronUp, { className: "w-3 h-3" })) : (_jsx(ChevronDown, { className: "w-3 h-3" }))] })) : (_jsxs("span", { className: "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-50 text-purple-600 rounded-full", children: [_jsx(Ruler, { className: "w-3 h-3" }), "Yomber (sin medidas)"] }))) : (_jsx("span", { className: "text-xs text-gray-400", children: "Est\u00E1ndar" })) }), _jsxs("td", { className: "px-6 py-4 text-sm text-gray-600", children: [item.size || '-', " / ", item.color || '-', item.gender && _jsxs("span", { className: "ml-1", children: ["(", item.gender, ")"] })] }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900 text-right", children: item.quantity }), _jsx("td", { className: "px-6 py-4 text-center", children: updatingItemStatus === item.id ? (_jsx("div", { className: "flex items-center justify-center", children: _jsx(Loader2, { className: "w-4 h-4 animate-spin text-blue-600" }) })) : canChangeItemStatus(item.item_status) && order.status !== 'cancelled' ? (_jsxs("select", { value: item.item_status, onChange: (e) => handleItemStatusChange(item.id, e.target.value), className: `text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${ITEM_STATUS_CONFIG[item.item_status].bgColor} ${ITEM_STATUS_CONFIG[item.item_status].color}`, children: [_jsx("option", { value: "pending", children: "\uD83D\uDFE1 Pendiente" }), _jsx("option", { value: "in_production", children: "\uD83D\uDD35 En Producci\u00F3n" }), _jsx("option", { value: "ready", children: "\uD83D\uDFE2 Listo" }), _jsx("option", { value: "delivered", children: "\u2705 Entregado" })] })) : (_jsxs("span", { className: `inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${ITEM_STATUS_CONFIG[item.item_status].bgColor} ${ITEM_STATUS_CONFIG[item.item_status].color}`, children: [ITEM_STATUS_CONFIG[item.item_status].icon, " ", ITEM_STATUS_CONFIG[item.item_status].label] })) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900 text-right", children: formatCurrency(item.unit_price) }), _jsx("td", { className: "px-6 py-4 text-sm font-semibold text-gray-900 text-right", children: formatCurrency(item.subtotal) })] }), hasValidMeasurements && isExpanded && (_jsx("tr", { className: "bg-purple-100", children: _jsx("td", { colSpan: 7, className: "px-6 py-4", children: _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Ruler, { className: "w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" }), _jsxs("div", { className: "flex-1", children: [_jsx("h4", { className: "text-sm font-semibold text-purple-800 mb-3", children: "Medidas Personalizadas (Yomber)" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3", children: Object.entries(item.custom_measurements).map(([key, value]) => (_jsxs("div", { className: "bg-white rounded-lg px-3 py-2 shadow-sm border border-purple-200", children: [_jsx("span", { className: "text-xs text-purple-600 block font-medium", children: measurementLabels[key] || key }), _jsxs("span", { className: "text-lg font-bold text-purple-800", children: [value, " ", _jsx("span", { className: "text-xs font-normal text-purple-500", children: "cm" })] })] }, key))) })] })] }) }) }))] }, item.id));
                                    }) })] }) }), _jsx("div", { className: "bg-gray-50 px-6 py-4", children: _jsxs("div", { className: "max-w-xs ml-auto space-y-1", children: [_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "Subtotal:" }), _jsx("span", { className: "text-gray-900", children: formatCurrency(order.subtotal) })] }), order.tax > 0 && (_jsxs("div", { className: "flex justify-between text-sm", children: [_jsx("span", { className: "text-gray-600", children: "IVA:" }), _jsx("span", { className: "text-gray-900", children: formatCurrency(order.tax) })] })), _jsxs("div", { className: "flex justify-between text-xl font-bold pt-2 border-t", children: [_jsx("span", { className: "text-gray-900", children: "Total:" }), _jsx("span", { className: "text-blue-600", children: formatCurrency(order.total) })] })] }) })] }), order.items.some(item => item.custom_measurements &&
                typeof item.custom_measurements === 'object' &&
                Object.keys(item.custom_measurements).length > 0) && (_jsxs("div", { className: "mt-6 bg-purple-50 border border-purple-200 rounded-lg shadow-sm overflow-hidden", children: [_jsxs("div", { className: "p-4 bg-purple-100 border-b border-purple-200", children: [_jsxs("h2", { className: "text-lg font-semibold text-purple-800 flex items-center", children: [_jsx(Ruler, { className: "w-5 h-5 mr-2" }), "Resumen de Yombers - Medidas Personalizadas"] }), _jsx("p", { className: "text-sm text-purple-600 mt-1", children: "Detalle de medidas para confecci\u00F3n de prendas sobre-medida" })] }), _jsx("div", { className: "p-4 space-y-4", children: order.items.filter(item => item.custom_measurements &&
                            typeof item.custom_measurements === 'object' &&
                            Object.keys(item.custom_measurements).length > 0).map((item) => (_jsxs("div", { className: "bg-white rounded-lg p-4 border border-purple-200", children: [_jsxs("div", { className: "flex items-center justify-between mb-3 pb-2 border-b border-purple-100", children: [_jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-purple-800", children: item.garment_type_name }), _jsxs("p", { className: "text-sm text-purple-600", children: [item.size && `Talla: ${item.size}`, item.color && ` | Color: ${item.color}`, item.gender && ` | ${item.gender === 'male' ? 'Hombre' : item.gender === 'female' ? 'Mujer' : 'Unisex'}`] })] }), _jsxs("div", { className: "text-right", children: [_jsx("span", { className: "text-sm text-gray-500", children: "Cantidad:" }), _jsx("span", { className: "ml-1 font-bold text-purple-800", children: item.quantity })] })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-purple-500 uppercase font-medium mb-2", children: "Medidas Principales" }), _jsx("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2", children: ['delantero', 'trasero', 'cintura', 'largo'].map(key => {
                                                        const value = item.custom_measurements[key];
                                                        if (value === undefined)
                                                            return null;
                                                        return (_jsxs("div", { className: "bg-purple-100 rounded-lg px-3 py-2 text-center", children: [_jsx("span", { className: "text-xs text-purple-600 block font-medium", children: measurementLabels[key] }), _jsx("span", { className: "text-xl font-bold text-purple-800", children: value }), _jsx("span", { className: "text-xs text-purple-500 ml-1", children: "cm" })] }, key));
                                                    }) })] }), Object.entries(item.custom_measurements).filter(([key]) => !['delantero', 'trasero', 'cintura', 'largo'].includes(key)).length > 0 && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500 uppercase font-medium mb-2", children: "Medidas Adicionales" }), _jsx("div", { className: "grid grid-cols-3 sm:grid-cols-5 gap-2", children: Object.entries(item.custom_measurements)
                                                        .filter(([key]) => !['delantero', 'trasero', 'cintura', 'largo'].includes(key))
                                                        .map(([key, value]) => (_jsxs("div", { className: "bg-gray-100 rounded-lg px-2 py-1.5 text-center", children: [_jsx("span", { className: "text-xs text-gray-500 block", children: measurementLabels[key] || key }), _jsxs("span", { className: "text-sm font-bold text-gray-800", children: [value, " ", _jsx("span", { className: "text-xs font-normal", children: "cm" })] })] }, key))) })] }))] }), item.notes && (_jsx("div", { className: "mt-3 pt-2 border-t border-purple-100", children: _jsxs("p", { className: "text-sm text-gray-600", children: [_jsx("span", { className: "font-medium", children: "Notas:" }), " ", item.notes] }) }))] }, item.id))) })] })), order.notes && (_jsxs("div", { className: "mt-6 bg-white rounded-lg shadow-sm p-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800 mb-2", children: "Notas" }), _jsx("p", { className: "text-gray-600", children: order.notes })] })), showPaymentModal && (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: () => setShowPaymentModal(false) }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full p-6", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-800 mb-4", children: "Registrar Pago" }), _jsxs("div", { className: "space-y-4", children: [order.balance > 0 && (_jsxs("button", { onClick: () => setPaymentAmount(String(order.balance)), className: "w-full px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium", children: ["Pagar saldo completo: ", formatCurrency(order.balance)] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Monto" }), _jsx("input", { type: "number", value: paymentAmount, onChange: (e) => setPaymentAmount(e.target.value), placeholder: `Saldo: ${formatCurrency(order.balance)}`, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u00E9todo de Pago" }), _jsxs("select", { value: paymentMethod, onChange: (e) => setPaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none", children: [_jsx("option", { value: "cash", children: "Efectivo" }), _jsx("option", { value: "transfer", children: "Transferencia" }), _jsx("option", { value: "card", children: "Tarjeta" })] })] })] }), _jsxs("div", { className: "flex gap-3 mt-6", children: [_jsx("button", { onClick: () => setShowPaymentModal(false), disabled: paymentLoading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition", children: "Cancelar" }), _jsx("button", { onClick: handleAddPayment, disabled: paymentLoading || !paymentAmount, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center", children: paymentLoading ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : ('Registrar Pago') })] })] }) })] }))] }));
}
