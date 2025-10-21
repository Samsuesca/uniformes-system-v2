/**
 * Orders Page - List and manage custom orders
 */
import Layout from '../components/Layout';
import { FileText, Plus, Search, Filter } from 'lucide-react';

export default function Orders() {
  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Encargos</h1>
          <p className="text-gray-600 mt-1">Gestiona los encargos personalizados</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Encargo
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código, cliente, estado..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <button className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </button>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
            <option value="">Todos los estados</option>
            <option>Pendiente</option>
            <option>En Proceso</option>
            <option>Listo</option>
            <option>Entregado</option>
            <option>Cancelado</option>
          </select>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
        <div className="flex items-start">
          <FileText className="w-6 h-6 text-orange-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-orange-800">Página en desarrollo</h3>
            <p className="mt-1 text-sm text-orange-700">
              La lista de encargos se conectará próximamente con la API.
              Podrás gestionar encargos personalizados, medidas especiales y seguimiento de entregas.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
