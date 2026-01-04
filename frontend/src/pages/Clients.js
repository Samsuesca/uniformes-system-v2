import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Clients Page - List and manage clients with full CRUD
 */
import { useEffect, useState } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import Layout from '../components/Layout';
import { Users, Plus, Search, AlertCircle, Loader2, Mail, Phone, User, Edit2, Trash2, X, Save } from 'lucide-react';
import { clientService } from '../services/clientService';
import { useSchoolStore } from '../stores/schoolStore';
const emptyFormData = {
    name: '',
    phone: '',
    email: '',
    address: '',
    student_name: '',
    student_grade: '',
    notes: '',
};
export default function Clients() {
    const { currentSchool } = useSchoolStore();
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('create');
    const [selectedClient, setSelectedClient] = useState(null);
    const [formData, setFormData] = useState(emptyFormData);
    const [formLoading, setFormLoading] = useState(false);
    const [formError, setFormError] = useState(null);
    // Delete confirmation
    const [deleteConfirmId, setDeleteConfirmId] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const schoolId = currentSchool?.id || '';
    useEffect(() => {
        loadClients();
    }, []);
    const loadClients = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await clientService.getClients(schoolId);
            setClients(data);
        }
        catch (err) {
            console.error('Error loading clients:', err);
            setError(err.response?.data?.detail || 'Error al cargar clientes');
        }
        finally {
            setLoading(false);
        }
    };
    // Filter clients
    const filteredClients = clients.filter(client => {
        const searchLower = searchTerm.toLowerCase();
        return searchTerm === '' ||
            client.name.toLowerCase().includes(searchLower) ||
            client.phone?.toLowerCase().includes(searchLower) ||
            client.email?.toLowerCase().includes(searchLower) ||
            client.student_name?.toLowerCase().includes(searchLower) ||
            client.code?.toLowerCase().includes(searchLower);
    });
    // Open modal for create
    const handleOpenCreate = () => {
        setModalMode('create');
        setSelectedClient(null);
        setFormData(emptyFormData);
        setFormError(null);
        setIsModalOpen(true);
    };
    // Open modal for edit
    const handleOpenEdit = (client) => {
        setModalMode('edit');
        setSelectedClient(client);
        setFormData({
            name: client.name || '',
            phone: client.phone || '',
            email: client.email || '',
            address: client.address || '',
            student_name: client.student_name || '',
            student_grade: client.student_grade || '',
            notes: client.notes || '',
        });
        setFormError(null);
        setIsModalOpen(true);
    };
    // Close modal
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedClient(null);
        setFormData(emptyFormData);
        setFormError(null);
    };
    // Handle form input change
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    // Handle form submit
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.name.trim()) {
            setFormError('El nombre es obligatorio');
            return;
        }
        if (formData.name.trim().length < 3) {
            setFormError('El nombre debe tener al menos 3 caracteres');
            return;
        }
        setFormLoading(true);
        setFormError(null);
        try {
            const dataToSend = {
                name: formData.name.trim(),
                phone: formData.phone.trim() || null,
                email: formData.email.trim() || null,
                address: formData.address.trim() || null,
                student_name: formData.student_name.trim() || null,
                student_grade: formData.student_grade.trim() || null,
                notes: formData.notes.trim() || null,
            };
            if (modalMode === 'create') {
                await clientService.createClient(schoolId, dataToSend);
                // Notify if activation email was sent
                if (dataToSend.email) {
                    toast.success(`Cliente creado. Email de activación enviado a ${dataToSend.email}`, { duration: 5000 });
                }
                else {
                    toast.success('Cliente creado exitosamente');
                }
            }
            else if (selectedClient) {
                await clientService.updateClient(schoolId, selectedClient.id, dataToSend);
                toast.success('Cliente actualizado exitosamente');
            }
            handleCloseModal();
            await loadClients();
        }
        catch (err) {
            console.error('Error saving client:', err);
            let errorMessage = 'Error al guardar el cliente';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                }
                else if (Array.isArray(err.response.data.detail)) {
                    errorMessage = err.response.data.detail.map((e) => e.msg || e.message).join(', ');
                }
            }
            setFormError(errorMessage);
        }
        finally {
            setFormLoading(false);
        }
    };
    // Handle delete
    const handleDelete = async (clientId) => {
        setDeleteLoading(true);
        try {
            await clientService.deleteClient(schoolId, clientId);
            setDeleteConfirmId(null);
            await loadClients();
        }
        catch (err) {
            console.error('Error deleting client:', err);
            setError(err.response?.data?.detail || 'Error al eliminar el cliente');
        }
        finally {
            setDeleteLoading(false);
        }
    };
    return (_jsxs(Layout, { children: [_jsx(Toaster, { position: "top-right" }), _jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Clientes" }), _jsx("p", { className: "text-gray-600 mt-1", children: loading ? 'Cargando...' : `${filteredClients.length} clientes encontrados` })] }), _jsxs("button", { onClick: handleOpenCreate, className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Cliente"] })] }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Buscar por nombre, tel\u00E9fono, email, estudiante, c\u00F3digo...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }) }), loading && (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando clientes..." })] })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 mb-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar clientes" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: loadClients, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) })), !loading && !error && filteredClients.length > 0 && (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: filteredClients.map((client) => (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6 hover:shadow-md transition-shadow", children: [_jsxs("div", { className: "flex items-start justify-between mb-4", children: [_jsxs("div", { className: "flex-1", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800", children: client.name }), _jsx("span", { className: "text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded", children: client.code })] }), client.student_name && (_jsxs("div", { className: "flex items-center mt-1 text-sm text-gray-600", children: [_jsx(User, { className: "w-4 h-4 mr-1" }), _jsx("span", { children: client.student_name }), client.student_grade && (_jsxs("span", { className: "ml-1 text-gray-400", children: ["(", client.student_grade, ")"] }))] }))] }), _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => handleOpenEdit(client), className: "p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition", title: "Editar", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => setDeleteConfirmId(client.id), className: "p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition", title: "Eliminar", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { className: "space-y-2", children: [client.phone && (_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(Phone, { className: "w-4 h-4 mr-2 text-gray-400" }), _jsx("span", { children: client.phone })] })), client.email && (_jsxs("div", { className: "flex items-center text-sm text-gray-600", children: [_jsx(Mail, { className: "w-4 h-4 mr-2 text-gray-400" }), _jsx("span", { className: "truncate", children: client.email })] }))] }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 flex justify-between items-center", children: [_jsx("span", { className: `px-2 py-1 text-xs leading-5 font-semibold rounded-full ${client.is_active
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'}`, children: client.is_active ? 'Activo' : 'Inactivo' }), client.notes && (_jsx("span", { className: "text-xs text-gray-400 truncate max-w-[150px]", title: client.notes, children: client.notes }))] }), deleteConfirmId === client.id && (_jsxs("div", { className: "mt-4 p-3 bg-red-50 border border-red-200 rounded-lg", children: [_jsx("p", { className: "text-sm text-red-800 mb-3", children: "\u00BFEliminar este cliente?" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { onClick: () => handleDelete(client.id), disabled: deleteLoading, className: "flex-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50", children: deleteLoading ? 'Eliminando...' : 'Sí, eliminar' }), _jsx("button", { onClick: () => setDeleteConfirmId(null), disabled: deleteLoading, className: "flex-1 px-3 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-50", children: "Cancelar" })] })] }))] }, client.id))) })), !loading && !error && filteredClients.length === 0 && (_jsxs("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-12 text-center", children: [_jsx(Users, { className: "w-16 h-16 text-blue-400 mx-auto mb-4" }), _jsx("h3", { className: "text-lg font-medium text-blue-900 mb-2", children: searchTerm ? 'No se encontraron clientes' : 'No hay clientes' }), _jsx("p", { className: "text-blue-700 mb-4", children: searchTerm
                            ? 'Intenta ajustar el término de búsqueda'
                            : 'Comienza agregando tu primer cliente' }), !searchTerm && (_jsxs("button", { onClick: handleOpenCreate, className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Agregar Cliente"] }))] })), isModalOpen && (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: handleCloseModal }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-lg w-full", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsx("h2", { className: "text-xl font-semibold text-gray-800", children: modalMode === 'create' ? 'Nuevo Cliente' : 'Editar Cliente' }), _jsx("button", { onClick: handleCloseModal, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6", children: [formError && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-sm text-red-700", children: formError })] })), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", name: "name", value: formData.name, onChange: handleInputChange, required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", placeholder: "Nombre completo del cliente" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tel\u00E9fono" }), _jsx("input", { type: "tel", name: "phone", value: formData.phone, onChange: handleInputChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", placeholder: "Ej: 3001234567" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", name: "email", value: formData.email, onChange: handleInputChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", placeholder: "cliente@email.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Direcci\u00F3n" }), _jsx("input", { type: "text", name: "address", value: formData.address, onChange: handleInputChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", placeholder: "Direcci\u00F3n del cliente" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre del Estudiante" }), _jsx("input", { type: "text", name: "student_name", value: formData.student_name, onChange: handleInputChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", placeholder: "Nombre del estudiante" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Grado" }), _jsx("input", { type: "text", name: "student_grade", value: formData.student_grade, onChange: handleInputChange, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", placeholder: "Ej: 5\u00B0 Primaria" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notas" }), _jsx("textarea", { name: "notes", value: formData.notes, onChange: handleInputChange, rows: 3, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none", placeholder: "Notas adicionales sobre el cliente..." })] })] }), _jsxs("div", { className: "flex gap-3 pt-6 mt-6 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: handleCloseModal, disabled: formLoading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: formLoading, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center", children: formLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Guardando..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-2" }), modalMode === 'create' ? 'Crear Cliente' : 'Guardar Cambios'] })) })] })] })] }) })] }))] }));
}
