/**
 * Sales Page - List and manage sales
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SaleModal from '../components/SaleModal';
import { ShoppingCart, Plus, Search, AlertCircle, Loader2, Eye, Calendar, User, DollarSign } from 'lucide-react';
import { saleService } from '../services/saleService';
import { clientService } from '../services/clientService';
import type { Sale } from '../types/api';
import { DEMO_SCHOOL_ID } from '../config/constants';

export default function Sales() {
  const navigate = useNavigate();
  const [sales, setSales] = useState<Sale[]>([]);
  const [clients, setClients] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const schoolId = DEMO_SCHOOL_ID;

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleSuccess = () => {
    loadSales();
  };

  useEffect(() => {
    loadSales();
  }, []);

  const loadSales = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load sales and clients in parallel
      const [salesData, clientsData] = await Promise.all([
        saleService.getSales(schoolId),
        clientService.getClients(schoolId)
      ]);

      setSales(salesData);

      // Create a map of client_id -> client_name
      const clientMap = new Map<string, string>();
      clientsData.forEach(client => {
        clientMap.set(client.id, client.name);
      });
      setClients(clientMap);

    } catch (err: any) {
      console.error('Error loading sales:', err);
      setError(err.response?.data?.detail || 'Error al cargar ventas');
    } finally {
      setLoading(false);
    }
  };

  // Filter sales
  const filteredSales = sales.filter(sale => {
    const matchesSearch = searchTerm === '' ||
      sale.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === '' || sale.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
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

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return 'Fecha no disponible';

    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Fecha inválida';
      }
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'Fecha inválida';
    }
  };

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ventas</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Cargando...' : `${filteredSales.length} ventas encontradas`}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nueva Venta
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código de venta..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todas las ventas</option>
            <option value="completed">Completadas</option>
            <option value="paid">Pagadas</option>
            <option value="pending">Pendientes</option>
            <option value="cancelled">Canceladas</option>
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando ventas...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar ventas</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadSales}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sales Table */}
      {!loading && !error && filteredSales.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Método Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredSales.map((sale) => (
                <tr key={sale.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {sale.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-gray-400" />
                      {formatDate(sale.sale_date)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      {sale.client_id ? clients.get(sale.client_id) || 'Cliente desconocido' : 'Sin cliente'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-gray-400" />
                      ${Number(sale.total).toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {sale.payment_method || 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(sale.status)}`}>
                      {getStatusText(sale.status)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => navigate(`/sales/${sale.id}`)}
                      className="text-blue-600 hover:text-blue-800 flex items-center transition"
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredSales.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <ShoppingCart className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {searchTerm || statusFilter ? 'No se encontraron ventas' : 'No hay ventas registradas'}
          </h3>
          <p className="text-blue-700 mb-4">
            {searchTerm || statusFilter
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza creando tu primera venta'
            }
          </p>
          {!searchTerm && !statusFilter && (
            <button
              onClick={() => setIsModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Nueva Venta
            </button>
          )}
        </div>
      )}

      {/* Sale Modal */}
      <SaleModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        schoolId={schoolId}
      />
    </Layout>
  );
}
