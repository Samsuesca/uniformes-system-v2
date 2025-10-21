/**
 * Settings Page - Application and school settings
 */
import Layout from '../components/Layout';
import { Settings as SettingsIcon, School, User, Bell, Lock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';

export default function Settings() {
  const { user } = useAuthStore();

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-600 mt-1">Administra la configuración del sistema</p>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Perfil de Usuario</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nombre de usuario</label>
              <p className="text-gray-800 font-medium">{user?.username}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Nombre completo</label>
              <p className="text-gray-800 font-medium">{user?.full_name || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="text-gray-800 font-medium">{user?.email}</p>
            </div>
            <button className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition">
              Editar Perfil
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Lock className="w-5 h-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Seguridad</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Cambia tu contraseña para mantener tu cuenta segura.
            </p>
            <button className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition">
              Cambiar Contraseña
            </button>
          </div>
        </div>

        {/* School Settings (only for admins) */}
        {user?.is_superuser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <School className="w-5 h-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Colegios</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Gestiona los colegios registrados en el sistema.
              </p>
              <button className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition">
                Administrar Colegios
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Stock bajo</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Nuevas ventas</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Encargos listos</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mt-6">
        <div className="flex items-start">
          <SettingsIcon className="w-6 h-6 text-gray-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-gray-800">Configuración en desarrollo</h3>
            <p className="mt-1 text-sm text-gray-700">
              Las opciones de configuración se conectarán próximamente con la API.
              Podrás personalizar colores, impuestos, comisiones y más.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
