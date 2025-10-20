/**
 * Dashboard Page - Main overview with statistics
 */
import { useAuthStore } from '../stores/authStore';
import { Package, Users, ShoppingCart, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import Layout from '../components/Layout';

interface StatCard {
  title: string;
  value: string;
  icon: typeof Package;
  color: string;
  bgColor: string;
  change?: string;
}

export default function Dashboard() {
  const { user } = useAuthStore();

  const stats: StatCard[] = [
    {
      title: 'Total Productos',
      value: '125',
      icon: Package,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      change: '+12%'
    },
    {
      title: 'Clientes',
      value: '348',
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      change: '+8%'
    },
    {
      title: 'Ventas del Mes',
      value: '87',
      icon: ShoppingCart,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      change: '+23%'
    },
    {
      title: 'Encargos Activos',
      value: '23',
      icon: FileText,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
      change: '-5%'
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
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
                {stat.change && (
                  <span className={`text-sm font-medium ${
                    stat.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stat.change}
                  </span>
                )}
              </div>
              <h3 className="text-2xl font-bold text-gray-800">{stat.value}</h3>
              <p className="text-sm text-gray-500 mt-1">{stat.title}</p>
            </div>
          );
        })}
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
