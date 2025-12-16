/**
 * Dashboard Page - Main overview with aggregated statistics from all schools
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';
import {
  Package,
  Users,
  ShoppingCart,
  FileText,
  TrendingUp,
  AlertCircle,
  Loader2,
  Building2,
  ArrowRight,
  RefreshCw,
  DollarSign,
  MessageSquare,
  Mail
} from 'lucide-react';
import Layout from '../components/Layout';
import { dashboardService } from '../services/dashboardService';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { contactService, type Contact } from '../services/contactService';
import type { AggregatedDashboardStats, SchoolStats } from '../services/dashboardService';
import type { SaleListItem, Product } from '../types/api';

interface StatCard {
  title: string;
  value: string;
  subtitle?: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
  link?: string;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { availableSchools, loadSchools } = useSchoolStore();
  const [stats, setStats] = useState<AggregatedDashboardStats | null>(null);
  const [recentSales, setRecentSales] = useState<SaleListItem[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<Product[]>([]);
  const [recentContacts, setRecentContacts] = useState<Contact[]>([]);
  const [unreadContactsCount, setUnreadContactsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (availableSchools.length === 0) {
      loadSchools();
    }
  }, [availableSchools.length, loadSchools]);

  useEffect(() => {
    if (availableSchools.length > 0) {
      loadDashboardData();
    }
  }, [availableSchools]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load aggregated stats from all schools
      const schoolsForStats = availableSchools.map(s => ({
        id: s.id,
        name: s.name,
        code: s.code
      }));

      const [aggregatedStats, salesData, productsData, contactsData] = await Promise.all([
        dashboardService.getAggregatedStats(schoolsForStats),
        saleService.getAllSales({ limit: 5 }).catch(() => []),
        productService.getAllProducts({ with_stock: true, limit: 100 }).catch(() => []),
        contactService.getContacts({ page: 1, page_size: 5, unread_only: false }).catch(() => ({ items: [], total: 0, page: 1, page_size: 5, total_pages: 0 }))
      ]);

      setStats(aggregatedStats);
      setRecentSales(salesData);
      setRecentContacts(contactsData.items);

      // Count unread contacts
      const unreadCount = contactsData.items.filter(c => !c.is_read).length;
      setUnreadContactsCount(unreadCount);

      // Filter low stock products
      const lowStock = productsData.filter(p => {
        const stock = p.inventory_quantity ?? 0;
        const minStock = p.inventory_min_stock ?? 5;
        return stock <= minStock && stock >= 0;
      }).slice(0, 5);
      setLowStockProducts(lowStock);

    } catch (err: any) {
      console.error('Error loading dashboard:', err);
      setError(err.response?.data?.detail || 'Error al cargar el dashboard');
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Productos',
      value: stats ? stats.totals.total_products.toLocaleString() : '-',
      subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      link: '/products',
    },
    {
      title: 'Clientes',
      value: stats ? stats.totals.total_clients.toLocaleString() : '-',
      subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      link: '/clients',
    },
    {
      title: 'Ventas Totales',
      value: stats ? `$${stats.totals.total_sales.toLocaleString()}` : '-',
      subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      link: '/sales',
    },
    {
      title: 'Encargos',
      value: stats ? stats.totals.total_orders.toLocaleString() : '-',
      subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      link: '/orders',
    },
  ];

  const getTimeAgo = (dateString: string | null) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `Hace ${diffMins}m`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    return `Hace ${diffDays}d`;
  };

  return (
    <Layout>
      {/* Welcome Section */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold font-display text-primary tracking-tight">
            ¡Bienvenido, {user?.full_name || user?.username}!
          </h1>
          <p className="text-slate-500 mt-1 md:mt-2 text-base md:text-lg">
            {availableSchools.length === 1
              ? `Resumen de ${availableSchools[0].name}`
              : `Resumen de ${availableSchools.length} colegios`
            }
          </p>
        </div>
        <button
          onClick={loadDashboardData}
          disabled={loading}
          className="mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar el dashboard</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadDashboardData}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline font-medium"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            <span className="ml-3 text-slate-600 font-medium">Cargando estadísticas...</span>
          </div>
        ) : (
          statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                onClick={() => stat.link && navigate(stat.link)}
                className={`bg-white rounded-xl shadow-sm border border-surface-200 p-4 md:p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group ${
                  stat.link ? 'cursor-pointer' : ''
                }`}
              >
                <div className="flex items-center justify-between mb-3 md:mb-4">
                  <div className={`p-2 md:p-3 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300`}>
                    <Icon className="w-5 h-5 md:w-6 md:h-6" />
                  </div>
                  {stat.link && (
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors" />
                  )}
                </div>
                <h3 className="text-xl md:text-3xl font-bold font-display text-primary tracking-tight">{stat.value}</h3>
                <p className="text-xs md:text-sm text-slate-500 mt-1 font-medium">{stat.title}</p>
                {stat.subtitle && (
                  <p className="text-xs text-slate-400 mt-0.5">{stat.subtitle}</p>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stats by School (only if multiple schools) */}
      {!loading && stats && stats.school_count > 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <Building2 className="w-5 h-5 mr-2 text-brand-600" />
            Resumen por Colegio
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colegio
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Productos
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Clientes
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ventas
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Encargos
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {stats.by_school.map((school: SchoolStats) => (
                  <tr key={school.school_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{school.school_name}</div>
                      <div className="text-xs text-gray-500">{school.school_code}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {school.total_products.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {school.total_clients.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-green-600">
                      ${school.total_sales.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900">
                      {school.total_orders.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
              Ventas Recientes
            </h3>
            <button
              onClick={() => navigate('/sales')}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              Ver todas
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : recentSales.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <ShoppingCart className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No hay ventas recientes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentSales.map((sale) => (
                <div
                  key={sale.id}
                  onClick={() => navigate(`/sales/${sale.id}`)}
                  className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{sale.code}</span>
                      {sale.school_name && availableSchools.length > 1 && (
                        <span className="text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                          {sale.school_name}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {sale.client_name || 'Venta directa'}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p className="font-semibold text-gray-800 flex items-center justify-end">
                      <DollarSign className="w-4 h-4 text-green-500" />
                      {Number(sale.total).toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">{getTimeAgo(sale.sale_date)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
              Alertas de Stock Bajo
            </h3>
            <button
              onClick={() => navigate('/products')}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              Ver productos
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : lowStockProducts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <Package className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No hay alertas de stock bajo</p>
              <p className="text-xs text-slate-400 mt-1">¡Todo en orden!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockProducts.map((product) => {
                const stock = product.inventory_quantity ?? 0;
                const isOutOfStock = stock === 0;
                return (
                  <div
                    key={product.id}
                    onClick={() => navigate('/products')}
                    className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 truncate">
                          {product.name || product.code}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        {product.code} • Talla {product.size}
                      </p>
                    </div>
                    <div className="flex-shrink-0 ml-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-800'
                          : 'bg-orange-100 text-orange-800'
                      }`}>
                        {isOutOfStock ? 'Sin stock' : `${stock} uds`}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent PQRS Contacts */}
        <div className="bg-white rounded-xl shadow-sm border border-surface-200 p-6 overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <MessageSquare className="w-5 h-5 mr-2 text-blue-600" />
              Mensajes PQRS
            </h3>
            <button
              onClick={() => navigate('/contacts')}
              className="text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1"
            >
              Ver todos
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : recentContacts.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <MessageSquare className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p>No hay mensajes PQRS</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentContacts.map((contact) => (
                <div
                  key={contact.id}
                  onClick={() => navigate('/contacts')}
                  className="flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800 truncate">
                        {contact.name}
                      </span>
                      {!contact.is_read && (
                        <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full"></span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 truncate">
                      {contact.subject}
                    </p>
                  </div>
                  <div className="flex-shrink-0 ml-4">
                    {contact.is_read ? (
                      <span className="text-xs text-gray-400">Leído</span>
                    ) : (
                      <Mail className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {unreadContactsCount > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-600">
                <Mail className="w-4 h-4" />
                <span className="font-medium">{unreadContactsCount} mensaje{unreadContactsCount !== 1 ? 's' : ''} sin leer</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center justify-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-700 font-medium transition-colors"
        >
          <ShoppingCart className="w-5 h-5" />
          <span>Nueva Venta</span>
        </button>
        <button
          onClick={() => navigate('/orders')}
          className="flex items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 font-medium transition-colors"
        >
          <FileText className="w-5 h-5" />
          <span>Nuevo Encargo</span>
        </button>
        <button
          onClick={() => navigate('/products')}
          className="flex items-center justify-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-700 font-medium transition-colors"
        >
          <Package className="w-5 h-5" />
          <span>Ver Productos</span>
        </button>
        <button
          onClick={() => navigate('/clients')}
          className="flex items-center justify-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-700 font-medium transition-colors"
        >
          <Users className="w-5 h-5" />
          <span>Ver Clientes</span>
        </button>
      </div>
    </Layout>
  );
}
