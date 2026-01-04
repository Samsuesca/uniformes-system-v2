import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Payment Accounts Management Page
 *
 * Admin page to configure payment methods (bank accounts, Nequi, QR codes)
 * that will be displayed to customers in the web portal.
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import PaymentAccountModal from '../components/PaymentAccountModal';
import { CreditCard, Plus, Edit, Trash2, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Building2, Smartphone, QrCode } from 'lucide-react';
import { paymentAccountService } from '../services/paymentAccountService';
const METHOD_TYPE_LABELS = {
    nequi: 'Nequi',
    bank_account: 'Cuenta Bancaria',
    daviplata: 'Daviplata',
    other: 'Otro'
};
const METHOD_TYPE_ICONS = {
    nequi: Smartphone,
    bank_account: Building2,
    daviplata: Smartphone,
    other: CreditCard
};
export default function PaymentAccounts() {
    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState(null);
    useEffect(() => {
        loadAccounts();
    }, []);
    const loadAccounts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await paymentAccountService.getAll();
            // Sort by display_order
            setAccounts(data.sort((a, b) => a.display_order - b.display_order));
        }
        catch (err) {
            console.error('Error loading payment accounts:', err);
            setError(err.response?.data?.detail || 'Error al cargar cuentas de pago');
        }
        finally {
            setLoading(false);
        }
    };
    const handleCreate = () => {
        setEditingAccount(null);
        setIsModalOpen(true);
    };
    const handleEdit = (account) => {
        setEditingAccount(account);
        setIsModalOpen(true);
    };
    const handleDelete = async (account) => {
        if (!confirm(`¿Eliminar la cuenta "${account.account_name}"?`)) {
            return;
        }
        try {
            await paymentAccountService.delete(account.id);
            setSuccess('Cuenta eliminada correctamente');
            loadAccounts();
            setTimeout(() => setSuccess(null), 3000);
        }
        catch (err) {
            console.error('Error deleting account:', err);
            setError(err.response?.data?.detail || 'Error al eliminar cuenta');
            setTimeout(() => setError(null), 5000);
        }
    };
    const handleToggleActive = async (account) => {
        try {
            await paymentAccountService.update(account.id, {
                is_active: !account.is_active
            });
            setSuccess(account.is_active ? 'Cuenta desactivada' : 'Cuenta activada');
            loadAccounts();
            setTimeout(() => setSuccess(null), 3000);
        }
        catch (err) {
            console.error('Error toggling account:', err);
            setError(err.response?.data?.detail || 'Error al actualizar cuenta');
            setTimeout(() => setError(null), 5000);
        }
    };
    const handleModalClose = () => {
        setIsModalOpen(false);
        setEditingAccount(null);
    };
    const handleModalSuccess = () => {
        setSuccess(editingAccount ? 'Cuenta actualizada' : 'Cuenta creada correctamente');
        loadAccounts();
        handleModalClose();
        setTimeout(() => setSuccess(null), 3000);
    };
    const Icon = (methodType) => METHOD_TYPE_ICONS[methodType] || CreditCard;
    return (_jsx(Layout, { children: _jsxs("div", { className: "p-6", children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-bold text-gray-900 flex items-center gap-2", children: [_jsx(CreditCard, { className: "w-8 h-8 text-green-600" }), "Cuentas de Pago"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Configura las cuentas bancarias y m\u00E9todos de pago para el portal web" })] }), _jsxs("button", { onClick: handleCreate, className: "flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition", children: [_jsx(Plus, { className: "w-5 h-5" }), "Nueva Cuenta"] })] }), success && (_jsxs("div", { className: "mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-5 h-5" }), success] })), error && (_jsxs("div", { className: "mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5" }), error] })), loading && (_jsx("div", { className: "flex justify-center items-center py-12", children: _jsx(Loader2, { className: "w-8 h-8 text-green-600 animate-spin" }) })), !loading && accounts.length === 0 && (_jsxs("div", { className: "text-center py-12 bg-white rounded-lg border border-gray-200", children: [_jsx(CreditCard, { className: "w-16 h-16 mx-auto text-gray-300 mb-4" }), _jsx("p", { className: "text-gray-500 text-lg", children: "No hay cuentas de pago configuradas" }), _jsx("p", { className: "text-gray-400 text-sm mt-2", children: "Crea tu primera cuenta para que los clientes puedan realizar pagos" })] })), !loading && accounts.length > 0 && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: accounts.map((account) => {
                        const MethodIcon = Icon(account.method_type);
                        return (_jsxs("div", { className: `bg-white rounded-lg border-2 p-6 transition ${account.is_active
                                ? 'border-green-200 hover:border-green-300'
                                : 'border-gray-200 opacity-60'}`, children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: `p-3 rounded-lg ${account.is_active ? 'bg-green-100' : 'bg-gray-100'}`, children: _jsx(MethodIcon, { className: `w-6 h-6 ${account.is_active ? 'text-green-600' : 'text-gray-400'}` }) }), _jsxs("div", { children: [_jsx("h3", { className: "font-semibold text-gray-900", children: account.account_name }), _jsx("p", { className: "text-sm text-gray-500", children: METHOD_TYPE_LABELS[account.method_type] })] })] }), _jsx("div", { className: "flex items-center gap-1", children: _jsx("span", { className: `text-xs font-medium px-2 py-1 rounded ${account.is_active
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-600'}`, children: account.is_active ? 'Activa' : 'Inactiva' }) })] }), _jsxs("div", { className: "space-y-2 mb-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "Titular" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: account.account_holder })] }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "N\u00FAmero de Cuenta" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: account.account_number })] }), account.bank_name && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "Banco" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: account.bank_name })] })), account.account_type && (_jsxs("div", { children: [_jsx("p", { className: "text-xs text-gray-500", children: "Tipo" }), _jsx("p", { className: "text-sm font-medium text-gray-900", children: account.account_type })] })), account.qr_code_url && (_jsxs("div", { className: "flex items-center gap-2 text-sm text-blue-600", children: [_jsx(QrCode, { className: "w-4 h-4" }), _jsx("span", { children: "C\u00F3digo QR configurado" })] }))] }), _jsxs("div", { className: "flex items-center gap-2 pt-4 border-t border-gray-100", children: [_jsx("button", { onClick: () => handleToggleActive(account), className: "flex-1 flex items-center justify-center gap-1 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition", children: account.is_active ? (_jsxs(_Fragment, { children: [_jsx(EyeOff, { className: "w-4 h-4" }), "Desactivar"] })) : (_jsxs(_Fragment, { children: [_jsx(Eye, { className: "w-4 h-4" }), "Activar"] })) }), _jsxs("button", { onClick: () => handleEdit(account), className: "flex items-center justify-center gap-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition", children: [_jsx(Edit, { className: "w-4 h-4" }), "Editar"] }), _jsx("button", { onClick: () => handleDelete(account), className: "flex items-center justify-center p-2 text-sm text-red-600 border border-red-300 rounded-md hover:bg-red-50 transition", children: _jsx(Trash2, { className: "w-4 h-4" }) })] }), _jsx("div", { className: "mt-3 text-center", children: _jsxs("span", { className: "text-xs text-gray-400", children: ["Orden de visualizaci\u00F3n: ", account.display_order] }) })] }, account.id));
                    }) })), isModalOpen && (_jsx(PaymentAccountModal, { isOpen: isModalOpen, onClose: handleModalClose, onSuccess: handleModalSuccess, account: editingAccount }))] }) }));
}
