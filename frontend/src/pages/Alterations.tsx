/**
 * Alterations Page - List and manage alterations/repairs (Global view)
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import AlterationModal from '../components/AlterationModal';
import {
  Scissors, Plus, Search, AlertCircle, Loader2, Eye,
  User, DollarSign, CheckCircle, Clock, Package
} from 'lucide-react';
import { alterationService } from '../services/alterationService';
import type {
  AlterationListItem,
  AlterationsSummary,
  AlterationStatus,
  AlterationType
} from '../types/api';
import {
  ALTERATION_TYPE_LABELS,
  ALTERATION_STATUS_LABELS,
  ALTERATION_STATUS_COLORS
} from '../types/api';

export default function Alterations() {
  const navigate = useNavigate();
  const [alterations, setAlterations] = useState<AlterationListItem[]>([]);
  const [summary, setSummary] = useState<AlterationsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<AlterationStatus | ''>('');
  const [typeFilter, setTypeFilter] = useState<AlterationType | ''>('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'pending'>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [statusFilter, typeFilter, paymentFilter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [alterationsData, summaryData] = await Promise.all([
        alterationService.getAll({
          status: statusFilter || undefined,
          type: typeFilter || undefined,
          is_paid: paymentFilter === 'all' ? undefined : paymentFilter === 'paid',
          limit: 100
        }),
        alterationService.getSummary()
      ]);

      setAlterations(alterationsData);
      setSummary(summaryData);
    } catch (err: any) {
      console.error('Error loading alterations:', err);
      setError(err.response?.data?.detail || 'Error al cargar arreglos');
    } finally {
      setLoading(false);
    }
  };

  const handleSuccess = () => {
    loadData();
  };

  // Filter alterations locally by search
  const filteredAlterations = alterations.filter(alt => {
    if (searchTerm === '') return true;
    const term = searchTerm.toLowerCase();
    return (
      alt.code.toLowerCase().includes(term) ||
      alt.client_display_name.toLowerCase().includes(term) ||
      alt.garment_name.toLowerCase().includes(term)
    );
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900 flex items-center gap-2">
              <Scissors className="w-7 h-7 text-brand-600" />
              Arreglos
            </h1>
            <p className="text-gray-500 mt-1">
              Gestiona arreglos y confecciones tercerizadas
            </p>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nuevo Arreglo
          </button>
        </div>

        {/* Summary Cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Package className="w-4 h-4" />
                Total
              </div>
              <p className="text-2xl font-semibold text-gray-900">{summary.total_count}</p>
            </div>
            <div className="bg-yellow-50 rounded-lg p-4 shadow-sm border border-yellow-100">
              <div className="flex items-center gap-2 text-yellow-700 text-sm mb-1">
                <Clock className="w-4 h-4" />
                Pendientes
              </div>
              <p className="text-2xl font-semibold text-yellow-700">{summary.pending_count}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-4 shadow-sm border border-blue-100">
              <div className="flex items-center gap-2 text-blue-700 text-sm mb-1">
                <Scissors className="w-4 h-4" />
                En Proceso
              </div>
              <p className="text-2xl font-semibold text-blue-700">{summary.in_progress_count}</p>
            </div>
            <div className="bg-green-50 rounded-lg p-4 shadow-sm border border-green-100">
              <div className="flex items-center gap-2 text-green-700 text-sm mb-1">
                <CheckCircle className="w-4 h-4" />
                Listos
              </div>
              <p className="text-2xl font-semibold text-green-700">{summary.ready_count}</p>
            </div>
            <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Ingresos
              </div>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(summary.total_revenue)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-4 shadow-sm border border-red-100">
              <div className="flex items-center gap-2 text-red-700 text-sm mb-1">
                <DollarSign className="w-4 h-4" />
                Por Cobrar
              </div>
              <p className="text-xl font-semibold text-red-700">{formatCurrency(summary.total_pending_payment)}</p>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por código, cliente o prenda..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as AlterationStatus | '')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Todos los estados</option>
              {Object.entries(ALTERATION_STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as AlterationType | '')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="">Todos los tipos</option>
              {Object.entries(ALTERATION_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            {/* Payment Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value as 'all' | 'paid' | 'pending')}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
            >
              <option value="all">Todos los pagos</option>
              <option value="paid">Pagados</option>
              <option value="pending">Con saldo</option>
            </select>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
          </div>
        )}

        {/* Alterations Table */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            {filteredAlterations.length === 0 ? (
              <div className="text-center py-12">
                <Scissors className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No hay arreglos que mostrar</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="mt-4 text-brand-600 hover:text-brand-700 font-medium"
                >
                  Crear primer arreglo
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Código</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Cliente</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Prenda</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Tipo</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Estado</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Costo</th>
                      <th className="text-right px-4 py-3 text-sm font-medium text-gray-600">Saldo</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Recibido</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-gray-600">Entrega Est.</th>
                      <th className="text-center px-4 py-3 text-sm font-medium text-gray-600">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredAlterations.map((alteration) => (
                      <tr
                        key={alteration.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() => navigate(`/alterations/${alteration.id}`)}
                      >
                        <td className="px-4 py-3">
                          <span className="font-mono text-sm text-brand-600 font-medium">
                            {alteration.code}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-900">{alteration.client_display_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {alteration.garment_name}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                            {ALTERATION_TYPE_LABELS[alteration.alteration_type]}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 text-xs rounded-full ${ALTERATION_STATUS_COLORS[alteration.status]}`}>
                            {ALTERATION_STATUS_LABELS[alteration.status]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900">
                          {formatCurrency(alteration.cost)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {alteration.balance > 0 ? (
                            <span className="font-medium text-red-600">
                              {formatCurrency(alteration.balance)}
                            </span>
                          ) : (
                            <span className="text-green-600 flex items-center justify-end gap-1">
                              <CheckCircle className="w-4 h-4" />
                              Pagado
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {formatDate(alteration.received_date)}
                        </td>
                        <td className="px-4 py-3 text-gray-600 text-sm">
                          {alteration.estimated_delivery_date
                            ? formatDate(alteration.estimated_delivery_date)
                            : '-'
                          }
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/alterations/${alteration.id}`);
                            }}
                            className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <AlterationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleSuccess}
      />
    </Layout>
  );
}
