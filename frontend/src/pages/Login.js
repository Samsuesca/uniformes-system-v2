import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Login Page - User authentication screen
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { ENVIRONMENTS, ENVIRONMENT_LABELS } from '../config/environments';
import { LogIn, AlertCircle, Settings, Loader2, Wifi, WifiOff } from 'lucide-react';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
export default function Login() {
    const navigate = useNavigate();
    const { login, isLoading, error, clearError } = useAuthStore();
    const { apiUrl, setApiUrl } = useConfigStore();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showServerConfig, setShowServerConfig] = useState(false);
    const [selectedServer, setSelectedServer] = useState(apiUrl);
    const [testingServer, setTestingServer] = useState(null);
    const [serverStatus, setServerStatus] = useState({});
    const [debugError, setDebugError] = useState(null);
    const selectServer = async (url) => {
        setSelectedServer(url);
        setTestingServer(url);
        setServerStatus(prev => ({ ...prev, [url]: 'testing' }));
        setDebugError(null);
        try {
            // Use Tauri's HTTP plugin for cross-origin requests
            const response = await tauriFetch(`${url}/health`, {
                method: 'GET',
                connectTimeout: 5000
            });
            if (response.ok) {
                setServerStatus(prev => ({ ...prev, [url]: 'success' }));
                setApiUrl(url);
            }
            else {
                setServerStatus(prev => ({ ...prev, [url]: 'error' }));
                setDebugError(`HTTP ${response.status}: ${response.statusText}`);
            }
        }
        catch (err) {
            setServerStatus(prev => ({ ...prev, [url]: 'error' }));
            const errorMsg = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
            setDebugError(errorMsg);
        }
        setTestingServer(null);
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        clearError();
        try {
            await login({ username, password });
            navigate('/dashboard');
        }
        catch (err) {
            // Error is already set in store
            console.error('Login failed:', err);
        }
    };
    return (_jsx("div", { className: "min-h-screen bg-surface-50 flex items-center justify-center p-4", children: _jsxs("div", { className: "bg-white rounded-2xl shadow-xl border border-surface-200 w-full max-w-md p-8 relative overflow-hidden", children: [_jsx("div", { className: "absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-brand-600 to-brand-400" }), _jsxs("div", { className: "text-center mb-8", children: [_jsx("div", { className: "inline-flex items-center justify-center w-16 h-16 bg-brand-50 rounded-2xl mb-4 shadow-inner", children: _jsx(LogIn, { className: "w-8 h-8 text-brand-600" }) }), _jsx("h1", { className: "text-3xl font-bold font-display text-primary tracking-tight", children: "Uniformes System" }), _jsx("p", { className: "text-slate-500 mt-2 font-medium", children: "Inicia sesi\u00F3n para continuar" })] }), error && (_jsxs("div", { className: "mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" }), _jsx("div", { className: "flex-1", children: _jsx("p", { className: "text-sm text-red-800 font-medium", children: error }) })] })), _jsxs("form", { onSubmit: handleSubmit, className: "space-y-6", children: [_jsxs("div", { children: [_jsx("label", { htmlFor: "username", className: "block text-sm font-semibold text-slate-700 mb-2", children: "Usuario o Email" }), _jsx("input", { id: "username", type: "text", value: username, onChange: (e) => setUsername(e.target.value), required: true, className: "w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-200 bg-surface-50 focus:bg-white text-slate-800 placeholder-slate-400", placeholder: "admin", disabled: isLoading })] }), _jsxs("div", { children: [_jsx("label", { htmlFor: "password", className: "block text-sm font-semibold text-slate-700 mb-2", children: "Contrase\u00F1a" }), _jsx("input", { id: "password", type: "password", value: password, onChange: (e) => setPassword(e.target.value), required: true, className: "w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all duration-200 bg-surface-50 focus:bg-white text-slate-800 placeholder-slate-400", placeholder: "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022", disabled: isLoading })] }), _jsx("button", { type: "submit", disabled: isLoading, className: "w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-brand-600/20 hover:shadow-brand-600/40 hover:-translate-y-0.5", children: isLoading ? (_jsxs(_Fragment, { children: [_jsxs("svg", { className: "animate-spin -ml-1 mr-3 h-5 w-5 text-white", xmlns: "http://www.w3.org/2000/svg", fill: "none", viewBox: "0 0 24 24", children: [_jsx("circle", { className: "opacity-25", cx: "12", cy: "12", r: "10", stroke: "currentColor", strokeWidth: "4" }), _jsx("path", { className: "opacity-75", fill: "currentColor", d: "M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" })] }), "Iniciando sesi\u00F3n..."] })) : (_jsxs(_Fragment, { children: [_jsx(LogIn, { className: "w-5 h-5 mr-2" }), "Iniciar Sesi\u00F3n"] })) })] }), _jsxs("div", { className: "mt-6 pt-6 border-t border-slate-100", children: [_jsxs("button", { type: "button", onClick: () => setShowServerConfig(!showServerConfig), className: "w-full flex items-center justify-center text-sm text-slate-500 hover:text-slate-700 transition-colors", children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), "Configurar Servidor"] }), showServerConfig && (_jsxs("div", { className: "mt-4 p-4 bg-slate-50 rounded-xl space-y-2", children: [_jsx("p", { className: "text-xs text-slate-500 mb-3", children: "Selecciona el servidor:" }), Object.keys(ENVIRONMENTS).map((key) => {
                                    const url = ENVIRONMENTS[key];
                                    const isSelected = apiUrl === url;
                                    const status = serverStatus[url];
                                    const isTesting = testingServer === url;
                                    return (_jsxs("button", { type: "button", onClick: () => selectServer(url), disabled: isTesting, className: `w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${isSelected
                                            ? 'border-brand-500 bg-brand-50'
                                            : 'border-slate-200 bg-white hover:border-slate-300'}`, children: [_jsxs("div", { className: "text-left", children: [_jsx("span", { className: `text-sm font-medium ${isSelected ? 'text-brand-700' : 'text-slate-700'}`, children: ENVIRONMENT_LABELS[key] }), _jsx("p", { className: "text-xs text-slate-400 font-mono", children: url })] }), _jsx("div", { className: "flex items-center", children: isTesting ? (_jsx(Loader2, { className: "w-5 h-5 text-brand-500 animate-spin" })) : status === 'success' ? (_jsx(Wifi, { className: "w-5 h-5 text-green-500" })) : status === 'error' ? (_jsx(WifiOff, { className: "w-5 h-5 text-red-500" })) : isSelected ? (_jsx("div", { className: "w-3 h-3 rounded-full bg-brand-500" })) : null })] }, key));
                                }), serverStatus[apiUrl] === 'success' && (_jsx("p", { className: "text-xs text-green-600 mt-2 text-center", children: "\u2713 Conectado al servidor" })), serverStatus[selectedServer] === 'error' && (_jsxs("div", { className: "mt-2 p-2 bg-red-50 rounded-lg", children: [_jsx("p", { className: "text-xs text-red-600 text-center", children: "\u2717 No se pudo conectar al servidor" }), debugError && (_jsx("p", { className: "text-xs text-red-500 font-mono mt-1 break-all text-center", children: debugError }))] }))] }))] }), _jsx("div", { className: "mt-6 text-center", children: _jsx("p", { className: "text-xs text-slate-400 font-medium", children: "Sistema de Gesti\u00F3n de Uniformes v2.0" }) })] }) }));
}
