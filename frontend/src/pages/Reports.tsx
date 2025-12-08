/**
 * Reports Page - Business analytics and reporting
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import {
  BarChart3, TrendingUp, Package, Users, AlertTriangle, DollarSign,
  Loader2, AlertCircle, ShoppingBag, RefreshCw
} from 'lucide-react';
import { reportsService, type DashboardSummary, type TopProduct, type LowStockProduct, type TopClient } from '../services/reportsService';
import { useSchoolStore } from '../stores/schoolStore';

export default function Reports() {
  const { currentSchool } = useSchoolStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dashboard data
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [lowStock, setLowStock] = useState<LowStockProduct[]>([]);
  const [topClients, setTopClients] = useState<TopClient[]>([]);

  const schoolId = currentSchool?.id || '';

  useEffect(() => {
    loadAllReports();
  }, []);

  const loadAllReports = async () => {
    try {
      setLoading(true);
      setError(null);

      const [dashboardData, productsData, stockData, clientsData] = await Promise.all([
        reportsService.getDashboardSummary(schoolId),
        reportsService.getTopProducts(schoolId, 5),
        reportsService.getLowStock(schoolId, 10),
        reportsService.getTopClients(schoolId, 5),
      ]);

      setDashboard(dashboardData);
      setTopProducts(productsData);
      setLowStock(stockData);
      setTopClients(clientsData);
    } catch (err: any) {
      console.error('Error loading reports:', err);
      setError(err.response?.data?.detail || 'Error al cargar los reportes');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `$${Number(amount).toLocaleString()}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando reportes...</span>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar reportes</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadAllReports}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center">
            <BarChart3 className="w-8 h-8 mr-3 text-blue-600" />
            Reportes
          </h1>
          <p className="text-gray-600 mt-1">Resumen de métricas del negocio</p>
        </div>
        <button
          onClick={loadAllReports}
          className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center hover:bg-gray-50 transition"
        >
          <RefreshCw className="w-5 h-5 mr-2" />
          Actualizar
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Today's Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <span className="text-xs text-gray-500">Hoy</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboard?.today.revenue || 0)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dashboard?.today.sales_count || 0} ventas
          </p>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <span className="text-xs text-gray-500">Este Mes</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboard?.this_month.revenue || 0)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dashboard?.this_month.sales_count || 0} ventas · Ticket promedio: {formatCurrency(dashboard?.this_month.average_ticket || 0)}
          </p>
        </div>

        {/* Inventory Value */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-gray-500">Inventario</span>
          </div>
          <h3 className="text-2xl font-bold text-gray-900">
            {formatCurrency(dashboard?.inventory.total_value || 0)}
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {dashboard?.inventory.total_products || 0} productos
          </p>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-orange-600" />
            </div>
            <span className="text-xs text-gray-500">Alertas</span>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Stock bajo:</span>
              <span className={`font-bold ${(dashboard?.alerts.low_stock_count || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                {dashboard?.alerts.low_stock_count || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Encargos pendientes:</span>
              <span className={`font-bold ${(dashboard?.alerts.pending_orders_count || 0) > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                {dashboard?.alerts.pending_orders_count || 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Top Products */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <ShoppingBag className="w-5 h-5 mr-2 text-blue-600" />
              Productos Más Vendidos
            </h2>
            <p className="text-sm text-gray-500 mt-1">Últimos 30 días</p>
          </div>
          {topProducts.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Producto
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Vendidos
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Ingresos
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topProducts.map((product, index) => (
                    <tr key={product.product_id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="w-6 h-6 flex items-center justify-center bg-blue-100 text-blue-600 rounded-full text-xs font-bold mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {product.product_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {product.product_code} · {product.product_size}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                        {product.units_sold}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        {formatCurrency(product.total_revenue)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No hay datos de ventas disponibles
            </div>
          )}
        </div>

        {/* Top Clients */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <Users className="w-5 h-5 mr-2 text-green-600" />
              Mejores Clientes
            </h2>
            <p className="text-sm text-gray-500 mt-1">Por monto de compras</p>
          </div>
          {topClients.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Compras
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {topClients.map((client, index) => (
                    <tr key={client.client_id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <span className="w-6 h-6 flex items-center justify-center bg-green-100 text-green-600 rounded-full text-xs font-bold mr-3">
                            {index + 1}
                          </span>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {client.client_name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {client.client_phone || client.client_code}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right text-sm text-gray-900">
                        {client.total_purchases}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-green-600">
                        {formatCurrency(client.total_spent)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center text-gray-500">
              No hay datos de clientes disponibles
            </div>
          )}
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="p-6 border-b border-gray-200 bg-red-50">
            <h2 className="text-lg font-semibold text-red-800 flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2" />
              Productos con Stock Bajo
            </h2>
            <p className="text-sm text-red-600 mt-1">
              {lowStock.length} productos necesitan reabastecimiento
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Código
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Producto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Talla
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Stock Actual
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Stock Mínimo
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {lowStock.map((product) => (
                  <tr key={product.product_id} className="hover:bg-red-50">
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {product.product_code}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {product.product_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {product.product_size}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`px-2 py-1 text-xs font-bold rounded ${
                        product.current_stock === 0
                          ? 'bg-red-100 text-red-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {product.current_stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-sm text-gray-600">
                      {product.min_stock}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Layout>
  );
}
