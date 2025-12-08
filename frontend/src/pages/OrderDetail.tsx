/**
 * Order Detail Page - View and manage a single order
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Calendar, User, Package, DollarSign, AlertCircle, Loader2, Clock, CheckCircle, XCircle, Truck } from 'lucide-react';
import { orderService } from '../services/orderService';
import type { OrderWithItems, OrderStatus } from '../types/api';
import { useSchoolStore } from '../stores/schoolStore';

export default function OrderDetail() {
  const { orderId } = useParams<{ orderId: string }>();
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

  const schoolId = currentSchool?.id || '';

  useEffect(() => {
    if (orderId) {
      loadOrder();
    }
  }, [orderId]);

  const loadOrder = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await orderService.getOrder(schoolId, orderId!);
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
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
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
      await orderService.updateStatus(schoolId, order.id, newStatus);
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
      await orderService.addPayment(schoolId, order.id, {
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

      {/* Order Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Status Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Estado</h2>
          <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${statusConfig.color}`}>
            {statusConfig.icon}
            <span className="font-semibold">{statusConfig.label}</span>
          </div>
          {order.delivery_date && (
            <div className="mt-4 flex items-center text-gray-600">
              <Calendar className="w-5 h-5 mr-2 text-gray-400" />
              <span>Entrega: {formatDate(order.delivery_date)}</span>
            </div>
          )}
        </div>

        {/* Client Card */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Cliente</h2>
          <div className="flex items-center">
            <User className="w-5 h-5 mr-2 text-gray-400" />
            <span className="font-medium text-gray-900">{order.client_name}</span>
          </div>
          {order.student_name && (
            <p className="text-sm text-gray-600 mt-2">Estudiante: {order.student_name}</p>
          )}
          {order.client_phone && (
            <p className="text-sm text-gray-600 mt-1">Tel: {order.client_phone}</p>
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
                  Talla / Color
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
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
              {order.items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {item.garment_type_name}
                    {item.embroidery_text && (
                      <span className="ml-2 text-xs text-gray-500">
                        (Bordado: {item.embroidery_text})
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {item.size || '-'} / {item.color || '-'}
                    {item.gender && <span className="ml-1">({item.gender})</span>}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 text-right">
                    {formatCurrency(item.unit_price)}
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900 text-right">
                    {formatCurrency(item.subtotal)}
                  </td>
                </tr>
              ))}
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
    </Layout>
  );
}
