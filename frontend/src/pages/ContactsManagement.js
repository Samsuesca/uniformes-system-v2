import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Contacts Management Page - PQRS (Peticiones, Quejas, Reclamos, Sugerencias)
 *
 * Admin page to view, respond to, and manage contact messages from the web portal.
 */
import { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import ContactDetailModal from '../components/ContactDetailModal';
import { MessageSquare, Search, Mail, MailOpen, Clock, AlertCircle, Loader2, Building2 } from 'lucide-react';
import { formatDateTimeSpanish } from '../components/DatePicker';
import { contactService } from '../services/contactService';
import { useSchoolStore } from '../stores/schoolStore';
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
const STATUS_COLORS = {
    pending: 'bg-yellow-100 text-yellow-700',
    in_review: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-700'
};
export default function ContactsManagement() {
    const { availableSchools, loadSchools } = useSchoolStore();
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [unreadOnly, setUnreadOnly] = useState(false);
    const [selectedContact, setSelectedContact] = useState(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const loadContacts = useCallback(async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await contactService.getContacts({
                page: 1,
                page_size: 100,
                school_id: schoolFilter || undefined,
                status_filter: statusFilter || undefined,
                contact_type_filter: typeFilter || undefined,
                unread_only: unreadOnly || undefined,
                search: searchTerm || undefined
            });
            setContacts(response.items);
        }
        catch (err) {
            console.error('Error loading contacts:', err);
            setError(err.response?.data?.detail || 'Error al cargar mensajes de contacto');
        }
        finally {
            setLoading(false);
        }
    }, [schoolFilter, statusFilter, typeFilter, unreadOnly, searchTerm]);
    useEffect(() => {
        if (availableSchools.length === 0) {
            loadSchools();
        }
    }, [availableSchools.length, loadSchools]);
    // Load contacts on mount and when filters change
    useEffect(() => {
        loadContacts();
    }, [loadContacts]);
    const handleViewContact = async (contact) => {
        setSelectedContact(contact);
        setIsDetailModalOpen(true);
    };
    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setSelectedContact(null);
        // Reload to get updated read status
        loadContacts();
    };
    const handleContactUpdated = () => {
        // Reload contacts after update
        loadContacts();
    };
    // Filter locally by search
    const filteredContacts = contacts.filter(contact => {
        if (searchTerm === '')
            return true;
        const searchLower = searchTerm.toLowerCase();
        return (contact.name.toLowerCase().includes(searchLower) ||
            contact.email.toLowerCase().includes(searchLower) ||
            contact.subject.toLowerCase().includes(searchLower) ||
            contact.message.toLowerCase().includes(searchLower));
    });
    const unreadCount = contacts.filter(c => !c.is_read).length;
    return (_jsx(Layout, { children: _jsxs("div", { className: "p-6", children: [_jsx("div", { className: "mb-6", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h1", { className: "text-3xl font-bold text-gray-900 flex items-center gap-2", children: [_jsx(MessageSquare, { className: "w-8 h-8 text-blue-600" }), "PQRS - Mensajes de Contacto"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Gestiona peticiones, quejas, reclamos y sugerencias del portal web" })] }), unreadCount > 0 && (_jsxs("div", { className: "bg-red-100 text-red-700 px-4 py-2 rounded-lg flex items-center gap-2", children: [_jsx(Mail, { className: "w-5 h-5" }), _jsxs("span", { className: "font-semibold", children: [unreadCount, " sin leer"] })] }))] }) }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6", children: [_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4", children: [_jsxs("div", { className: "lg:col-span-2", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Buscar" }), _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" }), _jsx("input", { type: "text", placeholder: "Nombre, email, asunto...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Colegio" }), _jsxs("select", { value: schoolFilter, onChange: (e) => setSchoolFilter(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "Todos" }), availableSchools.map(school => (_jsx("option", { value: school.id, children: school.name }, school.id)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tipo" }), _jsxs("select", { value: typeFilter, onChange: (e) => setTypeFilter(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "inquiry", children: "Consulta" }), _jsx("option", { value: "request", children: "Petici\u00F3n" }), _jsx("option", { value: "complaint", children: "Queja" }), _jsx("option", { value: "claim", children: "Reclamo" }), _jsx("option", { value: "suggestion", children: "Sugerencia" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Estado" }), _jsxs("select", { value: statusFilter, onChange: (e) => setStatusFilter(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500", children: [_jsx("option", { value: "", children: "Todos" }), _jsx("option", { value: "pending", children: "Pendiente" }), _jsx("option", { value: "in_review", children: "En Revisi\u00F3n" }), _jsx("option", { value: "resolved", children: "Resuelto" }), _jsx("option", { value: "closed", children: "Cerrado" })] })] })] }), _jsxs("div", { className: "mt-4 flex items-center gap-2", children: [_jsx("input", { type: "checkbox", id: "unread-only", checked: unreadOnly, onChange: (e) => setUnreadOnly(e.target.checked), className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" }), _jsxs("label", { htmlFor: "unread-only", className: "text-sm text-gray-700 flex items-center gap-1", children: [_jsx(Mail, { className: "w-4 h-4" }), "Solo mensajes sin leer"] })] })] }), error && (_jsxs("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5" }), error] })), loading && (_jsx("div", { className: "flex justify-center items-center py-12", children: _jsx(Loader2, { className: "w-8 h-8 text-blue-600 animate-spin" }) })), !loading && (_jsx("div", { className: "bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado / Le\u00EDdo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Fecha" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tipo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Contacto" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Asunto" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Colegio" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: filteredContacts.length === 0 ? (_jsx("tr", { children: _jsx("td", { colSpan: 7, className: "px-6 py-12 text-center text-gray-500", children: "No hay mensajes de contacto" }) })) : (filteredContacts.map((contact) => (_jsxs("tr", { className: `hover:bg-gray-50 ${!contact.is_read ? 'bg-blue-50' : ''}`, children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex flex-col gap-1", children: [_jsx("span", { className: `inline-flex items-center px-2 py-1 text-xs font-medium rounded ${STATUS_COLORS[contact.status]}`, children: STATUS_LABELS[contact.status] }), contact.is_read ? (_jsxs("span", { className: "inline-flex items-center gap-1 text-xs text-gray-500", children: [_jsx(MailOpen, { className: "w-3 h-3" }), "Le\u00EDdo"] })) : (_jsxs("span", { className: "inline-flex items-center gap-1 text-xs text-blue-600 font-medium", children: [_jsx(Mail, { className: "w-3 h-3" }), "No le\u00EDdo"] }))] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Clock, { className: "w-4 h-4 text-gray-400" }), formatDateTimeSpanish(new Date(contact.created_at))] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsx("span", { className: "text-sm text-gray-900 font-medium", children: CONTACT_TYPE_LABELS[contact.contact_type] }) }), _jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "text-sm text-gray-900", children: contact.name }), _jsx("div", { className: "text-sm text-gray-500", children: contact.email }), contact.phone && (_jsx("div", { className: "text-xs text-gray-400", children: contact.phone }))] }), _jsxs("td", { className: "px-6 py-4", children: [_jsx("div", { className: "text-sm text-gray-900 max-w-xs truncate", children: contact.subject }), _jsx("div", { className: "text-xs text-gray-500 max-w-xs truncate", children: contact.message })] }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-500", children: contact.school_id ? (_jsxs("div", { className: "flex items-center gap-1", children: [_jsx(Building2, { className: "w-4 h-4" }), availableSchools.find(s => s.id === contact.school_id)?.name || 'Colegio'] })) : (_jsx("span", { className: "text-gray-400", children: "General" })) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: _jsxs("button", { onClick: () => handleViewContact(contact), className: "text-blue-600 hover:text-blue-900 inline-flex items-center gap-1", children: ["Ver detalles", _jsx(MessageSquare, { className: "w-4 h-4" })] }) })] }, contact.id)))) })] }) })), selectedContact && (_jsx(ContactDetailModal, { isOpen: isDetailModalOpen, onClose: handleCloseDetailModal, contact: selectedContact, onUpdated: handleContactUpdated }))] }) }));
}
