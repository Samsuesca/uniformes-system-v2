/**
 * Dashboard Page - Main overview with statistics
 */
import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Package, Users, ShoppingCart, FileText, TrendingUp, AlertCircle, Loader2 } from 'lucide-react';
import Layout from '../components/Layout';
import { dashboardService } from '../services/dashboardService';
import type { DashboardStats } from '../services/dashboardService';
import { DEMO_SCHOOL_ID } from '../config/constants';

interface StatCard {
  title: string;
  value: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // TODO: Get school_id from user context or user_school_roles
  const schoolId = DEMO_SCHOOL_ID;

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await dashboardService.getStats(schoolId);
      setStats(data);
    } catch (err: any) {
      console.error('Error loading dashboard stats:', err);
      setError(err.response?.data?.detail || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  const statCards: StatCard[] = [
    {
      title: 'Total Productos',
      value: stats ? stats.total_products.toString() : '-',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Clientes',
      value: stats ? stats.total_clients.toString() : '-',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Ventas Totales',
      value: stats ? `$${stats.total_sales.toLocaleString()}` : '-',
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Encargos Activos',
      value: stats ? stats.total_orders.toString() : '-',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <Layout>
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          ¡Bienvenido, {user?.full_name || user?.username}!
        </h1>
        <p className="text-gray-600 mt-2">
          Aquí está el resumen de tu sistema de uniformes
        </p>
      </div>

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar estadísticas</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadStats}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {loading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600">Cargando estadísticas...</span>
          </div>
        ) : (
          statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.title}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`w-6 h-6 ${stat.color}`} />
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
                <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
              </div>
            );
          })
        )}
      </div>

      {/* Recent Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
            Ventas Recientes
          </h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">VNT-2024-00{i}</p>
                  <p className="text-sm text-gray-500">Cliente {i}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-800">$150,000</p>
                  <p className="text-xs text-gray-500">Hace 2h</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
            <AlertCircle className="w-5 h-5 mr-2 text-orange-600" />
            Alertas de Stock Bajo
          </h3>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="font-medium text-gray-800">Camisa Talla M</p>
                  <p className="text-sm text-gray-500">PRD-00{i}</p>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                    {3 - i} unidades
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-4">
            <h3 className="text-sm font-medium text-blue-800">Sistema Multi-Tenant</h3>
            <p className="mt-1 text-sm text-blue-700">
              Este dashboard muestra datos de ejemplo. Conecta con tu colegio para ver información real.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
