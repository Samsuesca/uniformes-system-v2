/**
 * Sale Changes Page - Create and manage change/return requests
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SaleChangeModal from '../components/SaleChangeModal';
import { RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Loader2, Eye, Search, Plus, ShoppingCart } from 'lucide-react';
import { saleChangeService } from '../services/saleChangeService';
import { saleService } from '../services/saleService';
import { useSchoolStore } from '../stores/schoolStore';
import type { SaleChangeListItem, SaleListItem, SaleWithItems } from '../types/api';

export default function SaleChanges() {
  const navigate = useNavigate();
  const { currentSchool } = useSchoolStore();
  const [changes, setChanges] = useState<SaleChangeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // Search for sales to create changes
  const [showSaleSearch, setShowSaleSearch] = useState(false);
  const [saleSearchTerm, setSaleSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<SaleListItem[]>([]);
  const [allSales, setAllSales] = useState<SaleListItem[]>([]);

  // Modal for creating change
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState<SaleWithItems | null>(null);
  const [loadingSale, setLoadingSale] = useState(false);

  const schoolId = currentSchool?.id || '';

  useEffect(() => {
    loadAllChanges();
    loadAllSales();
  }, []);

  const loadAllSales = async () => {
    try {
      const sales = await saleService.getSales(schoolId);
      // Only completed sales can have changes
      setAllSales(sales.filter(s => s.status === 'completed'));
    } catch (err) {
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
    const filtered = allSales.filter(sale =>
      sale.code.toLowerCase().includes(term) ||
      (sale.client_name && sale.client_name.toLowerCase().includes(term))
    );
    setSearchResults(filtered.slice(0, 10));
  }, [saleSearchTerm, allSales]);

  const handleSelectSale = async (sale: SaleListItem) => {
    try {
      setLoadingSale(true);
      const fullSale = await saleService.getSaleWithItems(schoolId, sale.id);
      setSelectedSale(fullSale);
      setShowSaleSearch(false);
      setShowChangeModal(true);
    } catch (err: any) {
      console.error('Error loading sale details:', err);
      alert('Error al cargar los detalles de la venta');
    } finally {
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
      const allChanges: SaleChangeListItem[] = [];
      for (const sale of sales) {
        try {
          const saleChanges = await saleChangeService.getSaleChanges(schoolId, sale.id);
          allChanges.push(...saleChanges);
        } catch (err) {
          console.error(`Error loading changes for sale ${sale.id}:`, err);
        }
      }

      setChanges(allChanges);
    } catch (err: any) {
      console.error('Error loading changes:', err);
      setError(err.response?.data?.detail || 'Error al cargar las solicitudes de cambio');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (saleId: string, changeId: string) => {
    if (!confirm('¿Confirmar aprobación de este cambio? Se ajustará el inventario automáticamente.')) {
      return;
    }

    try {
      setProcessingId(changeId);
      setError(null);
      await saleChangeService.approveChange(schoolId, saleId, changeId);
      await loadAllChanges();
    } catch (err: any) {
      console.error('Error approving change:', err);
      setError(err.response?.data?.detail || 'Error al aprobar el cambio');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (saleId: string, changeId: string) => {
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
    } catch (err: any) {
      console.error('Error rejecting change:', err);
      setError(err.response?.data?.detail || 'Error al rechazar el cambio');
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getChangeTypeLabel = (type: string) => {
    switch (type) {
      case 'size_change': return 'Cambio de Talla';
      case 'product_change': return 'Cambio de Producto';
      case 'return': return 'Devolución';
      case 'defect': return 'Producto Defectuoso';
      default: return type;
    }
  };

  const getChangeStatusColor = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChangeStatusIcon = (status: string) => {
    const s = status.toLowerCase();
    switch (s) {
      case 'approved': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'rejected': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
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
  const sortedChanges = [...filteredChanges].sort((a, b) =>
    new Date(b.change_date).getTime() - new Date(a.change_date).getTime()
  );

  const pendingCount = changes.filter(c => c.status.toLowerCase() === 'pending').length;
  const approvedCount = changes.filter(c => c.status.toLowerCase() === 'approved').length;
  const rejectedCount = changes.filter(c => c.status.toLowerCase() === 'rejected').length;

  return (
    <Layout>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center">
              <RefreshCw className="w-8 h-8 mr-3 text-blue-600" />
              Gestión de Cambios y Devoluciones
            </h1>
            <p className="text-gray-600 mt-1">
              {loading ? 'Cargando...' : `${filteredChanges.length} solicitudes encontradas`}
            </p>
          </div>
          <button
            onClick={() => setShowSaleSearch(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
          >
            <Plus className="w-5 h-5 mr-2" />
            Nuevo Cambio/Devolución
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-700">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-900">{pendingCount}</p>
              </div>
              <Clock className="w-8 h-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700">Aprobadas</p>
                <p className="text-2xl font-bold text-green-900">{approvedCount}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-700">Rechazadas</p>
                <p className="text-2xl font-bold text-red-900">{rejectedCount}</p>
              </div>
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Search className="w-5 h-5 text-gray-400" />
              <span className="text-sm font-medium text-gray-700">Filtros:</span>
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendientes</option>
              <option value="APPROVED">Aprobadas</option>
              <option value="REJECTED">Rechazadas</option>
            </select>

            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Todos los tipos</option>
              <option value="size_change">Cambio de Talla</option>
              <option value="product_change">Cambio de Producto</option>
              <option value="return">Devolución</option>
              <option value="defect">Producto Defectuoso</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sale Search Modal */}
      {showSaleSearch && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-800 flex items-center">
                  <ShoppingCart className="w-6 h-6 mr-2 text-blue-600" />
                  Buscar Venta
                </h2>
                <button
                  onClick={() => setShowSaleSearch(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>
              <div className="relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código de venta o nombre de cliente..."
                  value={saleSearchTerm}
                  onChange={(e) => setSaleSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  autoFocus
                />
              </div>
            </div>

            <div className="overflow-y-auto max-h-[50vh]">
              {loadingSale && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                  <span>Cargando detalles de la venta...</span>
                </div>
              )}

              {!loadingSale && searchResults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No se encontraron ventas completadas</p>
                  <p className="text-sm mt-1">Solo las ventas completadas pueden tener cambios o devoluciones</p>
                </div>
              )}

              {!loadingSale && searchResults.map(sale => (
                <button
                  key={sale.id}
                  onClick={() => handleSelectSale(sale)}
                  className="w-full p-4 border-b border-gray-100 hover:bg-blue-50 text-left transition flex items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-gray-900">{sale.code}</p>
                    <p className="text-sm text-gray-600">
                      {sale.client_name || 'Sin cliente'} • {sale.items_count} items
                    </p>
                    <p className="text-xs text-gray-400">
                      {formatDate(sale.sale_date)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-gray-900">
                      ${Number(sale.total).toLocaleString()}
                    </p>
                    <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                      Completada
                    </span>
                  </div>
                </button>
              ))}
            </div>

            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600 text-center">
                Selecciona una venta para crear un cambio o devolución
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Change Modal */}
      {showChangeModal && selectedSale && (
        <SaleChangeModal
          isOpen={showChangeModal}
          onClose={() => {
            setShowChangeModal(false);
            setSelectedSale(null);
          }}
          saleId={selectedSale.id}
          saleItems={selectedSale.items}
          schoolId={schoolId}
          onSuccess={handleChangeCreated}
        />
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando solicitudes...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadAllChanges}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Changes Table */}
      {!loading && sortedChanges.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Venta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cant. Dev.
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cant. Nueva
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ajuste
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Motivo
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedChanges.map((change) => {
                const isProcessing = processingId === change.id;
                const isPending = change.status.toLowerCase() === 'pending';

                return (
                  <tr key={change.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => navigate(`/sales/${change.sale_id}`)}
                        className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        {change.sale_code}
                        <Eye className="w-4 h-4 ml-1" />
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatDate(change.change_date)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getChangeTypeLabel(change.change_type)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {change.returned_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {change.new_quantity}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={Number(change.price_adjustment) >= 0 ? 'text-green-600 font-medium' : 'text-red-600 font-medium'}>
                        ${Number(change.price_adjustment).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${getChangeStatusColor(change.status)}`}>
                        {getChangeStatusIcon(change.status)}
                        {getStatusLabel(change.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                      {change.reason || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      {isPending && !isProcessing && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleApprove(change.sale_id, change.id)}
                            className="text-green-600 hover:text-green-800 p-2 rounded hover:bg-green-50 transition"
                            title="Aprobar"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => handleReject(change.sale_id, change.id)}
                            className="text-red-600 hover:text-red-800 p-2 rounded hover:bg-red-50 transition"
                            title="Rechazar"
                          >
                            <XCircle className="w-5 h-5" />
                          </button>
                        </div>
                      )}
                      {isProcessing && (
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600 mx-auto" />
                      )}
                      {!isPending && !isProcessing && (
                        <span className="text-gray-400 text-xs">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && sortedChanges.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <RefreshCw className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {statusFilter || typeFilter ? 'No se encontraron solicitudes' : 'No hay solicitudes de cambio'}
          </h3>
          <p className="text-blue-700 mb-4">
            {statusFilter || typeFilter
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Las solicitudes de cambio y devolución aparecerán aquí'
            }
          </p>
          {!statusFilter && !typeFilter && (
            <button
              onClick={() => setShowSaleSearch(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Crear Cambio/Devolución
            </button>
          )}
        </div>
      )}
    </Layout>
  );
}
