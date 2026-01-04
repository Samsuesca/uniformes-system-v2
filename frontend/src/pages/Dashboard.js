import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
/**
 * Dashboard Page - Main overview with aggregated statistics from all schools
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';
import { Package, Users, ShoppingCart, FileText, TrendingUp, AlertCircle, Loader2, Building2, ArrowRight, RefreshCw, DollarSign, MessageSquare, Mail } from 'lucide-react';
import Layout from '../components/Layout';
import { dashboardService } from '../services/dashboardService';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import { contactService } from '../services/contactService';
export default function Dashboard() {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const { availableSchools, loadSchools } = useSchoolStore();
    const [stats, setStats] = useState(null);
    const [recentSales, setRecentSales] = useState([]);
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [recentContacts, setRecentContacts] = useState([]);
    const [unreadContactsCount, setUnreadContactsCount] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (availableSchools.length === 0) {
            loadSchools();
        }
    }, [availableSchools.length, loadSchools]);
    useEffect(() => {
        if (availableSchools.length > 0) {
            loadDashboardData();
        }
    }, [availableSchools]);
    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Load aggregated stats from all schools
            const schoolsForStats = availableSchools.map(s => ({
                id: s.id,
                name: s.name,
                code: s.code
            }));
            const [aggregatedStats, salesData, productsData, contactsData] = await Promise.all([
                dashboardService.getAggregatedStats(schoolsForStats),
                saleService.getAllSales({ limit: 5 }).catch(() => []),
                productService.getAllProducts({ with_stock: true, limit: 100 }).catch(() => []),
                contactService.getContacts({ page: 1, page_size: 5, unread_only: false }).catch(() => ({ items: [], total: 0, page: 1, page_size: 5, total_pages: 0 }))
            ]);
            setStats(aggregatedStats);
            setRecentSales(salesData);
            setRecentContacts(contactsData.items);
            // Count unread contacts
            const unreadCount = contactsData.items.filter(c => !c.is_read).length;
            setUnreadContactsCount(unreadCount);
            // Filter low stock products
            const lowStock = productsData.filter(p => {
                const stock = p.inventory_quantity ?? 0;
                const minStock = p.inventory_min_stock ?? 5;
                return stock <= minStock && stock >= 0;
            }).slice(0, 5);
            setLowStockProducts(lowStock);
        }
        catch (err) {
            console.error('Error loading dashboard:', err);
            setError(err.response?.data?.detail || 'Error al cargar el dashboard');
        }
        finally {
            setLoading(false);
        }
    };
    const statCards = [
        {
            title: 'Total Productos',
            value: stats ? stats.totals.total_products.toLocaleString() : '-',
            subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
            icon: Package,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
            link: '/products',
        },
        {
            title: 'Clientes',
            value: stats ? stats.totals.total_clients.toLocaleString() : '-',
            subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
            icon: Users,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
            link: '/clients',
        },
        {
            title: 'Ventas Totales',
            value: stats ? `$${stats.totals.total_sales.toLocaleString()}` : '-',
            subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
            icon: ShoppingCart,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
            link: '/sales',
        },
        {
            title: 'Encargos',
            value: stats ? stats.totals.total_orders.toLocaleString() : '-',
            subtitle: stats && stats.school_count > 1 ? `en ${stats.school_count} colegios` : undefined,
            icon: FileText,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
            link: '/orders',
        },
    ];
    const getTimeAgo = (dateString) => {
        if (!dateString)
            return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 60)
            return `Hace ${diffMins}m`;
        if (diffHours < 24)
            return `Hace ${diffHours}h`;
        return `Hace ${diffDays}d`;
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-8 flex flex-col md:flex-row md:items-center md:justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-2xl md:text-3xl font-bold font-display text-primary tracking-tight", children: ["\u00A1Bienvenido, ", user?.full_name || user?.username, "!"] }), _jsx("p", { className: "text-slate-500 mt-1 md:mt-2 text-base md:text-lg", children: availableSchools.length === 1
                                    ? `Resumen de ${availableSchools[0].name}`
                                    : `Resumen de ${availableSchools.length} colegios` })] }), _jsxs("button", { onClick: loadDashboardData, disabled: loading, className: "mt-4 md:mt-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50", children: [_jsx(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }), "Actualizar"] })] }), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-xl p-6 mb-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar el dashboard" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadDashboardData, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline font-medium", children: "Reintentar" })] })] }) })), _jsx("div", { className: "grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8", children: loading ? (_jsxs("div", { className: "col-span-full flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-brand-600" }), _jsx("span", { className: "ml-3 text-slate-600 font-medium", children: "Cargando estad\u00EDsticas..." })] })) : (statCards.map((stat) => {
                    const Icon = stat.icon;
                    return (_jsxs("div", { onClick: () => stat.link && navigate(stat.link), className: `bg-white rounded-xl shadow-sm border border-surface-200 p-4 md:p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group ${stat.link ? 'cursor-pointer' : ''}`, children: [_jsxs("div", { className: "flex items-center justify-between mb-3 md:mb-4", children: [_jsx("div", { className: `p-2 md:p-3 rounded-xl bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white transition-colors duration-300`, children: _jsx(Icon, { className: "w-5 h-5 md:w-6 md:h-6" }) }), stat.link && (_jsx(ArrowRight, { className: "w-4 h-4 text-slate-300 group-hover:text-brand-600 transition-colors" }))] }), _jsx("h3", { className: "text-xl md:text-3xl font-bold font-display text-primary tracking-tight", children: stat.value }), _jsx("p", { className: "text-xs md:text-sm text-slate-500 mt-1 font-medium", children: stat.title }), stat.subtitle && (_jsx("p", { className: "text-xs text-slate-400 mt-0.5", children: stat.subtitle }))] }, stat.title));
                })) }), !loading && stats && stats.school_count > 1 && (_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-surface-200 p-6 mb-6", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 mb-4 flex items-center", children: [_jsx(Building2, { className: "w-5 h-5 mr-2 text-brand-600" }), "Resumen por Colegio"] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Colegio" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Productos" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Clientes" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Ventas" }), _jsx("th", { className: "px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Encargos" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: stats.by_school.map((school) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsxs("td", { className: "px-4 py-3 whitespace-nowrap", children: [_jsx("div", { className: "font-medium text-gray-900", children: school.school_name }), _jsx("div", { className: "text-xs text-gray-500", children: school.school_code })] }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900", children: school.total_products.toLocaleString() }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900", children: school.total_clients.toLocaleString() }), _jsxs("td", { className: "px-4 py-3 whitespace-nowrap text-right text-sm font-medium text-green-600", children: ["$", school.total_sales.toLocaleString()] }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap text-right text-sm text-gray-900", children: school.total_orders.toLocaleString() })] }, school.school_id))) })] }) })] })), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-surface-200 p-6 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(TrendingUp, { className: "w-5 h-5 mr-2 text-green-600" }), "Ventas Recientes"] }), _jsxs("button", { onClick: () => navigate('/sales'), className: "text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1", children: ["Ver todas", _jsx(ArrowRight, { className: "w-4 h-4" })] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "w-6 h-6 animate-spin text-slate-400" }) })) : recentSales.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-slate-500", children: [_jsx(ShoppingCart, { className: "w-10 h-10 mx-auto mb-2 text-slate-300" }), _jsx("p", { children: "No hay ventas recientes" })] })) : (_jsx("div", { className: "space-y-3", children: recentSales.map((sale) => (_jsxs("div", { onClick: () => navigate(`/sales/${sale.id}`), className: "flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-gray-800", children: sale.code }), sale.school_name && availableSchools.length > 1 && (_jsx("span", { className: "text-xs bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded", children: sale.school_name }))] }), _jsx("p", { className: "text-sm text-gray-500 truncate", children: sale.client_name || 'Venta directa' })] }), _jsxs("div", { className: "text-right flex-shrink-0 ml-4", children: [_jsxs("p", { className: "font-semibold text-gray-800 flex items-center justify-end", children: [_jsx(DollarSign, { className: "w-4 h-4 text-green-500" }), Number(sale.total).toLocaleString()] }), _jsx("p", { className: "text-xs text-gray-400", children: getTimeAgo(sale.sale_date) })] })] }, sale.id))) }))] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-surface-200 p-6 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(AlertCircle, { className: "w-5 h-5 mr-2 text-orange-600" }), "Alertas de Stock Bajo"] }), _jsxs("button", { onClick: () => navigate('/products'), className: "text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1", children: ["Ver productos", _jsx(ArrowRight, { className: "w-4 h-4" })] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "w-6 h-6 animate-spin text-slate-400" }) })) : lowStockProducts.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-slate-500", children: [_jsx(Package, { className: "w-10 h-10 mx-auto mb-2 text-slate-300" }), _jsx("p", { children: "No hay alertas de stock bajo" }), _jsx("p", { className: "text-xs text-slate-400 mt-1", children: "\u00A1Todo en orden!" })] })) : (_jsx("div", { className: "space-y-3", children: lowStockProducts.map((product) => {
                                    const stock = product.inventory_quantity ?? 0;
                                    const isOutOfStock = stock === 0;
                                    return (_jsxs("div", { onClick: () => navigate('/products'), className: "flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "font-medium text-gray-800 truncate", children: product.name || product.code }) }), _jsxs("p", { className: "text-sm text-gray-500", children: [product.code, " \u2022 Talla ", product.size] })] }), _jsx("div", { className: "flex-shrink-0 ml-4", children: _jsx("span", { className: `inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${isOutOfStock
                                                        ? 'bg-red-100 text-red-800'
                                                        : 'bg-orange-100 text-orange-800'}`, children: isOutOfStock ? 'Sin stock' : `${stock} uds` }) })] }, product.id));
                                }) }))] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-surface-200 p-6 overflow-hidden", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(MessageSquare, { className: "w-5 h-5 mr-2 text-blue-600" }), "Mensajes PQRS"] }), _jsxs("button", { onClick: () => navigate('/contacts'), className: "text-sm text-brand-600 hover:text-brand-700 font-medium flex items-center gap-1", children: ["Ver todos", _jsx(ArrowRight, { className: "w-4 h-4" })] })] }), loading ? (_jsx("div", { className: "flex items-center justify-center py-8", children: _jsx(Loader2, { className: "w-6 h-6 animate-spin text-slate-400" }) })) : recentContacts.length === 0 ? (_jsxs("div", { className: "text-center py-8 text-slate-500", children: [_jsx(MessageSquare, { className: "w-10 h-10 mx-auto mb-2 text-slate-300" }), _jsx("p", { children: "No hay mensajes PQRS" })] })) : (_jsx("div", { className: "space-y-3", children: recentContacts.map((contact) => (_jsxs("div", { onClick: () => navigate('/contacts'), className: "flex items-center justify-between py-3 px-3 -mx-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-gray-800 truncate", children: contact.name }), !contact.is_read && (_jsx("span", { className: "flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full" }))] }), _jsx("p", { className: "text-sm text-gray-500 truncate", children: contact.subject })] }), _jsx("div", { className: "flex-shrink-0 ml-4", children: contact.is_read ? (_jsx("span", { className: "text-xs text-gray-400", children: "Le\u00EDdo" })) : (_jsx(Mail, { className: "w-4 h-4 text-blue-600" })) })] }, contact.id))) })), unreadContactsCount > 0 && (_jsx("div", { className: "mt-4 pt-4 border-t border-gray-200", children: _jsxs("div", { className: "flex items-center justify-center gap-2 text-sm text-blue-600", children: [_jsx(Mail, { className: "w-4 h-4" }), _jsxs("span", { className: "font-medium", children: [unreadContactsCount, " mensaje", unreadContactsCount !== 1 ? 's' : '', " sin leer"] })] }) }))] })] }), _jsxs("div", { className: "mt-6 grid grid-cols-2 md:grid-cols-4 gap-4", children: [_jsxs("button", { onClick: () => navigate('/sales'), className: "flex items-center justify-center gap-2 p-4 bg-green-50 hover:bg-green-100 border border-green-200 rounded-xl text-green-700 font-medium transition-colors", children: [_jsx(ShoppingCart, { className: "w-5 h-5" }), _jsx("span", { children: "Nueva Venta" })] }), _jsxs("button", { onClick: () => navigate('/orders'), className: "flex items-center justify-center gap-2 p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-blue-700 font-medium transition-colors", children: [_jsx(FileText, { className: "w-5 h-5" }), _jsx("span", { children: "Nuevo Encargo" })] }), _jsxs("button", { onClick: () => navigate('/products'), className: "flex items-center justify-center gap-2 p-4 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-xl text-purple-700 font-medium transition-colors", children: [_jsx(Package, { className: "w-5 h-5" }), _jsx("span", { children: "Ver Productos" })] }), _jsxs("button", { onClick: () => navigate('/clients'), className: "flex items-center justify-center gap-2 p-4 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-xl text-orange-700 font-medium transition-colors", children: [_jsx(Users, { className: "w-5 h-5" }), _jsx("span", { children: "Ver Clientes" })] })] })] }));
}
