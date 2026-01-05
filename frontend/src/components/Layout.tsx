/**
 * Layout Component - Main app layout with sidebar and navigation
 */
import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';
import { useUserRole, getRoleDisplayName, getRoleBadgeColor } from '../hooks/useUserRole';
import { DevelopmentBanner } from './EnvironmentIndicator';
import {
  LayoutDashboard,
  Package,
  Users,
  ShoppingCart,
  FileText,
  RefreshCw,
  Settings,
  LogOut,
  Menu,
  X,
  BarChart3,
  Building2,
  ChevronDown,
  Shield,
  Calculator,
  ShieldCheck,
  Clock,
  Wifi,
  WifiOff,
  Globe,
  MessageSquare,
  Wallet
} from 'lucide-react';
import { useConfigStore } from '../stores/configStore';

interface LayoutProps {
  children: ReactNode;
}

interface NavItem {
  name: string;
  path: string;
  icon: typeof LayoutDashboard;
  requiresAccounting?: boolean; // Only visible if user can access accounting
  requiresSuperuser?: boolean; // Only visible if user is superuser
  category?: 'main' | 'operations' | 'finance' | 'admin'; // For grouping
}

const navigation: NavItem[] = [
  // Main
  { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'main' },
  { name: 'Productos', path: '/products', icon: Package, category: 'main' },
  // Operations
  { name: 'Clientes', path: '/clients', icon: Users, category: 'operations' },
  { name: 'Ventas', path: '/sales', icon: ShoppingCart, category: 'operations' },
  { name: 'Cambios/Devoluciones', path: '/sale-changes', icon: RefreshCw, category: 'operations' },
  { name: 'Encargos', path: '/orders', icon: FileText, category: 'operations' },
  { name: 'Pedidos Web', path: '/web-orders', icon: Globe, category: 'operations' },
  { name: 'PQRS', path: '/contacts', icon: MessageSquare, category: 'operations' },
  // Finance (accounting access required)
  { name: 'Contabilidad', path: '/accounting', icon: Calculator, requiresAccounting: true, category: 'finance' },
  { name: 'Reportes', path: '/reports', icon: BarChart3, requiresAccounting: true, category: 'finance' },
  { name: 'Cuentas de Pago', path: '/payment-accounts', icon: Wallet, requiresSuperuser: true, category: 'finance' },
  // Admin
  { name: 'Configuración', path: '/settings', icon: Settings, category: 'admin' },
];

// Admin navigation (superuser only)
const adminNavigation: NavItem[] = [
  { name: 'Panel Admin', path: '/admin', icon: ShieldCheck },
];

export default function Layout({ children }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const { currentSchool, availableSchools, loadSchools, selectSchool } = useSchoolStore();
  const { isOnline } = useConfigStore();
  const { role, isSuperuser, canAccessAccounting } = useUserRole();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [schoolDropdownOpen, setSchoolDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, []);

  // Load schools on mount
  useEffect(() => {
    loadSchools();
  }, [loadSchools]);

  // Format time as HH:MM
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Format date
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CO', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-surface-50 font-sans text-primary">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-primary text-white transform transition-transform duration-300 ease-in-out shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-6 bg-primary-light border-b border-white/5">
          <h1 className="text-xl font-bold font-display tracking-tight text-white">Uniformes</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="mt-4 px-3 flex-1 overflow-y-auto pb-48" style={{ maxHeight: 'calc(100vh - 220px)' }}>
          {/* Filter navigation items based on permissions */}
          {(() => {
            const filteredNav = navigation.filter((item) => {
              if (item.requiresSuperuser && !isSuperuser) return false;
              if (item.requiresAccounting && !canAccessAccounting) return false;
              return true;
            });

            // Group by category
            const mainItems = filteredNav.filter(i => i.category === 'main');
            const operationsItems = filteredNav.filter(i => i.category === 'operations');
            const financeItems = filteredNav.filter(i => i.category === 'finance');
            const adminItems = filteredNav.filter(i => i.category === 'admin');

            const renderNavItem = (item: NavItem) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                      ? 'bg-brand-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                >
                  <Icon className={`w-4 h-4 mr-2.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}`} />
                  <span className="text-sm font-medium truncate">{item.name}</span>
                </button>
              );
            };

            return (
              <div className="space-y-4">
                {/* Main Section */}
                {mainItems.length > 0 && (
                  <div className="space-y-1">
                    {mainItems.map(renderNavItem)}
                  </div>
                )}

                {/* Operations Section */}
                {operationsItems.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Operaciones</p>
                    <div className="space-y-0.5">
                      {operationsItems.map(renderNavItem)}
                    </div>
                  </div>
                )}

                {/* Finance Section */}
                {financeItems.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Finanzas</p>
                    <div className="space-y-0.5">
                      {financeItems.map(renderNavItem)}
                    </div>
                  </div>
                )}

                {/* Admin Section */}
                {adminItems.length > 0 && (
                  <div>
                    <p className="px-3 py-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Sistema</p>
                    <div className="space-y-0.5">
                      {adminItems.map(renderNavItem)}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* Admin Navigation (Superuser Only) */}
          {isSuperuser && (
            <div className="mt-4">
              <p className="px-3 py-1.5 text-[10px] font-semibold text-amber-400/70 uppercase tracking-wider">Admin</p>
              <div className="space-y-0.5">
                {adminNavigation.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className={`w-full flex items-center px-3 py-2.5 rounded-lg transition-all duration-200 group ${isActive
                          ? 'bg-amber-600 text-white shadow-md'
                          : 'text-amber-300 hover:bg-amber-500/20 hover:text-amber-200'
                        }`}
                    >
                      <Icon className={`w-4 h-4 mr-2.5 flex-shrink-0 ${isActive ? 'text-white' : 'text-amber-400 group-hover:text-amber-200'}`} />
                      <span className="text-sm font-medium truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </nav>

        {/* User Profile - Compact */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-primary via-primary to-transparent">
          <div className="bg-white/5 rounded-xl p-3 backdrop-blur-sm border border-white/10">
            <div className="flex items-center mb-2">
              <div className="w-9 h-9 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-lg">
                <span className="text-sm font-bold">
                  {user?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="ml-2.5 flex-1 overflow-hidden">
                <p className="text-sm font-semibold text-white truncate">{user?.username}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>

            {/* Role Badge */}
            {(role || isSuperuser) && (
              <div className="mb-2 flex items-center justify-center">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                  isSuperuser
                    ? 'bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-200 border border-amber-400/40'
                    : role === 'seller'
                      ? 'bg-gradient-to-r from-emerald-500/30 to-green-500/30 text-emerald-200 border border-emerald-400/40'
                      : role === 'admin'
                        ? 'bg-gradient-to-r from-blue-500/30 to-indigo-500/30 text-blue-200 border border-blue-400/40'
                        : 'bg-slate-500/30 text-slate-200 border border-slate-400/40'
                }`}>
                  <Shield className="w-3 h-3" />
                  {isSuperuser ? 'Superusuario' : role ? getRoleDisplayName(role) : ''}
                </span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-300 hover:text-white bg-white/5 hover:bg-red-500/20 rounded-lg transition-all border border-white/10 hover:border-red-400/30"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`}>
        {/* Development Banner */}
        <DevelopmentBanner />

        {/* Top Bar */}
        <div className="sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 flex items-center px-4 md:px-6 justify-between">
          {/* Left Side: Menu + Page Title */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg hover:bg-surface-100 text-slate-600 transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="ml-3 md:ml-4">
              <h2 className="text-lg md:text-xl font-bold font-display text-primary tracking-tight">
                {navigation.find((item) => item.path === location.pathname)?.name ||
                 adminNavigation.find((item) => item.path === location.pathname)?.name ||
                 'Dashboard'}
              </h2>
            </div>
          </div>

          {/* Right Side: Time, User Info, Connection Status, School Selector */}
          <div className="flex items-center gap-2 md:gap-4">
            {/* Date & Time - Hidden on very small screens */}
            <div className="hidden sm:flex items-center gap-2 text-slate-600 bg-surface-50 px-3 py-1.5 rounded-lg">
              <Clock className="w-4 h-4 text-slate-400" />
              <div className="text-sm">
                <span className="font-medium">{formatTime(currentTime)}</span>
                <span className="hidden md:inline text-slate-400 mx-1">•</span>
                <span className="hidden md:inline text-slate-500">{formatDate(currentTime)}</span>
              </div>
            </div>

            {/* User Info - Compact */}
            <div className="hidden md:flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg">
              <div className="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold">
                {user?.username.charAt(0).toUpperCase()}
              </div>
              <div className="text-sm">
                <span className="font-medium text-slate-700">{user?.full_name || user?.username}</span>
                {isSuperuser && (
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full">
                    Super
                  </span>
                )}
              </div>
            </div>

            {/* Connection Status */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${
                isOnline
                  ? 'bg-green-50 text-green-700'
                  : 'bg-red-50 text-red-700 animate-pulse'
              }`}
              title={isOnline ? 'Conectado al servidor' : 'Sin conexión al servidor'}
            >
              {isOnline ? (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Conectado</span>
                </>
              ) : (
                <>
                  <WifiOff className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sin conexión</span>
                </>
              )}
            </div>

            {/* School Selector - Now labeled as "Vista de colegio" */}
            <div className="relative">
              <button
                onClick={() => setSchoolDropdownOpen(!schoolDropdownOpen)}
                className="flex items-center gap-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors"
                title="Colegio para crear nuevos registros"
              >
                <Building2 className="w-4 h-4 text-brand-600" />
                <span className="text-sm font-medium text-gray-700 max-w-[120px] md:max-w-[180px] truncate">
                  {currentSchool?.name || 'Sin colegio'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${schoolDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown */}
              {schoolDropdownOpen && availableSchools.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setSchoolDropdownOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {/* Header explaining the dropdown */}
                    <div className="px-4 py-2 border-b border-gray-100 bg-gray-50">
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                        Colegio predeterminado
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        Para crear ventas, encargos y productos nuevos
                      </p>
                    </div>
                    {availableSchools.map((school) => (
                      <button
                        key={school.id}
                        onClick={() => {
                          selectSchool(school);
                          setSchoolDropdownOpen(false);
                        }}
                        className={`w-full text-left px-4 py-2.5 text-sm hover:bg-surface-100 transition-colors ${
                          currentSchool?.id === school.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{school.name}</div>
                            <div className="text-xs text-gray-500">{school.code}</div>
                          </div>
                          {currentSchool?.id === school.id && (
                            <span className="text-brand-600 text-xs">✓ Activo</span>
                          )}
                        </div>
                      </button>
                    ))}
                    {availableSchools.length > 1 && (
                      <div className="px-4 py-2 border-t border-gray-100 bg-blue-50">
                        <p className="text-xs text-blue-600">
                          💡 Tip: En cada página puedes filtrar para ver datos de todos los colegios
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Page Content */}
        <main className="p-6 max-w-7xl mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
