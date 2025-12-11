/**
 * Login Page - User authentication screen
 */
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { ENVIRONMENTS, ENVIRONMENT_LABELS, type EnvironmentKey } from '../config/environments';
import { LogIn, AlertCircle, Settings, Loader2, Wifi, WifiOff } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  const { login, isLoading, error, clearError } = useAuthStore();
  const { apiUrl, setApiUrl } = useConfigStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showServerConfig, setShowServerConfig] = useState(false);
  const [selectedServer, setSelectedServer] = useState<string>(apiUrl);
  const [testingServer, setTestingServer] = useState<string | null>(null);
  const [serverStatus, setServerStatus] = useState<Record<string, 'success' | 'error' | 'testing'>>({});

  const selectServer = async (url: string) => {
    setSelectedServer(url);
    setTestingServer(url);
    setServerStatus(prev => ({ ...prev, [url]: 'testing' }));

    try {
      const response = await fetch(`${url}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });
      if (response.ok) {
        setServerStatus(prev => ({ ...prev, [url]: 'success' }));
        setApiUrl(url);
      } else {
        setServerStatus(prev => ({ ...prev, [url]: 'error' }));
      }
    } catch {
      setServerStatus(prev => ({ ...prev, [url]: 'error' }));
    }
    setTestingServer(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    clearError();

    try {
      await login({ username, password });
      navigate('/dashboard');
    } catch (err) {
      // Error is already set in store
      console.error('Login failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-md p-8 relative overflow-hidden">
        {/* Decorative Top Bar */}
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-600 to-brand-400"></div>

        {/* Logo/Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-50 rounded-2xl mb-4 shadow-inner">
            <LogIn className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold font-display text-primary tracking-tight">Uniformes System</h1>
          <p className="text-slate-500 mt-2 font-medium">Inicia sesión para continuar</p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start">
            <AlertCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-800 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Username Input */}
          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-slate-700 mb-2">
              Usuario o Email
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-200 bg-surface-50 focus:bg-white text-slate-800 placeholder-slate-400"
              placeholder="admin"
              disabled={isLoading}
            />
          </div>

          {/* Password Input */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-200 bg-surface-50 focus:bg-white text-slate-800 placeholder-slate-400"
              placeholder="••••••••"
              disabled={isLoading}
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 hover:-translate-y-0.5"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Iniciando sesión...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5 mr-2" />
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        {/* Server Configuration Toggle */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <button
            type="button"
            onClick={() => setShowServerConfig(!showServerConfig)}
            className="w-full flex items-center justify-center text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            <Settings className="w-4 h-4 mr-2" />
            Configurar Servidor
          </button>

          {showServerConfig && (
            <div className="mt-4 p-4 bg-slate-50 rounded-xl space-y-2">
              <p className="text-xs text-slate-500 mb-3">Selecciona el servidor:</p>
              {(Object.keys(ENVIRONMENTS) as EnvironmentKey[]).map((key) => {
                const url = ENVIRONMENTS[key];
                const isSelected = apiUrl === url;
                const status = serverStatus[url];
                const isTesting = testingServer === url;

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectServer(url)}
                    disabled={isTesting}
                    className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className="text-left">
                      <span className={`text-sm font-medium ${isSelected ? 'text-brand-700' : 'text-slate-700'}`}>
                        {ENVIRONMENT_LABELS[key]}
                      </span>
                      <p className="text-xs text-slate-400 font-mono">{url}</p>
                    </div>
                    <div className="flex items-center">
                      {isTesting ? (
                        <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                      ) : status === 'success' ? (
                        <Wifi className="w-5 h-5 text-green-500" />
                      ) : status === 'error' ? (
                        <WifiOff className="w-5 h-5 text-red-500" />
                      ) : isSelected ? (
                        <div className="w-3 h-3 rounded-full bg-brand-500" />
                      ) : null}
                    </div>
                  </button>
                );
              })}
              {serverStatus[apiUrl] === 'success' && (
                <p className="text-xs text-green-600 mt-2 text-center">
                  ✓ Conectado al servidor
                </p>
              )}
              {serverStatus[selectedServer] === 'error' && (
                <p className="text-xs text-red-600 mt-2 text-center">
                  ✗ No se pudo conectar al servidor
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-400 font-medium">
            Sistema de Gestión de Uniformes v2.0
          </p>
        </div>
      </div>
    </div>
  );
}
