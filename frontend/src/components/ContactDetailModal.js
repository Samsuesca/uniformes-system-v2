import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Contact Detail Modal - View and respond to PQRS messages
 *
 * Allows admin to:
 * - View full contact message details
 * - Change status (pending → in_review → resolved → closed)
 * - Write and send response
 * - Mark as read/unread
 */
import { useState, useEffect } from 'react';
import { X, Mail, Phone, Calendar, MessageSquare, User, Building2, Send, CheckCircle, AlertCircle, Loader2, MailOpen } from 'lucide-react';
import { contactService } from '../services/contactService';
import { formatDateTimeSpanish } from './DatePicker';
const CONTACT_TYPE_LABELS = {
    inquiry: 'Consulta',
    request: 'Petición',
    complaint: 'Queja',
    claim: 'Reclamo',
    suggestion: 'Sugerencia'
};
const STATUS_LABELS = {
    pending: 'Pendiente',
    in_review: 'En Revisión',
    resolved: 'Resuelto',
    closed: 'Cerrado'
};
const STATUS_OPTIONS = [
    { value: 'pending', label: 'Pendiente' },
    { value: 'in_review', label: 'En Revisión' },
    { value: 'resolved', label: 'Resuelto' },
    { value: 'closed', label: 'Cerrado' }
];
export default function ContactDetailModal({ isOpen, onClose, contact, onUpdated }) {
    const [status, setStatus] = useState(contact.status);
    const [adminResponse, setAdminResponse] = useState(contact.admin_response || '');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    useEffect(() => {
        if (isOpen) {
            setStatus(contact.status);
            setAdminResponse(contact.admin_response || '');
            setError(null);
            setSuccess(null);
        }
    }, [isOpen, contact]);
    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);
            await contactService.updateContact(contact.id, {
                status,
                admin_response: adminResponse || undefined,
                is_read: true
            });
            setSuccess('Mensaje actualizado correctamente');
            onUpdated?.();
            // Close after 1 second
            setTimeout(() => {
                onClose();
            }, 1000);
        }
        catch (err) {
            console.error('Error updating contact:', err);
            setError(err.response?.data?.detail || 'Error al actualizar el mensaje');
        }
        finally {
            setSaving(false);
        }
    };
    const handleMarkAsRead = async () => {
        try {
            setSaving(true);
            setError(null);
            await contactService.updateContact(contact.id, {
                is_read: true
            });
            setSuccess('Marcado como leído');
            onUpdated?.();
        }
        catch (err) {
            console.error('Error marking as read:', err);
            setError(err.response?.data?.detail || 'Error al marcar como leído');
        }
        finally {
            setSaving(false);
        }
    };
    if (!isOpen)
        return null;
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(MessageSquare, { className: "w-6 h-6" }), _jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold", children: "Detalle del Mensaje" }), _jsxs("p", { className: "text-blue-100 text-sm", children: [CONTACT_TYPE_LABELS[contact.contact_type], " - ", STATUS_LABELS[contact.status]] })] })] }), _jsx("button", { onClick: onClose, className: "text-white hover:bg-blue-800 rounded-lg p-2 transition", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [_jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(User, { className: "w-5 h-5 text-gray-400 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Nombre" }), _jsx("p", { className: "text-gray-900 font-medium", children: contact.name })] })] }), _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Mail, { className: "w-5 h-5 text-gray-400 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Email" }), _jsx("p", { className: "text-gray-900 font-medium", children: contact.email })] })] }), contact.phone && (_jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Phone, { className: "w-5 h-5 text-gray-400 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Tel\u00E9fono" }), _jsx("p", { className: "text-gray-900 font-medium", children: contact.phone })] })] })), _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Calendar, { className: "w-5 h-5 text-gray-400 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Fecha" }), _jsx("p", { className: "text-gray-900 font-medium", children: formatDateTimeSpanish(new Date(contact.created_at)) })] })] }), _jsxs("div", { className: "flex items-start gap-2", children: [_jsx(Building2, { className: "w-5 h-5 text-gray-400 mt-0.5" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Colegio" }), _jsx("p", { className: "text-gray-900 font-medium", children: contact.school_id ? 'Ver colegio' : 'General' })] })] }), _jsxs("div", { className: "flex items-start gap-2", children: [contact.is_read ? (_jsx(MailOpen, { className: "w-5 h-5 text-green-500 mt-0.5" })) : (_jsx(Mail, { className: "w-5 h-5 text-blue-500 mt-0.5" })), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Estado de Lectura" }), _jsx("p", { className: "text-gray-900 font-medium", children: contact.is_read ? 'Leído' : 'No leído' })] })] })] }) }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Asunto" }), _jsx("div", { className: "bg-gray-50 rounded-lg p-3 text-gray-900", children: contact.subject })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Mensaje del Cliente" }), _jsx("div", { className: "bg-gray-50 rounded-lg p-4 text-gray-900 whitespace-pre-wrap", children: contact.message })] }), contact.admin_response && (_jsxs("div", { className: "mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(CheckCircle, { className: "w-5 h-5 text-blue-600" }), _jsx("span", { className: "font-medium text-blue-900", children: "Respuesta Enviada" }), contact.admin_response_date && (_jsxs("span", { className: "text-sm text-blue-600", children: ["- ", formatDateTimeSpanish(new Date(contact.admin_response_date))] }))] }), _jsx("p", { className: "text-gray-700 whitespace-pre-wrap", children: contact.admin_response })] })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Estado del Mensaje" }), _jsx("select", { value: status, onChange: (e) => setStatus(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: STATUS_OPTIONS.map(option => (_jsx("option", { value: option.value, children: option.label }, option.value))) })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Respuesta Administrativa" }), _jsx("textarea", { value: adminResponse, onChange: (e) => setAdminResponse(e.target.value), rows: 6, placeholder: "Escribe tu respuesta al cliente aqu\u00ED...", className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" }), _jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Esta respuesta ser\u00E1 visible para el equipo administrativo. Para contactar al cliente, usa su email: ", _jsx("span", { className: "font-medium", children: contact.email })] })] }), error && (_jsxs("div", { className: "mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5" }), error] })), success && (_jsxs("div", { className: "mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2", children: [_jsx(CheckCircle, { className: "w-5 h-5" }), success] }))] }), _jsxs("div", { className: "border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between", children: [_jsx("div", { children: !contact.is_read && (_jsxs("button", { onClick: handleMarkAsRead, disabled: saving, className: "text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1", children: [_jsx(MailOpen, { className: "w-4 h-4" }), "Marcar como le\u00EDdo"] })) }), _jsxs("div", { className: "flex gap-3", children: [_jsx("button", { onClick: onClose, disabled: saving, className: "px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition", children: "Cancelar" }), _jsx("button", { onClick: handleSave, disabled: saving, className: "px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed", children: saving ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Guardando..."] })) : (_jsxs(_Fragment, { children: [_jsx(Send, { className: "w-4 h-4" }), "Guardar Cambios"] })) })] })] })] }) }));
}
