import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Layout Component - Main app layout with sidebar and navigation
 */
import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';
import { useUserRole, getRoleDisplayName, getRoleBadgeColor } from '../hooks/useUserRole';
import { DevelopmentBanner } from './EnvironmentIndicator';
import { LayoutDashboard, Package, Users, ShoppingCart, FileText, RefreshCw, Settings, LogOut, Menu, X, BarChart3, Building2, ChevronDown, Shield, Calculator, ShieldCheck, Clock, Wifi, WifiOff, Globe, MessageSquare, Wallet } from 'lucide-react';
import { useConfigStore } from '../stores/configStore';
const navigation = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Productos', path: '/products', icon: Package },
    { name: 'Clientes', path: '/clients', icon: Users },
    { name: 'Ventas', path: '/sales', icon: ShoppingCart },
    { name: 'Cambios/Devoluciones', path: '/sale-changes', icon: RefreshCw },
    { name: 'Encargos', path: '/orders', icon: FileText },
    { name: 'Pedidos Web', path: '/web-orders', icon: Globe },
    { name: 'PQRS', path: '/contacts', icon: MessageSquare },
    { name: 'Cuentas de Pago', path: '/payment-accounts', icon: Wallet },
    { name: 'Contabilidad', path: '/accounting', icon: Calculator, requiresAccounting: true },
    { name: 'Reportes', path: '/reports', icon: BarChart3, requiresAccounting: true },
    { name: 'Configuración', path: '/settings', icon: Settings },
];
// Admin navigation (superuser only)
const adminNavigation = [
    { name: 'Panel Admin', path: '/admin', icon: ShieldCheck },
];
export default function Layout({ children }) {
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
    const formatTime = (date) => {
        return date.toLocaleTimeString('es-CO', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };
    // Format date
    const formatDate = (date) => {
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
    return (_jsxs("div", { className: "min-h-screen bg-surface-50 font-sans text-primary", children: [_jsxs("div", { className: `fixed inset-y-0 left-0 z-50 w-64 bg-primary text-white transform transition-transform duration-300 ease-in-out shadow-2xl ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`, children: [_jsxs("div", { className: "flex items-center justify-between h-16 px-6 bg-primary-light border-b border-white/5", children: [_jsx("h1", { className: "text-xl font-bold font-display tracking-tight text-white", children: "Uniformes" }), _jsx("button", { onClick: () => setSidebarOpen(false), className: "lg:hidden p-2 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("nav", { className: "mt-6 px-3 space-y-1", children: [navigation
                                .filter((item) => !item.requiresAccounting || canAccessAccounting)
                                .map((item) => {
                                const Icon = item.icon;
                                const isActive = location.pathname === item.path;
                                return (_jsxs("button", { onClick: () => navigate(item.path), className: `w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                        ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20 font-medium'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'}`, children: [_jsx(Icon, { className: `w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-slate-500 group-hover:text-white'}` }), _jsx("span", { className: "font-medium", children: item.name })] }, item.path));
                            }), isSuperuser && (_jsxs(_Fragment, { children: [_jsx("div", { className: "border-t border-white/10 my-3" }), adminNavigation.map((item) => {
                                        const Icon = item.icon;
                                        const isActive = location.pathname === item.path;
                                        return (_jsxs("button", { onClick: () => navigate(item.path), className: `w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 group ${isActive
                                                ? 'bg-amber-600 text-white shadow-lg shadow-amber-900/20 font-medium'
                                                : 'text-amber-300 hover:bg-amber-500/10 hover:text-amber-200'}`, children: [_jsx(Icon, { className: `w-5 h-5 mr-3 transition-colors ${isActive ? 'text-white' : 'text-amber-400 group-hover:text-amber-200'}` }), _jsx("span", { className: "font-medium", children: item.name })] }, item.path));
                                    })] }))] }), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 p-4 bg-primary-light border-t border-white/5", children: [_jsxs("div", { className: "flex items-center mb-3", children: [_jsx("div", { className: "w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white shadow-lg ring-2 ring-brand-500/30", children: _jsx("span", { className: "text-sm font-bold font-display", children: user?.username.charAt(0).toUpperCase() }) }), _jsxs("div", { className: "ml-3 flex-1 overflow-hidden", children: [_jsx("p", { className: "text-sm font-semibold text-white truncate font-display", children: user?.username }), _jsx("p", { className: "text-xs text-slate-400 truncate", children: user?.email })] })] }), (role || isSuperuser) && (_jsx("div", { className: "mb-3 flex items-center justify-center", children: _jsxs("span", { className: `inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${isSuperuser
                                        ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30'
                                        : role ? getRoleBadgeColor(role).replace('text-', 'text-').replace('bg-', 'bg-opacity-20 bg-') : ''}`, children: [_jsx(Shield, { className: "w-3 h-3" }), isSuperuser ? 'Superusuario' : role ? getRoleDisplayName(role) : ''] }) })), _jsxs("button", { onClick: handleLogout, className: "w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-200 bg-red-500/10 hover:bg-red-500/20 hover:text-red-100 rounded-lg transition-colors border border-red-500/20", children: [_jsx(LogOut, { className: "w-4 h-4 mr-2" }), "Cerrar Sesi\u00F3n"] })] })] }), _jsxs("div", { className: `transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : ''}`, children: [_jsx(DevelopmentBanner, {}), _jsxs("div", { className: "sticky top-0 z-40 h-16 bg-white/80 backdrop-blur-md border-b border-surface-200 flex items-center px-4 md:px-6 justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("button", { onClick: () => setSidebarOpen(!sidebarOpen), className: "p-2 rounded-lg hover:bg-surface-100 text-slate-600 transition-colors", children: _jsx(Menu, { className: "w-6 h-6" }) }), _jsx("div", { className: "ml-3 md:ml-4", children: _jsx("h2", { className: "text-lg md:text-xl font-bold font-display text-primary tracking-tight", children: navigation.find((item) => item.path === location.pathname)?.name ||
                                                adminNavigation.find((item) => item.path === location.pathname)?.name ||
                                                'Dashboard' }) })] }), _jsxs("div", { className: "flex items-center gap-2 md:gap-4", children: [_jsxs("div", { className: "hidden sm:flex items-center gap-2 text-slate-600 bg-surface-50 px-3 py-1.5 rounded-lg", children: [_jsx(Clock, { className: "w-4 h-4 text-slate-400" }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "font-medium", children: formatTime(currentTime) }), _jsx("span", { className: "hidden md:inline text-slate-400 mx-1", children: "\u2022" }), _jsx("span", { className: "hidden md:inline text-slate-500", children: formatDate(currentTime) })] })] }), _jsxs("div", { className: "hidden md:flex items-center gap-2 bg-surface-50 px-3 py-1.5 rounded-lg", children: [_jsx("div", { className: "w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-white text-xs font-bold", children: user?.username.charAt(0).toUpperCase() }), _jsxs("div", { className: "text-sm", children: [_jsx("span", { className: "font-medium text-slate-700", children: user?.full_name || user?.username }), isSuperuser && (_jsx("span", { className: "ml-1.5 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700 rounded-full", children: "Super" }))] })] }), _jsx("div", { className: `flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${isOnline
                                            ? 'bg-green-50 text-green-700'
                                            : 'bg-red-50 text-red-700 animate-pulse'}`, title: isOnline ? 'Conectado al servidor' : 'Sin conexión al servidor', children: isOnline ? (_jsxs(_Fragment, { children: [_jsx(Wifi, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "hidden sm:inline", children: "Conectado" })] })) : (_jsxs(_Fragment, { children: [_jsx(WifiOff, { className: "w-3.5 h-3.5" }), _jsx("span", { className: "hidden sm:inline", children: "Sin conexi\u00F3n" })] })) }), _jsxs("div", { className: "relative", children: [_jsxs("button", { onClick: () => setSchoolDropdownOpen(!schoolDropdownOpen), className: "flex items-center gap-2 px-3 py-2 bg-surface-100 hover:bg-surface-200 rounded-lg transition-colors", title: "Colegio para crear nuevos registros", children: [_jsx(Building2, { className: "w-4 h-4 text-brand-600" }), _jsx("span", { className: "text-sm font-medium text-gray-700 max-w-[120px] md:max-w-[180px] truncate", children: currentSchool?.name || 'Sin colegio' }), _jsx(ChevronDown, { className: `w-4 h-4 text-gray-500 transition-transform ${schoolDropdownOpen ? 'rotate-180' : ''}` })] }), schoolDropdownOpen && availableSchools.length > 0 && (_jsxs(_Fragment, { children: [_jsx("div", { className: "fixed inset-0 z-10", onClick: () => setSchoolDropdownOpen(false) }), _jsxs("div", { className: "absolute right-0 mt-2 w-72 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20", children: [_jsxs("div", { className: "px-4 py-2 border-b border-gray-100 bg-gray-50", children: [_jsx("p", { className: "text-xs font-medium text-gray-500 uppercase tracking-wide", children: "Colegio predeterminado" }), _jsx("p", { className: "text-xs text-gray-400 mt-0.5", children: "Para crear ventas, encargos y productos nuevos" })] }), availableSchools.map((school) => (_jsx("button", { onClick: () => {
                                                                    selectSchool(school);
                                                                    setSchoolDropdownOpen(false);
                                                                }, className: `w-full text-left px-4 py-2.5 text-sm hover:bg-surface-100 transition-colors ${currentSchool?.id === school.id ? 'bg-brand-50 text-brand-700 font-medium' : 'text-gray-700'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("div", { className: "font-medium", children: school.name }), _jsx("div", { className: "text-xs text-gray-500", children: school.code })] }), currentSchool?.id === school.id && (_jsx("span", { className: "text-brand-600 text-xs", children: "\u2713 Activo" }))] }) }, school.id))), availableSchools.length > 1 && (_jsx("div", { className: "px-4 py-2 border-t border-gray-100 bg-blue-50", children: _jsx("p", { className: "text-xs text-blue-600", children: "\uD83D\uDCA1 Tip: En cada p\u00E1gina puedes filtrar para ver datos de todos los colegios" }) }))] })] }))] })] })] }), _jsx("main", { className: "p-6 max-w-7xl mx-auto", children: children })] })] }));
}
