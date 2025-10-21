/**
 * Clients Page - List and manage clients
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { Users, Plus, Search, AlertCircle, Loader2, Mail, Phone, User } from 'lucide-react';
import { clientService } from '../services/clientService';
import type { Client } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { DEMO_SCHOOL_ID } from '../config/constants';

export default function Clients() {
  const { user } = useAuthStore();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // TODO: Get school_id from user context or user_school_roles
  const schoolId = DEMO_SCHOOL_ID;

  useEffect(() => {
    loadClients();
  }, []);

  const loadClients = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await clientService.getClients(schoolId);
      setClients(data);
    } catch (err: any) {
      console.error('Error loading clients:', err);
      setError(err.response?.data?.detail || 'Error al cargar clientes');
    } finally {
      setLoading(false);
    }
  };

  // Filter clients
  const filteredClients = clients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    return searchTerm === '' ||
      client.name.toLowerCase().includes(searchLower) ||
      client.phone?.toLowerCase().includes(searchLower) ||
      client.email?.toLowerCase().includes(searchLower) ||
      client.student_name?.toLowerCase().includes(searchLower);
  });

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Cargando...' : `${filteredClients.length} clientes encontrados`}
          </p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition">
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Cliente
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, teléfono, email, estudiante..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando clientes...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar clientes</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadClients}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clients Grid */}
      {!loading && !error && filteredClients.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClients.map((client) => (
            <div
              key={client.id}
              className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow"
            >
              {/* Client Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-800">{client.name}</h3>
                  {client.student_name && (
                    <div className="flex items-center mt-1 text-sm text-gray-600">
                      <User className="w-4 h-4 mr-1" />
                      <span>{client.student_name}</span>
                    </div>
                  )}
                </div>
                <span className={`px-2 py-1 text-xs leading-5 font-semibold rounded-full ${
                  client.is_active
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {client.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              {/* Contact Info */}
              <div className="space-y-2">
                {client.phone && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Phone className="w-4 h-4 mr-2 text-gray-400" />
                    <span>{client.phone}</span>
                  </div>
                )}
                {client.email && (
                  <div className="flex items-center text-sm text-gray-600">
                    <Mail className="w-4 h-4 mr-2 text-gray-400" />
                    <span className="truncate">{client.email}</span>
                  </div>
                )}
              </div>

              {/* Balance Info */}
              {client.balance && client.balance !== '0' && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Balance:</span>
                    <span className={`text-sm font-semibold ${
                      parseFloat(client.balance) > 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      ${parseFloat(client.balance).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredClients.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <Users className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes'}
          </h3>
          <p className="text-blue-700 mb-4">
            {searchTerm
              ? 'Intenta ajustar el término de búsqueda'
              : 'Comienza agregando tu primer cliente'
            }
          </p>
          {!searchTerm && (
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center">
              <Plus className="w-5 h-5 mr-2" />
              Agregar Cliente
            </button>
          )}
        </div>
      )}
    </Layout>
  );
}
