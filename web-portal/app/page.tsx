'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, School as SchoolIcon, ArrowRight, User, LogOut, Package, Eye, EyeOff, HelpCircle, MessageCircle } from 'lucide-react';
import Footer from '@/components/Footer';
import { schoolsApi, type School } from '@/lib/api';
import { useClientAuth } from '@/lib/clientAuth';

export default function Home() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  // Auth state
  const { client, isAuthenticated, login, logout, isLoading: authLoading, error: authError, clearError } = useClientAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await schoolsApi.list();
      setSchools(response.data);
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSchoolSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const success = await login(loginForm.email, loginForm.password);
    if (success) {
      setShowLoginModal(false);
      setLoginForm({ email: '', password: '' });
    }
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-white to-yellow-50 flex flex-col">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-primary to-primary-light text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/logo.png" alt="Uniformes Consuelo Rios" className="h-16 sm:h-20 w-auto" />
              <span className="text-xl sm:text-2xl font-bold font-display text-brand-500 hidden sm:block">Uniformes Consuelo Rios</span>
            </div>

            {/* Auth Section */}
            {mounted && (
              <div className="flex items-center gap-4">
                {isAuthenticated && client ? (
                  <>
                    <button
                      onClick={() => router.push('/mi-cuenta')}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                    >
                      <Package className="w-4 h-4" />
                      <span className="hidden sm:inline">Mis Pedidos</span>
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-sm font-semibold">{client.name}</p>
                        <p className="text-xs text-blue-200">{client.email}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="p-2 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"
                        title="Cerrar sesión"
                      >
                        <LogOut className="w-5 h-5" />
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    onClick={() => setShowLoginModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-500 text-primary rounded-lg hover:bg-brand-400 transition-colors font-semibold"
                  >
                    <User className="w-4 h-4" />
                    <span>Iniciar Sesión</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
            Encuentra todo lo necesario para ti
          </h1>
          <p className="text-xl text-brand-300 mb-2">
            Calidad y los mejores precios
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex-1">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 font-display mb-3">
            Selecciona tu Colegio
          </h2>
          <p className="text-lg text-gray-600">
            Busca tu institución y explora nuestro catálogo completo
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar colegio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all bg-white shadow-sm text-primary placeholder-slate-400"
            />
          </div>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600"></div>
            <p className="mt-4 text-slate-600">Cargando colegios...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
            <SchoolIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No se encontraron colegios</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => {
              // Map school slug to logo filename
              const getSchoolLogo = (slug: string) => {
                const logoMap: Record<string, string> = {
                  'caracas': 'caracas.jpg',
                  'el-pinal': 'pinal.jpeg',
                  'alfonso-lopez-pumarejo': 'pumarejo.jpeg',
                };
                return logoMap[slug] || null;
              };

              const logoFile = getSchoolLogo(school.slug);

              return (
                <button
                  key={school.id}
                  onClick={() => handleSchoolSelect(school.slug)}
                  className="group bg-white rounded-2xl border-2 border-gray-200 p-8 hover:shadow-2xl hover:border-brand-500 hover:-translate-y-2 transition-all duration-300 text-left"
                >
                  <div className="text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-100 to-brand-200 flex items-center justify-center mx-auto mb-4 group-hover:from-primary group-hover:to-primary-light transition-all overflow-hidden">
                      {logoFile ? (
                        <img
                          src={`/school-logos/${logoFile}`}
                          alt={`Escudo ${school.name}`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <SchoolIcon className="w-10 h-10 text-brand-600 group-hover:text-brand-400 transition-colors" />
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-gray-800 font-display mb-2">
                      {school.name}
                    </h3>
                    <div className="flex items-center justify-center gap-2 text-brand-600 font-semibold group-hover:gap-3 transition-all">
                      <span>Ver catálogo</span>
                      <ArrowRight className="w-5 h-5" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Contact CTA */}
        <div className="mt-16 bg-white rounded-2xl border border-surface-200 p-8 text-center">
          <h3 className="text-xl font-bold text-gray-800 font-display mb-3">
            ¿Necesitas ayuda?
          </h3>
          <p className="text-gray-600 mb-6">
            ¿No encuentras tu colegio o tienes preguntas sobre nuestros uniformes?
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="https://wa.me/573105997451?text=Hola, necesito información sobre uniformes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold"
            >
              <MessageCircle className="w-5 h-5" />
              WhatsApp
            </a>
            <button
              onClick={() => router.push('/soporte')}
              className="flex items-center gap-2 px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold"
            >
              <HelpCircle className="w-5 h-5" />
              Centro de Soporte
            </button>
          </div>
        </div>
      </main>

      <Footer />

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-brand-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 font-display">
                Iniciar Sesión
              </h2>
              <p className="text-gray-600 mt-2">
                Accede para ver tu historial de pedidos
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value });
                    clearError();
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={loginForm.password}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, password: e.target.value });
                      clearError();
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all pr-12"
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {authError}
                </div>
              )}

              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 bg-primary text-white rounded-xl hover:bg-primary-light transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {authLoading ? 'Iniciando...' : 'Iniciar Sesión'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  router.push('/recuperar-password');
                }}
                className="w-full text-sm text-brand-600 hover:text-brand-700 mt-3"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 text-center mb-3">
                ¿No tienes cuenta?
              </p>
              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  router.push('/registro');
                }}
                className="w-full py-3 bg-gray-100 text-gray-800 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
              >
                Crear una cuenta
              </button>
            </div>

            <button
              onClick={() => {
                setShowLoginModal(false);
                clearError();
                setLoginForm({ email: '', password: '' });
              }}
              className="mt-4 w-full py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
