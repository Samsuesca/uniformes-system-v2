/**
 * Order Detail Page - View and manage a single order
 */
import { useEffect, useState, Fragment } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Calendar, User, Package, DollarSign, AlertCircle, Loader2, Clock, CheckCircle, XCircle, Truck, Edit2, Save, X, Ruler, ChevronDown, ChevronUp, Mail, Printer, Building2 } from 'lucide-react';
import DatePicker, { formatDateSpanish } from '../components/DatePicker';
import { orderService } from '../services/orderService';
import type { OrderWithItems, OrderStatus, OrderItemStatus } from '../types/api';
import { useSchoolStore } from '../stores/schoolStore';
import ReceiptModal from '../components/ReceiptModal';

// Item status configuration
const ITEM_STATUS_CONFIG: Record<OrderItemStatus, { label: string; color: string; bgColor: string; icon: string }> = {
  pending: { label: 'Pendiente', color: 'text-yellow-700', bgColor: 'bg-yellow-100', icon: '🟡' },
  in_production: { label: 'En Producción', color: 'text-blue-700', bgColor: 'bg-blue-100', icon: '🔵' },
  ready: { label: 'Listo', color: 'text-green-700', bgColor: 'bg-green-100', icon: '🟢' },
  delivered: { label: 'Entregado', color: 'text-gray-700', bgColor: 'bg-gray-100', icon: '✅' },
  cancelled: { label: 'Cancelado', color: 'text-red-700', bgColor: 'bg-red-100', icon: '❌' },
};

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { currentSchool } = useSchoolStore();
  const [order, setOrder] = useState<OrderWithItems | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
  const [expandedMeasurements, setExpandedMeasurements] = useState<Set<string>>(new Set());

  // Item status update loading state (by item ID)
  const [updatingItemStatus, setUpdatingItemStatus] = useState<string | null>(null);

  // Email sending state
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Receipt modal state
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);

  // Get school_id from the order itself (preferred), URL query param, or currentSchool as fallback
  const getEffectiveSchoolId = () => order?.school_id || searchParams.get('school_id') || currentSchool?.id || '';

  // Toggle measurement visibility
  const toggleMeasurements = (itemId: string) => {
    const newExpanded = new Set(expandedMeasurements);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedMeasurements(newExpanded);
  };

  // Labels for measurements in Spanish
  const measurementLabels: Record<string, string> = {
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
      // Use global endpoint that doesn't require school_id
      const data = await orderService.getOrderDetails(orderId!);
      setOrder(data);
    } catch (err: any) {
      console.error('Error loading order:', err);
      setError(err.response?.data?.detail || 'Error al cargar el encargo');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    return formatDateSpanish(dateString);
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString()}`;
  };

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return { label: 'Pendiente', color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-5 h-5" /> };
      case 'in_production':
        return { label: 'En Producción', color: 'bg-blue-100 text-blue-800', icon: <Package className="w-5 h-5" /> };
      case 'ready':
        return { label: 'Listo para Entregar', color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-5 h-5" /> };
      case 'delivered':
        return { label: 'Entregado', color: 'bg-gray-100 text-gray-800', icon: <Truck className="w-5 h-5" /> };
      case 'cancelled':
        return { label: 'Cancelado', color: 'bg-red-100 text-red-800', icon: <XCircle className="w-5 h-5" /> };
      default:
        return { label: status, color: 'bg-gray-100 text-gray-800', icon: null };
    }
  };

  const getNextStatus = (currentStatus: OrderStatus): OrderStatus | null => {
    switch (currentStatus) {
      case 'pending': return 'in_production';
      case 'in_production': return 'ready';
      case 'ready': return 'delivered';
      default: return null;
    }
  };

  const getNextStatusLabel = (currentStatus: OrderStatus): string => {
    switch (currentStatus) {
      case 'pending': return 'Iniciar Producción';
      case 'in_production': return 'Marcar como Listo';
      case 'ready': return 'Marcar como Entregado';
      default: return '';
    }
  };

  const handleUpdateStatus = async (newStatus: OrderStatus) => {
    if (!order) return;

    try {
      setProcessingStatus(true);
      await orderService.updateStatus(getEffectiveSchoolId(), order.id, newStatus);
      await loadOrder();
    } catch (err: any) {
      console.error('Error updating status:', err);
      setError(err.response?.data?.detail || 'Error al actualizar el estado');
    } finally {
      setProcessingStatus(false);
    }
  };

  const handleAddPayment = async () => {
    if (!order || !paymentAmount) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('Ingresa un monto válido');
      return;
    }

    try {
      setPaymentLoading(true);
      await orderService.addPayment(getEffectiveSchoolId(), order.id, {
        amount,
        payment_method: paymentMethod,
      });
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentMethod('cash');
      await loadOrder();
    } catch (err: any) {
      console.error('Error adding payment:', err);
      setError(err.response?.data?.detail || 'Error al registrar el pago');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleEditDeliveryDate = () => {
    setNewDeliveryDate(order?.delivery_date || '');
    setEditingDeliveryDate(true);
  };

  const handleSaveDeliveryDate = async () => {
    if (!order) return;

    try {
      setSavingDeliveryDate(true);
      await orderService.updateOrder(getEffectiveSchoolId(), order.id, {
        delivery_date: newDeliveryDate || undefined,
      });
      setEditingDeliveryDate(false);
      await loadOrder();
    } catch (err: any) {
      console.error('Error updating delivery date:', err);
      setError(err.response?.data?.detail || 'Error al actualizar la fecha de entrega');
    } finally {
      setSavingDeliveryDate(false);
    }
  };

  const handleCancelEditDeliveryDate = () => {
    setEditingDeliveryDate(false);
    setNewDeliveryDate('');
  };

  // Handle item status change
  const handleItemStatusChange = async (itemId: string, newStatus: OrderItemStatus) => {
    if (!order) return;

    try {
      setUpdatingItemStatus(itemId);
      await orderService.updateItemStatus(getEffectiveSchoolId(), order.id, itemId, newStatus);
      // Reload order to get updated item statuses and potentially updated order status
      await loadOrder();
    } catch (err: any) {
      console.error('Error updating item status:', err);
      setError(err.response?.data?.detail || 'Error al actualizar el estado del item');
    } finally {
      setUpdatingItemStatus(null);
    }
  };

  // Check if item status can be changed
  const canChangeItemStatus = (itemStatus: OrderItemStatus): boolean => {
    return !['delivered', 'cancelled'].includes(itemStatus);
  };

  // Handle sending receipt email
  const handleSendEmail = async () => {
    if (!order) return;

    try {
      setSendingEmail(true);
      setEmailSuccess(null);
      setError(null);

      const result = await orderService.sendReceiptEmail(getEffectiveSchoolId(), order.id);

      if (result.success) {
        setEmailSuccess(result.message || 'Correo enviado exitosamente');
        // Clear success message after 5 seconds
        setTimeout(() => setEmailSuccess(null), 5000);
      } else {
        setError(result.message || 'Error al enviar el correo');
      }
    } catch (err: any) {
      console.error('Error sending email:', err);
      setError(err.response?.data?.detail || 'Error al enviar el correo');
    } finally {
      setSendingEmail(false);
    }
  };

  // Check if client has email
  const clientHasEmail = order?.client_email || false;

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando encargo...</span>
        </div>
      </Layout>
    );
  }

  if (error || !order) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar el encargo</h3>
              <p className="mt-1 text-sm text-red-700">{error || 'Encargo no encontrado'}</p>
              <button
                onClick={() => navigate('/orders')}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Volver a encargos
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const statusConfig = getStatusConfig(order.status);
  const nextStatus = getNextStatus(order.status);
  const hasBalance = order.balance > 0;

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a encargos
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Encargo {order.code}</h1>
            <p className="text-gray-600 mt-1">Creado el {formatDate(order.created_at)}</p>
          </div>
          <div className="flex gap-3">
            {/* Print Receipt Button */}
            <button
              onClick={() => setIsReceiptModalOpen(true)}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center transition"
            >
              <Printer className="w-5 h-5 mr-2" />
              Imprimir Recibo
            </button>

            {/* Send Email Button - only show if client has email */}
            {clientHasEmail && (
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail}
                className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg flex items-center transition disabled:opacity-50"
                title={`Enviar a ${order.client_email}`}
              >
                {sendingEmail ? (
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                ) : (
                  <Mail className="w-5 h-5 mr-2" />
                )}
                {sendingEmail ? 'Enviando...' : 'Enviar Email'}
              </button>
            )}

            {nextStatus && order.status !== 'cancelled' && (
              <button
                onClick={() => handleUpdateStatus(nextStatus)}
                disabled={processingStatus}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition disabled:opacity-50"
              >
                {processingStatus ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5 mr-2" />
                )}
                {getNextStatusLabel(order.status)}
              </button>
            )}
            {hasBalance && order.status !== 'cancelled' && (
              <button
                onClick={() => setShowPaymentModal(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition"
              >
                <DollarSign className="w-5 h-5 mr-2" />
                Registrar Pago
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start">
          <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success Alert (for email sent) */}
      {emailSuccess && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-start">
          <CheckCircle className="w-5 h-5 text-green-600 mr-2 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-green-700">{emailSuccess}</p>
        </div>
      )}

      {/* Order Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Estado</h2>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="font-semibold">{statusConfig.label}</span>
          </div>

          {/* Delivery Date - Editable */}
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center text-gray-600">
                <Calendar className="w-5 h-5 mr-2 text-gray-400" />
                <span className="text-sm font-medium">Fecha de Entrega:</span>
              </div>
              {!editingDeliveryDate && order.status !== 'cancelled' && order.status !== 'delivered' && (
                <button
                  onClick={handleEditDeliveryDate}
                  className="text-blue-600 hover:text-blue-700 p-1 rounded transition"
                  title="Editar fecha de entrega"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {editingDeliveryDate ? (
              <div className="mt-2 flex items-center gap-2">
                <DatePicker
                  value={newDeliveryDate}
                  onChange={(value) => setNewDeliveryDate(value)}
                  className="flex-1"
                />
                <button
                  onClick={handleSaveDeliveryDate}
                  disabled={savingDeliveryDate}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                  title="Guardar"
                >
                  {savingDeliveryDate ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                </button>
                <button
                  onClick={handleCancelEditDeliveryDate}
                  disabled={savingDeliveryDate}
                  className="p-2 bg-gray-200 text-gray-600 rounded-lg hover:bg-gray-300 transition"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="mt-1 text-gray-900 font-medium">
                {order.delivery_date ? formatDate(order.delivery_date) : 'Sin fecha asignada'}
              </p>
            )}
          </div>
        </div>

        {/* Client Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Cliente</h2>
          <div className="flex items-center mb-3">
            <Building2 className="w-5 h-5 mr-2 text-gray-400" />
            <span className="font-medium text-gray-900">{order.school_name || currentSchool?.name || '-'}</span>
          </div>
          <div className="flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-400" />
            <span className="font-medium text-gray-900">{order.client_name}</span>
          </div>
          {order.student_name && (
            <p className="text-sm text-gray-600 mt-2 ml-7">Estudiante: {order.student_name}</p>
          )}
          {order.client_phone && (
            <p className="text-sm text-gray-600 mt-1 ml-7">Tel: {order.client_phone}</p>
          )}
        </div>

        {/* Payment Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Pagos</h2>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600">Total:</span>
              <span className="font-bold text-gray-900">{formatCurrency(order.total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pagado:</span>
              <span className="font-medium text-green-600">{formatCurrency(order.paid_amount)}</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-600">Saldo:</span>
              <span className={`font-bold ${hasBalance ? 'text-red-600' : 'text-green-600'}`}>
                {hasBalance ? formatCurrency(order.balance) : 'Pagado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Items */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Items del Encargo
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Talla / Color
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Unit.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {order.items.map((item) => {
                // Check if item has custom measurements (Yomber)
                const hasValidMeasurements = item.custom_measurements &&
                  typeof item.custom_measurements === 'object' &&
                  Object.keys(item.custom_measurements).length > 0;
                const isYomber = item.has_custom_measurements || hasValidMeasurements;
                const isExpanded = expandedMeasurements.has(item.id);

                return (
                  <Fragment key={item.id}>
                    <tr className={isYomber ? 'bg-purple-50' : ''}>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        <div className="flex items-center">
                          {item.garment_type_name}
                          {item.embroidery_text && (
                            <span className="ml-2 text-xs text-gray-500">
                              (Bordado: {item.embroidery_text})
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-xs text-gray-500 mt-1">{item.notes}</p>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {isYomber ? (
                          hasValidMeasurements ? (
                            <button
                              onClick={() => toggleMeasurements(item.id)}
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full hover:bg-purple-200 transition"
                            >
                              <Ruler className="w-3 h-3" />
                              Yomber
                              {isExpanded ? (
                                <ChevronUp className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium bg-purple-50 text-purple-600 rounded-full">
                              <Ruler className="w-3 h-3" />
                              Yomber (sin medidas)
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-gray-400">Estándar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.size || '-'} / {item.color || '-'}
                        {item.gender && <span className="ml-1">({item.gender})</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 text-center">
                        {updatingItemStatus === item.id ? (
                          <div className="flex items-center justify-center">
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          </div>
                        ) : canChangeItemStatus(item.item_status) && order.status !== 'cancelled' ? (
                          <select
                            value={item.item_status}
                            onChange={(e) => handleItemStatusChange(item.id, e.target.value as OrderItemStatus)}
                            className={`text-xs font-medium rounded-full px-2 py-1 border-0 cursor-pointer ${ITEM_STATUS_CONFIG[item.item_status].bgColor} ${ITEM_STATUS_CONFIG[item.item_status].color}`}
                          >
                            <option value="pending">🟡 Pendiente</option>
                            <option value="in_production">🔵 En Producción</option>
                            <option value="ready">🟢 Listo</option>
                            <option value="delivered">✅ Entregado</option>
                          </select>
                        ) : (
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded-full ${ITEM_STATUS_CONFIG[item.item_status].bgColor} ${ITEM_STATUS_CONFIG[item.item_status].color}`}>
                            {ITEM_STATUS_CONFIG[item.item_status].icon} {ITEM_STATUS_CONFIG[item.item_status].label}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 text-right">
                        {formatCurrency(item.unit_price)}
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>

                    {/* Expanded measurements row for Yomber items */}
                    {hasValidMeasurements && isExpanded && (
                      <tr className="bg-purple-100">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="flex items-start gap-2">
                            <Ruler className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-purple-800 mb-3">
                                Medidas Personalizadas (Yomber)
                              </h4>
                              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
                                {Object.entries(item.custom_measurements!).map(([key, value]) => (
                                  <div
                                    key={key}
                                    className="bg-white rounded-lg px-3 py-2 shadow-sm border border-purple-200"
                                  >
                                    <span className="text-xs text-purple-600 block font-medium">
                                      {measurementLabels[key] || key}
                                    </span>
                                    <span className="text-lg font-bold text-purple-800">
                                      {value} <span className="text-xs font-normal text-purple-500">cm</span>
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="max-w-xs ml-auto space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="text-gray-900">{formatCurrency(order.subtotal)}</span>
            </div>
            {order.tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">IVA:</span>
                <span className="text-gray-900">{formatCurrency(order.tax)}</span>
              </div>
            )}
            <div className="flex justify-between text-xl font-bold pt-2 border-t">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">{formatCurrency(order.total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Yomber Items Summary - Detailed measurements view */}
      {order.items.some(item =>
        item.custom_measurements &&
        typeof item.custom_measurements === 'object' &&
        Object.keys(item.custom_measurements).length > 0
      ) && (
        <div className="mt-6 bg-purple-50 border border-purple-200 rounded-lg shadow-sm overflow-hidden">
          <div className="p-4 bg-purple-100 border-b border-purple-200">
            <h2 className="text-lg font-semibold text-purple-800 flex items-center">
              <Ruler className="w-5 h-5 mr-2" />
              Resumen de Yombers - Medidas Personalizadas
            </h2>
            <p className="text-sm text-purple-600 mt-1">
              Detalle de medidas para confección de prendas sobre-medida
            </p>
          </div>

          <div className="p-4 space-y-4">
            {order.items.filter(item =>
              item.custom_measurements &&
              typeof item.custom_measurements === 'object' &&
              Object.keys(item.custom_measurements).length > 0
            ).map((item) => (
              <div key={item.id} className="bg-white rounded-lg p-4 border border-purple-200">
                {/* Item Header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-purple-100">
                  <div>
                    <h3 className="font-semibold text-purple-800">{item.garment_type_name}</h3>
                    <p className="text-sm text-purple-600">
                      {item.size && `Talla: ${item.size}`}
                      {item.color && ` | Color: ${item.color}`}
                      {item.gender && ` | ${item.gender === 'male' ? 'Hombre' : item.gender === 'female' ? 'Mujer' : 'Unisex'}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm text-gray-500">Cantidad:</span>
                    <span className="ml-1 font-bold text-purple-800">{item.quantity}</span>
                  </div>
                </div>

                {/* Measurements Grid - 4 obligatorias primero */}
                <div className="space-y-3">
                  {/* Required measurements (highlighted) */}
                  <div>
                    <p className="text-xs text-purple-500 uppercase font-medium mb-2">Medidas Principales</p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['delantero', 'trasero', 'cintura', 'largo'].map(key => {
                        const value = item.custom_measurements![key];
                        if (value === undefined) return null;
                        return (
                          <div key={key} className="bg-purple-100 rounded-lg px-3 py-2 text-center">
                            <span className="text-xs text-purple-600 block font-medium">
                              {measurementLabels[key]}
                            </span>
                            <span className="text-xl font-bold text-purple-800">
                              {value}
                            </span>
                            <span className="text-xs text-purple-500 ml-1">cm</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Optional measurements */}
                  {Object.entries(item.custom_measurements!).filter(([key]) =>
                    !['delantero', 'trasero', 'cintura', 'largo'].includes(key)
                  ).length > 0 && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase font-medium mb-2">Medidas Adicionales</p>
                      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                        {Object.entries(item.custom_measurements!)
                          .filter(([key]) => !['delantero', 'trasero', 'cintura', 'largo'].includes(key))
                          .map(([key, value]) => (
                            <div key={key} className="bg-gray-100 rounded-lg px-2 py-1.5 text-center">
                              <span className="text-xs text-gray-500 block">
                                {measurementLabels[key] || key}
                              </span>
                              <span className="text-sm font-bold text-gray-800">
                                {value} <span className="text-xs font-normal">cm</span>
                              </span>
                            </div>
                          ))
                        }
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes for this item */}
                {item.notes && (
                  <div className="mt-3 pt-2 border-t border-purple-100">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Notas:</span> {item.notes}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Notes */}
      {order.notes && (
        <div className="mt-6 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-2">Notas</h2>
          <p className="text-gray-600">{order.notes}</p>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowPaymentModal(false)} />
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Registrar Pago</h2>

              <div className="space-y-4">
                {/* Quick pay full balance button */}
                {order.balance > 0 && (
                  <button
                    onClick={() => setPaymentAmount(String(order.balance))}
                    className="w-full px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 transition font-medium"
                  >
                    Pagar saldo completo: {formatCurrency(order.balance)}
                  </button>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto
                  </label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder={`Saldo: ${formatCurrency(order.balance)}`}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="cash">Efectivo</option>
                    <option value="transfer">Transferencia</option>
                    <option value="card">Tarjeta</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  disabled={paymentLoading}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPayment}
                  disabled={paymentLoading || !paymentAmount}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {paymentLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Registrar Pago'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        type="order"
        order={order}
        schoolName={currentSchool?.name}
      />
    </Layout>
  );
}
