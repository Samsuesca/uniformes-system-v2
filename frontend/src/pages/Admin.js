import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Admin Panel - Superuser-only administration page
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ShieldCheck, Building2, Users, Database, RefreshCw, Loader2, AlertCircle, Plus, Edit2, Trash2, X, Save, AlertTriangle, UserCog, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';
import apiClient from '../utils/api-client';
const ROLE_LABELS = {
    owner: 'Propietario',
    admin: 'Administrador',
    seller: 'Vendedor',
    viewer: 'Solo Lectura'
};
const ROLE_COLORS = {
    owner: 'bg-purple-100 text-purple-800',
    admin: 'bg-blue-100 text-blue-800',
    seller: 'bg-green-100 text-green-800',
    viewer: 'bg-gray-100 text-gray-800'
};
export default function Admin() {
    const navigate = useNavigate();
    const { user: currentUser } = useAuthStore();
    const { loadSchools } = useSchoolStore();
    const [activeTab, setActiveTab] = useState('schools');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    // Schools state
    const [schools, setSchools] = useState([]);
    const [showSchoolModal, setShowSchoolModal] = useState(false);
    const [editingSchool, setEditingSchool] = useState(null);
    const [schoolForm, setSchoolForm] = useState({
        code: '',
        name: '',
        address: '',
        phone: '',
        email: ''
    });
    // Users state
    const [users, setUsers] = useState([]);
    const [showUserModal, setShowUserModal] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        full_name: '',
        password: '',
        is_active: true,
        is_superuser: false
    });
    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(null);
    // Role management state
    const [expandedUserId, setExpandedUserId] = useState(null);
    const [userRoles, setUserRoles] = useState({});
    const [showRoleModal, setShowRoleModal] = useState(false);
    const [roleModalUser, setRoleModalUser] = useState(null);
    const [selectedSchoolId, setSelectedSchoolId] = useState('');
    const [selectedRole, setSelectedRole] = useState('seller');
    const [loadingRoles, setLoadingRoles] = useState(null);
    // Check superuser access
    useEffect(() => {
        if (!currentUser?.is_superuser) {
            navigate('/dashboard');
        }
    }, [currentUser, navigate]);
    // Load data
    useEffect(() => {
        loadData();
    }, []);
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            const [schoolsRes, usersRes] = await Promise.all([
                apiClient.get('/schools'),
                apiClient.get('/users')
            ]);
            setSchools(schoolsRes.data);
            setUsers(usersRes.data);
        }
        catch (err) {
            console.error('Error loading admin data:', err);
            setError(err.response?.data?.detail || 'Error al cargar datos');
        }
        finally {
            setLoading(false);
        }
    };
    // School handlers
    const handleSaveSchool = async () => {
        if (!schoolForm.code || !schoolForm.name)
            return;
        try {
            setSubmitting(true);
            if (editingSchool) {
                await apiClient.patch(`/schools/${editingSchool.id}`, schoolForm);
            }
            else {
                await apiClient.post('/schools', schoolForm);
            }
            setShowSchoolModal(false);
            setEditingSchool(null);
            resetSchoolForm();
            await loadData();
            await loadSchools();
        }
        catch (err) {
            setError(err.response?.data?.detail || 'Error al guardar colegio');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleEditSchool = (school) => {
        setEditingSchool(school);
        setSchoolForm({
            code: school.code,
            name: school.name,
            address: school.address || '',
            phone: school.phone || '',
            email: school.email || ''
        });
        setShowSchoolModal(true);
    };
    const handleDeleteSchool = async (id) => {
        try {
            setSubmitting(true);
            await apiClient.delete(`/schools/${id}`);
            setConfirmDelete(null);
            await loadData();
            await loadSchools();
        }
        catch (err) {
            setError(err.response?.data?.detail || 'Error al eliminar colegio');
        }
        finally {
            setSubmitting(false);
        }
    };
    const resetSchoolForm = () => {
        setSchoolForm({ code: '', name: '', address: '', phone: '', email: '' });
    };
    // User handlers
    const handleSaveUser = async () => {
        if (!userForm.username || !userForm.email)
            return;
        try {
            setSubmitting(true);
            setError(null);
            if (editingUser) {
                // For updates, only send changed fields
                const updatePayload = {};
                if (userForm.username !== editingUser.username)
                    updatePayload.username = userForm.username;
                if (userForm.email !== editingUser.email)
                    updatePayload.email = userForm.email;
                if (userForm.full_name !== (editingUser.full_name || ''))
                    updatePayload.full_name = userForm.full_name || null;
                if (userForm.is_active !== editingUser.is_active)
                    updatePayload.is_active = userForm.is_active;
                if (userForm.password)
                    updatePayload.password = userForm.password;
                await apiClient.put(`/users/${editingUser.id}`, updatePayload);
            }
            else {
                // For creation, password is required and must meet requirements
                if (!userForm.password) {
                    setError('La contraseña es requerida para nuevos usuarios');
                    setSubmitting(false);
                    return;
                }
                if (userForm.password.length < 8) {
                    setError('La contraseña debe tener al menos 8 caracteres');
                    setSubmitting(false);
                    return;
                }
                if (!/[0-9]/.test(userForm.password)) {
                    setError('La contraseña debe contener al menos un número');
                    setSubmitting(false);
                    return;
                }
                if (!/[A-Z]/.test(userForm.password)) {
                    setError('La contraseña debe contener al menos una mayúscula');
                    setSubmitting(false);
                    return;
                }
                if (!/[a-z]/.test(userForm.password)) {
                    setError('La contraseña debe contener al menos una minúscula');
                    setSubmitting(false);
                    return;
                }
                // UserCreate schema expects: username, email, password, is_superuser, full_name (optional)
                const createPayload = {
                    username: userForm.username,
                    email: userForm.email,
                    password: userForm.password,
                    is_superuser: userForm.is_superuser,
                    full_name: userForm.full_name || null
                };
                await apiClient.post('/users', createPayload);
            }
            setShowUserModal(false);
            setEditingUser(null);
            resetUserForm();
            await loadData();
        }
        catch (err) {
            console.error('Error saving user:', err.response?.data);
            // Handle validation errors from backend
            const detail = err.response?.data?.detail;
            if (Array.isArray(detail)) {
                // Pydantic validation errors
                const messages = detail.map((e) => `${e.loc[e.loc.length - 1]}: ${e.msg}`).join(', ');
                setError(messages);
            }
            else if (typeof detail === 'string') {
                setError(detail);
            }
            else {
                setError('Error al guardar usuario');
            }
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleEditUser = (user) => {
        setEditingUser(user);
        setUserForm({
            username: user.username,
            email: user.email,
            full_name: user.full_name || '',
            password: '',
            is_active: user.is_active,
            is_superuser: user.is_superuser
        });
        setShowUserModal(true);
    };
    const handleDeleteUser = async (id) => {
        try {
            setSubmitting(true);
            await apiClient.delete(`/users/${id}`);
            setConfirmDelete(null);
            await loadData();
        }
        catch (err) {
            setError(err.response?.data?.detail || 'Error al eliminar usuario');
        }
        finally {
            setSubmitting(false);
        }
    };
    const resetUserForm = () => {
        setUserForm({
            username: '',
            email: '',
            full_name: '',
            password: '',
            is_active: true,
            is_superuser: false
        });
    };
    // Role management handlers
    const loadUserRoles = async (userId) => {
        try {
            setLoadingRoles(userId);
            const res = await apiClient.get(`/users/${userId}/schools`);
            setUserRoles(prev => ({ ...prev, [userId]: res.data }));
        }
        catch (err) {
            console.error('Error loading user roles:', err);
            setError('Error al cargar roles del usuario');
        }
        finally {
            setLoadingRoles(null);
        }
    };
    const toggleUserExpand = async (userId) => {
        if (expandedUserId === userId) {
            setExpandedUserId(null);
        }
        else {
            setExpandedUserId(userId);
            if (!userRoles[userId]) {
                await loadUserRoles(userId);
            }
        }
    };
    const openAddRoleModal = (user) => {
        setRoleModalUser(user);
        setSelectedSchoolId('');
        setSelectedRole('seller');
        setShowRoleModal(true);
    };
    const handleAddRole = async () => {
        if (!roleModalUser || !selectedSchoolId)
            return;
        try {
            setSubmitting(true);
            await apiClient.post(`/users/${roleModalUser.id}/schools/${selectedSchoolId}/role?role=${selectedRole}`);
            setShowRoleModal(false);
            await loadUserRoles(roleModalUser.id);
        }
        catch (err) {
            console.error('Error adding role:', err);
            setError(err.response?.data?.detail || 'Error al agregar rol');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleUpdateRole = async (userId, schoolId, newRole) => {
        try {
            setSubmitting(true);
            await apiClient.put(`/users/${userId}/schools/${schoolId}/role?role=${newRole}`);
            await loadUserRoles(userId);
        }
        catch (err) {
            console.error('Error updating role:', err);
            setError(err.response?.data?.detail || 'Error al actualizar rol');
        }
        finally {
            setSubmitting(false);
        }
    };
    const handleRemoveRole = async (userId, schoolId) => {
        try {
            setSubmitting(true);
            await apiClient.delete(`/users/${userId}/schools/${schoolId}/role`);
            await loadUserRoles(userId);
        }
        catch (err) {
            console.error('Error removing role:', err);
            setError(err.response?.data?.detail || 'Error al eliminar rol');
        }
        finally {
            setSubmitting(false);
        }
    };
    const getSchoolName = (schoolId) => {
        const school = schools.find(s => s.id === schoolId);
        return school?.name || 'Colegio desconocido';
    };
    const getAvailableSchoolsForUser = (userId) => {
        const existingSchoolIds = (userRoles[userId] || []).map(r => r.school_id);
        return schools.filter(s => !existingSchoolIds.includes(s.id));
    };
    if (!currentUser?.is_superuser) {
        return null;
    }
    if (loading) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-amber-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando panel de administraci\u00F3n..." })] }) }));
    }
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6", children: [_jsxs("h1", { className: "text-2xl font-bold text-gray-800 flex items-center", children: [_jsx(ShieldCheck, { className: "w-8 h-8 mr-3 text-amber-600" }), "Panel de Administraci\u00F3n"] }), _jsx("p", { className: "text-gray-600 mt-1", children: "Gesti\u00F3n global del sistema (solo superusuarios)" })] }), error && (_jsx("div", { className: "mb-6 bg-red-50 border border-red-200 rounded-lg p-4", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 mr-2" }), _jsx("span", { className: "text-red-700", children: error })] }), _jsx("button", { onClick: () => setError(null), className: "text-red-500 hover:text-red-700", children: _jsx(X, { className: "w-5 h-5" }) })] }) })), _jsx("div", { className: "border-b border-gray-200 mb-6", children: _jsxs("nav", { className: "flex gap-4", children: [_jsxs("button", { onClick: () => setActiveTab('schools'), className: `pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'schools'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Building2, { className: "w-4 h-4 inline mr-2" }), "Colegios (", schools.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab('users'), className: `pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'users'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Users, { className: "w-4 h-4 inline mr-2" }), "Usuarios (", users.length, ")"] }), _jsxs("button", { onClick: () => setActiveTab('system'), className: `pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${activeTab === 'system'
                                ? 'border-amber-600 text-amber-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Database, { className: "w-4 h-4 inline mr-2" }), "Sistema"] })] }) }), activeTab === 'schools' && (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Colegios Registrados" }), _jsxs("button", { onClick: () => {
                                    resetSchoolForm();
                                    setEditingSchool(null);
                                    setShowSchoolModal(true);
                                }, className: "flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors", children: [_jsx(Plus, { className: "w-5 h-5" }), "Nuevo Colegio"] })] }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "C\u00F3digo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Nombre" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Contacto" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Acciones" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: schools.map((school) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4 text-sm font-mono text-gray-900", children: school.code }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900", children: school.name }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500", children: school.email || school.phone || 'Sin contacto' }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-2 py-1 text-xs rounded-full ${school.is_active
                                                        ? 'bg-green-100 text-green-800'
                                                        : 'bg-red-100 text-red-800'}`, children: school.is_active ? 'Activo' : 'Inactivo' }) }), _jsxs("td", { className: "px-6 py-4 text-right", children: [_jsx("button", { onClick: () => handleEditSchool(school), className: "text-blue-600 hover:text-blue-800 mr-3", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => setConfirmDelete({ type: 'school', id: school.id }), className: "text-red-600 hover:text-red-800", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, school.id))) })] }) })] })), activeTab === 'users' && (_jsxs("div", { children: [_jsxs("div", { className: "flex justify-between items-center mb-4", children: [_jsx("h2", { className: "text-lg font-semibold", children: "Usuarios del Sistema" }), _jsxs("button", { onClick: () => {
                                    resetUserForm();
                                    setEditingUser(null);
                                    setShowUserModal(true);
                                }, className: "flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors", children: [_jsx(Plus, { className: "w-5 h-5" }), "Nuevo Usuario"] })] }), _jsx("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden", children: _jsxs("table", { className: "w-full", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Usuario" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Email" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Nombre" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Tipo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase", children: "Acciones" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: users.map((user) => (_jsxs(_Fragment, { children: [_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-6 py-4", children: !user.is_superuser && (_jsx("button", { onClick: () => toggleUserExpand(user.id), className: "text-gray-400 hover:text-gray-600", children: loadingRoles === user.id ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : expandedUserId === user.id ? (_jsx(ChevronUp, { className: "w-4 h-4" })) : (_jsx(ChevronDown, { className: "w-4 h-4" })) })) }), _jsx("td", { className: "px-6 py-4 text-sm font-medium text-gray-900", children: user.username }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500", children: user.email }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-500", children: user.full_name || '-' }), _jsx("td", { className: "px-6 py-4", children: user.is_superuser ? (_jsx("span", { className: "px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800", children: "Superusuario" })) : (_jsx("span", { className: "px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800", children: "Usuario" })) }), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: `px-2 py-1 text-xs rounded-full ${user.is_active
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-red-100 text-red-800'}`, children: user.is_active ? 'Activo' : 'Inactivo' }) }), _jsxs("td", { className: "px-6 py-4 text-right", children: [_jsx("button", { onClick: () => handleEditUser(user), className: "text-blue-600 hover:text-blue-800 mr-3", title: "Editar usuario", children: _jsx(Edit2, { className: "w-4 h-4" }) }), !user.is_superuser && (_jsx("button", { onClick: () => openAddRoleModal(user), className: "text-purple-600 hover:text-purple-800 mr-3", title: "Agregar rol", children: _jsx(UserCog, { className: "w-4 h-4" }) })), user.id !== currentUser?.id && (_jsx("button", { onClick: () => setConfirmDelete({ type: 'user', id: user.id }), className: "text-red-600 hover:text-red-800", title: "Eliminar usuario", children: _jsx(Trash2, { className: "w-4 h-4" }) }))] })] }, user.id), expandedUserId === user.id && !user.is_superuser && (_jsx("tr", { className: "bg-gray-50", children: _jsx("td", { colSpan: 7, className: "px-6 py-4", children: _jsxs("div", { className: "ml-8", children: [_jsxs("div", { className: "flex items-center justify-between mb-3", children: [_jsxs("h4", { className: "text-sm font-medium text-gray-700 flex items-center gap-2", children: [_jsx(UserCog, { className: "w-4 h-4" }), "Roles por Colegio"] }), _jsxs("button", { onClick: () => openAddRoleModal(user), className: "text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1", children: [_jsx(Plus, { className: "w-3 h-3" }), "Agregar Acceso"] })] }), (userRoles[user.id] || []).length === 0 ? (_jsx("p", { className: "text-sm text-gray-500 italic", children: "Este usuario no tiene acceso a ning\u00FAn colegio" })) : (_jsx("div", { className: "space-y-2", children: (userRoles[user.id] || []).map((role) => (_jsxs("div", { className: "flex items-center justify-between bg-white rounded-lg px-4 py-2 border", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Building2, { className: "w-4 h-4 text-gray-400" }), _jsx("span", { className: "text-sm font-medium", children: getSchoolName(role.school_id) }), _jsx("span", { className: `px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[role.role]}`, children: ROLE_LABELS[role.role] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: role.role, onChange: (e) => handleUpdateRole(user.id, role.school_id, e.target.value), className: "text-xs border rounded px-2 py-1", disabled: submitting, children: [_jsx("option", { value: "owner", children: "Propietario" }), _jsx("option", { value: "admin", children: "Administrador" }), _jsx("option", { value: "seller", children: "Vendedor" }), _jsx("option", { value: "viewer", children: "Solo Lectura" })] }), _jsx("button", { onClick: () => handleRemoveRole(user.id, role.school_id), className: "text-red-500 hover:text-red-700", disabled: submitting, title: "Quitar acceso", children: _jsx(X, { className: "w-4 h-4" }) })] })] }, role.id))) }))] }) }) }, `${user.id}-roles`))] }))) })] }) }), _jsxs("div", { className: "mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4", children: [_jsx("h4", { className: "text-sm font-medium text-blue-800 mb-2", children: "Tipos de Roles" }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-3 text-sm", children: [_jsxs("div", { children: [_jsx("span", { className: `px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.owner}`, children: "Propietario" }), _jsx("p", { className: "text-xs text-gray-600 mt-1", children: "Acceso completo + gesti\u00F3n usuarios" })] }), _jsxs("div", { children: [_jsx("span", { className: `px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.admin}`, children: "Administrador" }), _jsx("p", { className: "text-xs text-gray-600 mt-1", children: "Ventas, inventario, reportes" })] }), _jsxs("div", { children: [_jsx("span", { className: `px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.seller}`, children: "Vendedor" }), _jsx("p", { className: "text-xs text-gray-600 mt-1", children: "Crear ventas, clientes, pedidos" })] }), _jsxs("div", { children: [_jsx("span", { className: `px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.viewer}`, children: "Solo Lectura" }), _jsx("p", { className: "text-xs text-gray-600 mt-1", children: "Ver informaci\u00F3n sin modificar" })] })] })] })] })), activeTab === 'system' && (_jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsxs("h3", { className: "text-lg font-semibold mb-4 flex items-center", children: [_jsx(Database, { className: "w-5 h-5 mr-2 text-gray-600" }), "Estado del Sistema"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Colegios registrados:" }), _jsx("span", { className: "font-medium", children: schools.length })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Usuarios totales:" }), _jsx("span", { className: "font-medium", children: users.length })] }), _jsxs("div", { className: "flex justify-between", children: [_jsx("span", { className: "text-gray-600", children: "Superusuarios:" }), _jsx("span", { className: "font-medium", children: users.filter(u => u.is_superuser).length })] })] })] }), _jsxs("div", { className: "bg-white rounded-xl shadow-sm border border-gray-200 p-6", children: [_jsxs("h3", { className: "text-lg font-semibold mb-4 flex items-center", children: [_jsx(RefreshCw, { className: "w-5 h-5 mr-2 text-gray-600" }), "Acciones del Sistema"] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("button", { onClick: loadData, className: "w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors", children: [_jsx(RefreshCw, { className: "w-4 h-4" }), "Recargar Datos"] }), _jsxs("button", { onClick: () => loadSchools(), className: "w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors", children: [_jsx(Building2, { className: "w-4 h-4" }), "Sincronizar Colegios"] })] })] })] })), showSchoolModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: editingSchool ? 'Editar Colegio' : 'Nuevo Colegio' }), _jsx("button", { onClick: () => setShowSchoolModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "C\u00F3digo *" }), _jsx("input", { type: "text", value: schoolForm.code, onChange: (e) => setSchoolForm({ ...schoolForm, code: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500", placeholder: "IE-001" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", value: schoolForm.name, onChange: (e) => setSchoolForm({ ...schoolForm, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500", placeholder: "Nombre del colegio" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Direcci\u00F3n" }), _jsx("input", { type: "text", value: schoolForm.address, onChange: (e) => setSchoolForm({ ...schoolForm, address: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tel\u00E9fono" }), _jsx("input", { type: "text", value: schoolForm.phone, onChange: (e) => setSchoolForm({ ...schoolForm, phone: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", value: schoolForm.email, onChange: (e) => setSchoolForm({ ...schoolForm, email: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowSchoolModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveSchool, disabled: submitting || !schoolForm.code || !schoolForm.name, className: "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx(Save, { className: "w-4 h-4" }), "Guardar"] })] })] }) })), showUserModal && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-lg mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: editingUser ? 'Editar Usuario' : 'Nuevo Usuario' }), _jsx("button", { onClick: () => setShowUserModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Usuario *" }), _jsx("input", { type: "text", value: userForm.username, onChange: (e) => setUserForm({ ...userForm, username: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email *" }), _jsx("input", { type: "email", value: userForm.email, onChange: (e) => setUserForm({ ...userForm, email: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre Completo" }), _jsx("input", { type: "text", value: userForm.full_name, onChange: (e) => setUserForm({ ...userForm, full_name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500" })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: ["Contrase\u00F1a ", editingUser ? '(dejar vacío para no cambiar)' : '*'] }), _jsx("input", { type: "password", value: userForm.password, onChange: (e) => setUserForm({ ...userForm, password: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500", placeholder: editingUser ? '' : 'Mínimo 8 caracteres' }), !editingUser && (_jsx("p", { className: "mt-1 text-xs text-gray-500", children: "Debe incluir: may\u00FAscula, min\u00FAscula y n\u00FAmero" }))] }), _jsxs("div", { className: "flex items-center gap-6", children: [_jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: userForm.is_active, onChange: (e) => setUserForm({ ...userForm, is_active: e.target.checked }), className: "w-4 h-4 text-amber-600 rounded" }), _jsx("span", { className: "text-sm text-gray-700", children: "Activo" })] }), _jsxs("label", { className: "flex items-center gap-2", children: [_jsx("input", { type: "checkbox", checked: userForm.is_superuser, onChange: (e) => setUserForm({ ...userForm, is_superuser: e.target.checked }), className: "w-4 h-4 text-amber-600 rounded" }), _jsx("span", { className: "text-sm text-gray-700", children: "Superusuario" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowUserModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveUser, disabled: submitting || !userForm.username || !userForm.email, className: "px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx(Save, { className: "w-4 h-4" }), "Guardar"] })] })] }) })), showRoleModal && roleModalUser && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Agregar Acceso a Colegio" }), _jsx("button", { onClick: () => setShowRoleModal(false), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: "bg-gray-50 rounded-lg p-3", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Usuario:" }), _jsxs("p", { className: "font-medium", children: [roleModalUser.username, " (", roleModalUser.email, ")"] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Colegio *" }), _jsxs("select", { value: selectedSchoolId, onChange: (e) => setSelectedSchoolId(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500", children: [_jsx("option", { value: "", children: "Seleccionar colegio..." }), getAvailableSchoolsForUser(roleModalUser.id).map((school) => (_jsxs("option", { value: school.id, children: [school.code, " - ", school.name] }, school.id)))] }), getAvailableSchoolsForUser(roleModalUser.id).length === 0 && (_jsx("p", { className: "mt-1 text-xs text-amber-600", children: "Este usuario ya tiene acceso a todos los colegios disponibles" }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Rol *" }), _jsxs("select", { value: selectedRole, onChange: (e) => setSelectedRole(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500", children: [_jsx("option", { value: "owner", children: "Propietario - Acceso completo + gesti\u00F3n usuarios" }), _jsx("option", { value: "admin", children: "Administrador - Ventas, inventario, reportes" }), _jsx("option", { value: "seller", children: "Vendedor - Crear ventas, clientes, pedidos" }), _jsx("option", { value: "viewer", children: "Solo Lectura - Ver informaci\u00F3n" })] })] })] }), _jsxs("div", { className: "flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl", children: [_jsx("button", { onClick: () => setShowRoleModal(false), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: handleAddRole, disabled: submitting || !selectedSchoolId, className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx(UserCog, { className: "w-4 h-4" }), "Agregar Acceso"] })] })] }) })), confirmDelete && (_jsx("div", { className: "fixed inset-0 bg-black/50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6", children: [_jsxs("div", { className: "flex items-center gap-3 mb-4", children: [_jsx("div", { className: "w-12 h-12 bg-red-100 rounded-full flex items-center justify-center", children: _jsx(AlertTriangle, { className: "w-6 h-6 text-red-600" }) }), _jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: "Confirmar Eliminaci\u00F3n" }), _jsx("p", { className: "text-sm text-gray-500", children: "Esta acci\u00F3n no se puede deshacer" })] })] }), _jsxs("p", { className: "text-gray-600 mb-6", children: ["\u00BFEst\u00E1 seguro que desea eliminar este ", confirmDelete.type === 'school' ? 'colegio' : 'usuario', "?", confirmDelete.type === 'school' && (_jsx("span", { className: "block mt-2 text-sm text-red-600", children: "Esto eliminar\u00E1 tambi\u00E9n todos los datos asociados (ventas, productos, clientes, etc.)" }))] }), _jsxs("div", { className: "flex justify-end gap-3", children: [_jsx("button", { onClick: () => setConfirmDelete(null), className: "px-4 py-2 text-gray-600 hover:text-gray-800", children: "Cancelar" }), _jsxs("button", { onClick: () => {
                                        if (confirmDelete.type === 'school') {
                                            handleDeleteSchool(confirmDelete.id);
                                        }
                                        else {
                                            handleDeleteUser(confirmDelete.id);
                                        }
                                    }, disabled: submitting, className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2", children: [submitting && _jsx(Loader2, { className: "w-4 h-4 animate-spin" }), _jsx(Trash2, { className: "w-4 h-4" }), "Eliminar"] })] })] }) }))] }));
}
