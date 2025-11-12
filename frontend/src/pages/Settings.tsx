/**
 * Settings Page - Application and school settings
 */
import { useState } from 'react';
import Layout from '../components/Layout';
import { Settings as SettingsIcon, School, User, Bell, Lock, Server, CheckCircle, XCircle } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { ENVIRONMENTS, ENVIRONMENT_LABELS, ENVIRONMENT_DESCRIPTIONS, type EnvironmentKey } from '../config/environments';

export default function Settings() {
  const { user } = useAuthStore();
  const { apiUrl, setApiUrl, isOnline } = useConfigStore();
  const [customUrl, setCustomUrl] = useState(apiUrl);

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-600 mt-1">Administra la configuración del sistema</p>
      </div>

      {/* Server Configuration - Full Width */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Configuración del Servidor</h2>
          </div>
          <div className="flex items-center">
            {isOnline ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Desconectado</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona el servidor al que deseas conectarte. Esto te permite trabajar en modo local,
            conectarte a un servidor en tu red local, o usar el servidor en la nube.
          </p>

          {/* Environment Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entorno
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(ENVIRONMENTS) as EnvironmentKey[]).map((env) => (
                <button
                  key={env}
                  onClick={() => {
                    const url = ENVIRONMENTS[env];
                    setApiUrl(url);
                    setCustomUrl(url);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    apiUrl === ENVIRONMENTS[env]
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-semibold text-gray-800 mb-1">
                    {ENVIRONMENT_LABELS[env]}
                  </div>
                  <div className="text-xs text-gray-600">
                    {ENVIRONMENT_DESCRIPTIONS[env]}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 font-mono break-all">
                    {ENVIRONMENTS[env]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Personalizada
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="http://192.168.1.100:8000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => setApiUrl(customUrl)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Aplicar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ingresa la dirección IP y puerto de tu servidor personalizado
            </p>
          </div>

          {/* Current URL Display */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-700">Servidor Actual:</div>
            <div className="text-sm text-gray-600 font-mono mt-1">{apiUrl}/api/v1</div>
          </div>
        </div>
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
