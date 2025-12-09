/**
 * Orders Page - List and manage custom orders (encargos) - Multi-school view
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import OrderModal from '../components/OrderModal';
import { FileText, Plus, Search, AlertCircle, Loader2, Calendar, Package, Clock, CheckCircle, XCircle, Truck, Eye, Building2 } from 'lucide-react';
import { orderService } from '../services/orderService';
import { useSchoolStore } from '../stores/schoolStore';
import type { OrderListItem, OrderStatus } from '../types/api';

export default function Orders() {
  const navigate = useNavigate();
  const { currentSchool, availableSchools, loadSchools } = useSchoolStore();
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | ''>('');
  const [schoolFilter, setSchoolFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    pending: 0,
    inProduction: 0,
    ready: 0,
    delivered: 0,
  });

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
      setOrders(data);

      // Calculate stats from current data
      const allOrders = (statusFilter || schoolFilter)
        ? await orderService.getAllOrders({ school_id: schoolFilter || undefined })
        : data;
      setStats({
        pending: allOrders.filter(o => o.status === 'pending').length,
        inProduction: allOrders.filter(o => o.status === 'in_production').length,
        ready: allOrders.filter(o => o.status === 'ready').length,
        delivered: allOrders.filter(o => o.status === 'delivered').length,
      });
    } catch (err: any) {
      console.error('Error loading orders:', err);
      setError(err.response?.data?.detail || 'Error al cargar encargos');
    } finally {
      setLoading(false);
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

  const getSourceBadge = (source: string | null | undefined) => {
    if (!source) return null;
    const sourceConfig: Record<string, { label: string; color: string }> = {
      desktop_app: { label: 'Desktop', color: 'bg-blue-100 text-blue-700' },
      web_portal: { label: 'Web', color: 'bg-purple-100 text-purple-700' },
      api: { label: 'API', color: 'bg-gray-100 text-gray-700' }
    };
    const config = sourceConfig[source] || { label: source, color: 'bg-gray-100 text-gray-700' };
    return (
      <span className={`ml-2 px-1.5 py-0.5 text-xs rounded ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sin fecha';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString()}`;
  };

  const getStatusConfig = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          label: 'Pendiente',
          color: 'bg-yellow-100 text-yellow-800',
          icon: <Clock className="w-4 h-4" />,
        };
      case 'in_production':
        return {
          label: 'En Producción',
          color: 'bg-blue-100 text-blue-800',
          icon: <Package className="w-4 h-4" />,
        };
      case 'ready':
        return {
          label: 'Listo',
          color: 'bg-green-100 text-green-800',
          icon: <CheckCircle className="w-4 h-4" />,
        };
      case 'delivered':
        return {
          label: 'Entregado',
          color: 'bg-gray-100 text-gray-800',
          icon: <Truck className="w-4 h-4" />,
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          color: 'bg-red-100 text-red-800',
          icon: <XCircle className="w-4 h-4" />,
        };
      default:
        return {
          label: status,
          color: 'bg-gray-100 text-gray-800',
          icon: null,
        };
    }
  };

  const handleViewOrder = (orderId: string) => {
    navigate(`/orders/${orderId}`);
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Encargos</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Cargando...' : `${filteredOrders.length} encargos encontrados`}
            {schoolFilter && availableSchools.length > 1 && (
              <span className="ml-2 text-blue-600">
                • Filtrado por colegio
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Encargo
        </button>
      </div>

      {/* Order Modal */}
      <OrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
        schoolId={schoolIdForCreate}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-yellow-700">Pendientes</p>
              <p className="text-2xl font-bold text-yellow-900">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-600" />
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-blue-700">En Producción</p>
              <p className="text-2xl font-bold text-blue-900">{stats.inProduction}</p>
            </div>
            <Package className="w-8 h-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-green-700">Listos</p>
              <p className="text-2xl font-bold text-green-900">{stats.ready}</p>
            </div>
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">Entregados</p>
              <p className="text-2xl font-bold text-gray-900">{stats.delivered}</p>
            </div>
            <Truck className="w-8 h-8 text-gray-600" />
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, cliente, estudiante..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>

          {/* School Filter - Only show if user has multiple schools */}
          {availableSchools.length > 1 && (
            <select
              value={schoolFilter}
              onChange={(e) => setSchoolFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los colegios</option>
              {availableSchools.map(school => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>
          )}

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as OrderStatus | '')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todos los estados</option>
            <option value="pending">Pendiente</option>
            <option value="in_production">En Producción</option>
            <option value="ready">Listo</option>
            <option value="delivered">Entregado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando encargos...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar encargos</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadOrders}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {!loading && !error && filteredOrders.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                {availableSchools.length > 1 && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colegio
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Entrega
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Saldo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredOrders.map((order) => {
                const statusConfig = getStatusConfig(order.status);
                const hasBalance = order.balance > 0;

                return (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-medium text-gray-900">{order.code}</span>
                      {getSourceBadge(order.source)}
                    </td>
                    {availableSchools.length > 1 && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Building2 className="w-4 h-4 mr-2 text-gray-400" />
                          <span className="truncate max-w-[120px]" title={order.school_name || ''}>
                            {order.school_name || 'Sin colegio'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">{order.client_name || 'Sin cliente'}</div>
                      {order.student_name && (
                        <div className="text-xs text-gray-500">{order.student_name}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${statusConfig.color}`}>
                        {statusConfig.icon}
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-600">
                        <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                        {formatDate(order.delivery_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(order.total)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className={`text-sm font-medium ${hasBalance ? 'text-red-600' : 'text-green-600'}`}>
                        {hasBalance ? formatCurrency(order.balance) : 'Pagado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm text-gray-600">{order.items_count}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleViewOrder(order.id)}
                        className="text-blue-600 hover:text-blue-800 p-2 rounded hover:bg-blue-50 transition"
                        title="Ver detalle"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredOrders.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <FileText className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {searchTerm || statusFilter || schoolFilter ? 'No se encontraron encargos' : 'No hay encargos'}
          </h3>
          <p className="text-blue-700 mb-4">
            {searchTerm || statusFilter || schoolFilter
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primer encargo'
            }
          </p>
          {!searchTerm && !statusFilter && !schoolFilter && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nuevo Encargo
            </button>
          )}
        </div>
      )}
    </Layout>
  );
}
