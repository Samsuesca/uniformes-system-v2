import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * App Component - Main application with routing
 */
import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Clients from './pages/Clients';
import Sales from './pages/Sales';
import SaleDetail from './pages/SaleDetail';
import SaleChanges from './pages/SaleChanges';
import Orders from './pages/Orders';
import OrderDetail from './pages/OrderDetail';
import WebOrders from './pages/WebOrders';
import Accounting from './pages/Accounting';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import ContactsManagement from './pages/ContactsManagement';
import PaymentAccounts from './pages/PaymentAccounts';
// Protected Route component
function ProtectedRoute({ children }) {
    const { isAuthenticated } = useAuthStore();
    if (!isAuthenticated) {
        return _jsx(Navigate, { to: "/login", replace: true });
    }
    return _jsx(_Fragment, { children: children });
}
function App() {
    const { token, isAuthenticated, getCurrentUser, logout } = useAuthStore();
    const [isValidating, setIsValidating] = useState(true);
    // Validate token on app startup
    useEffect(() => {
        const validateSession = async () => {
            // If there's a token, validate it with the server
            if (token && isAuthenticated) {
                try {
                    await getCurrentUser();
                }
                catch {
                    // Token invalid or expired, force logout
                    logout();
                }
            }
            else if (!token || !isAuthenticated) {
                // No valid session, ensure clean state
                logout();
            }
            setIsValidating(false);
        };
        validateSession();
    }, []);
    // Show loading while validating
    if (isValidating) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center bg-surface-50", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "w-8 h-8 border-4 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" }), _jsx("p", { className: "text-gray-600", children: "Verificando sesi\u00F3n..." })] }) }));
    }
    return (_jsx(BrowserRouter, { children: _jsxs(Routes, { children: [_jsx(Route, { path: "/login", element: _jsx(Login, {}) }), _jsx(Route, { path: "/dashboard", element: _jsx(ProtectedRoute, { children: _jsx(Dashboard, {}) }) }), _jsx(Route, { path: "/products", element: _jsx(ProtectedRoute, { children: _jsx(Products, {}) }) }), _jsx(Route, { path: "/clients", element: _jsx(ProtectedRoute, { children: _jsx(Clients, {}) }) }), _jsx(Route, { path: "/sales", element: _jsx(ProtectedRoute, { children: _jsx(Sales, {}) }) }), _jsx(Route, { path: "/sales/:saleId", element: _jsx(ProtectedRoute, { children: _jsx(SaleDetail, {}) }) }), _jsx(Route, { path: "/sale-changes", element: _jsx(ProtectedRoute, { children: _jsx(SaleChanges, {}) }) }), _jsx(Route, { path: "/orders", element: _jsx(ProtectedRoute, { children: _jsx(Orders, {}) }) }), _jsx(Route, { path: "/orders/:orderId", element: _jsx(ProtectedRoute, { children: _jsx(OrderDetail, {}) }) }), _jsx(Route, { path: "/web-orders", element: _jsx(ProtectedRoute, { children: _jsx(WebOrders, {}) }) }), _jsx(Route, { path: "/accounting", element: _jsx(ProtectedRoute, { children: _jsx(Accounting, {}) }) }), _jsx(Route, { path: "/reports", element: _jsx(ProtectedRoute, { children: _jsx(Reports, {}) }) }), _jsx(Route, { path: "/settings", element: _jsx(ProtectedRoute, { children: _jsx(Settings, {}) }) }), _jsx(Route, { path: "/admin", element: _jsx(ProtectedRoute, { children: _jsx(Admin, {}) }) }), _jsx(Route, { path: "/contacts", element: _jsx(ProtectedRoute, { children: _jsx(ContactsManagement, {}) }) }), _jsx(Route, { path: "/payment-accounts", element: _jsx(ProtectedRoute, { children: _jsx(PaymentAccounts, {}) }) }), _jsx(Route, { path: "/", element: _jsx(Navigate, { to: "/dashboard", replace: true }) }), _jsx(Route, { path: "*", element: _jsx(Navigate, { to: "/", replace: true }) })] }) }));
}
export default App;
