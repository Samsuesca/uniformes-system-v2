import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Settings Page - Application and school settings
 * Full admin panel for superusers
 */
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { Settings as SettingsIcon, School, User, Bell, Lock, Server, CheckCircle, XCircle, X, Plus, Edit2, Trash2, Users, Building2, Loader2, AlertCircle, Eye, EyeOff, Save, Shield, Truck } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { ENVIRONMENTS, ENVIRONMENT_LABELS, ENVIRONMENT_DESCRIPTIONS } from '../config/environments';
import { userService } from '../services/userService';
import { schoolService } from '../services/schoolService';
import { deliveryZoneService } from '../services/deliveryZoneService';
export default function Settings() {
    const { user, updateUser } = useAuthStore();
    const { apiUrl, setApiUrl, isOnline } = useConfigStore();
    const [customUrl, setCustomUrl] = useState(apiUrl);
    const [activeModal, setActiveModal] = useState(null);
    // Profile edit state
    const [profileForm, setProfileForm] = useState({
        full_name: user?.full_name || '',
        email: user?.email || ''
    });
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileError, setProfileError] = useState(null);
    const [profileSuccess, setProfileSuccess] = useState(false);
    // Password change state
    const [passwordForm, setPasswordForm] = useState({
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [passwordLoading, setPasswordLoading] = useState(false);
    const [passwordError, setPasswordError] = useState(null);
    const [passwordSuccess, setPasswordSuccess] = useState(false);
    // Schools management state
    const [schools, setSchools] = useState([]);
    const [schoolsLoading, setSchoolsLoading] = useState(false);
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [schoolForm, setSchoolForm] = useState({
        code: '',
        name: '',
        email: '',
        phone: '',
        address: ''
    });
    const [schoolSaving, setSchoolSaving] = useState(false);
    const [schoolError, setSchoolError] = useState(null);
    // Users management state
    const [users, setUsers] = useState([]);
    const [usersLoading, setUsersLoading] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userForm, setUserForm] = useState({
        username: '',
        email: '',
        password: '',
        full_name: '',
        is_superuser: false
    });
    const [editUserForm, setEditUserForm] = useState({
        email: '',
        full_name: '',
        is_active: true
    });
    const [userSaving, setUserSaving] = useState(false);
    const [userError, setUserError] = useState(null);
    // User roles management state
    const [userRoles, setUserRoles] = useState([]);
    const [rolesLoading, setRolesLoading] = useState(false);
    const [selectedRoleSchool, setSelectedRoleSchool] = useState('');
    const [selectedRoleType, setSelectedRoleType] = useState('seller');
    const [roleSaving, setRoleSaving] = useState(false);
    const [roleError, setRoleError] = useState(null);
    // Delivery zones management state
    const [deliveryZones, setDeliveryZones] = useState([]);
    const [zonesLoading, setZonesLoading] = useState(false);
    const [selectedZone, setSelectedZone] = useState(null);
    const [zoneForm, setZoneForm] = useState({
        name: '',
        description: '',
        delivery_fee: 0,
        estimated_days: 1
    });
    const [zoneSaving, setZoneSaving] = useState(false);
    const [zoneError, setZoneError] = useState(null);
    // Update profile form when user changes
    useEffect(() => {
        if (user) {
            setProfileForm({
                full_name: user.full_name || '',
                email: user.email || ''
            });
        }
    }, [user]);
    // Load schools when modal opens
    useEffect(() => {
        if (activeModal === 'manageSchools' || activeModal === 'createSchool' || activeModal === 'editSchool' || activeModal === 'manageUserRoles') {
            loadSchools();
        }
    }, [activeModal]);
    // Load users when modal opens
    useEffect(() => {
        if (activeModal === 'manageUsers' || activeModal === 'createUser' || activeModal === 'editUser') {
            loadUsers();
        }
    }, [activeModal]);
    // Load user roles when managing roles
    useEffect(() => {
        if (activeModal === 'manageUserRoles' && selectedUser) {
            loadUserRoles(selectedUser.id);
        }
    }, [activeModal, selectedUser]);
    // Load delivery zones when modal opens
    useEffect(() => {
        if (activeModal === 'manageDeliveryZones' || activeModal === 'createDeliveryZone' || activeModal === 'editDeliveryZone') {
            loadDeliveryZones();
        }
    }, [activeModal]);
    const loadSchools = async () => {
        setSchoolsLoading(true);
        try {
            const data = await schoolService.getSchools(false);
            setSchools(data);
        }
        catch (err) {
            console.error('Error loading schools:', err);
        }
        finally {
            setSchoolsLoading(false);
        }
    };
    const loadUsers = async () => {
        setUsersLoading(true);
        try {
            const data = await userService.getUsers();
            setUsers(data);
        }
        catch (err) {
            console.error('Error loading users:', err);
        }
        finally {
            setUsersLoading(false);
        }
    };
    const loadUserRoles = async (userId) => {
        setRolesLoading(true);
        try {
            const roles = await userService.getUserSchools(userId);
            setUserRoles(roles);
        }
        catch (err) {
            console.error('Error loading user roles:', err);
        }
        finally {
            setRolesLoading(false);
        }
    };
    const loadDeliveryZones = async () => {
        setZonesLoading(true);
        try {
            const data = await deliveryZoneService.getZones(true);
            setDeliveryZones(data);
        }
        catch (err) {
            console.error('Error loading delivery zones:', err);
        }
        finally {
            setZonesLoading(false);
        }
    };
    // Profile handlers
    const handleSaveProfile = async () => {
        if (!user)
            return;
        setProfileLoading(true);
        setProfileError(null);
        setProfileSuccess(false);
        try {
            const updated = await userService.updateProfile(user.id, {
                full_name: profileForm.full_name || undefined,
                email: profileForm.email
            });
            updateUser({ full_name: updated.full_name, email: updated.email });
            setProfileSuccess(true);
            setTimeout(() => {
                setActiveModal(null);
                setProfileSuccess(false);
            }, 1500);
        }
        catch (err) {
            setProfileError(err.response?.data?.detail || 'Error al actualizar perfil');
        }
        finally {
            setProfileLoading(false);
        }
    };
    // Password handlers
    const handleChangePassword = async () => {
        setPasswordLoading(true);
        setPasswordError(null);
        setPasswordSuccess(false);
        if (passwordForm.new_password !== passwordForm.confirm_password) {
            setPasswordError('Las contraseñas no coinciden');
            setPasswordLoading(false);
            return;
        }
        if (passwordForm.new_password.length < 6) {
            setPasswordError('La nueva contraseña debe tener al menos 6 caracteres');
            setPasswordLoading(false);
            return;
        }
        try {
            await userService.changePassword({
                current_password: passwordForm.current_password,
                new_password: passwordForm.new_password
            });
            setPasswordSuccess(true);
            setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
            setTimeout(() => {
                setActiveModal(null);
                setPasswordSuccess(false);
            }, 1500);
        }
        catch (err) {
            setPasswordError(err.response?.data?.detail || 'Error al cambiar contraseña');
        }
        finally {
            setPasswordLoading(false);
        }
    };
    // School handlers
    const handleOpenEditSchool = (school) => {
        setSelectedSchool(school);
        setSchoolForm({
            code: school.code,
            name: school.name,
            email: school.email || '',
            phone: school.phone || '',
            address: school.address || ''
        });
        setActiveModal('editSchool');
    };
    const handleSaveSchool = async () => {
        setSchoolSaving(true);
        setSchoolError(null);
        try {
            if (activeModal === 'createSchool') {
                await schoolService.createSchool(schoolForm);
            }
            else if (selectedSchool) {
                const updateData = {
                    name: schoolForm.name,
                    email: schoolForm.email || undefined,
                    phone: schoolForm.phone || undefined,
                    address: schoolForm.address || undefined
                };
                await schoolService.updateSchool(selectedSchool.id, updateData);
            }
            await loadSchools();
            setActiveModal('manageSchools');
            setSchoolForm({ code: '', name: '', email: '', phone: '', address: '' });
            setSelectedSchool(null);
        }
        catch (err) {
            setSchoolError(err.response?.data?.detail || 'Error al guardar colegio');
        }
        finally {
            setSchoolSaving(false);
        }
    };
    const handleToggleSchoolActive = async (school) => {
        try {
            if (school.is_active) {
                await schoolService.deleteSchool(school.id);
            }
            else {
                await schoolService.activateSchool(school.id);
            }
            await loadSchools();
        }
        catch (err) {
            console.error('Error toggling school:', err);
        }
    };
    // User handlers
    const handleSaveUser = async () => {
        setUserSaving(true);
        setUserError(null);
        if (!userForm.username || !userForm.email || !userForm.password) {
            setUserError('Usuario, email y contraseña son requeridos');
            setUserSaving(false);
            return;
        }
        try {
            await userService.createUser(userForm);
            await loadUsers();
            setActiveModal('manageUsers');
            setUserForm({ username: '', email: '', password: '', full_name: '', is_superuser: false });
        }
        catch (err) {
            setUserError(err.response?.data?.detail || 'Error al crear usuario');
        }
        finally {
            setUserSaving(false);
        }
    };
    const handleOpenEditUser = (u) => {
        setSelectedUser(u);
        setEditUserForm({
            email: u.email,
            full_name: u.full_name || '',
            is_active: u.is_active
        });
        setActiveModal('editUser');
    };
    const handleUpdateUser = async () => {
        if (!selectedUser)
            return;
        setUserSaving(true);
        setUserError(null);
        try {
            await userService.updateUser(selectedUser.id, editUserForm);
            await loadUsers();
            setActiveModal('manageUsers');
            setSelectedUser(null);
        }
        catch (err) {
            setUserError(err.response?.data?.detail || 'Error al actualizar usuario');
        }
        finally {
            setUserSaving(false);
        }
    };
    const handleDeleteUser = async (userId) => {
        if (!confirm('¿Estás seguro de eliminar este usuario?'))
            return;
        try {
            await userService.deleteUser(userId);
            await loadUsers();
        }
        catch (err) {
            console.error('Error deleting user:', err);
            alert(err.response?.data?.detail || 'Error al eliminar usuario');
        }
    };
    // User roles handlers
    const handleOpenManageRoles = (u) => {
        setSelectedUser(u);
        setRoleError(null);
        setActiveModal('manageUserRoles');
    };
    const handleAddRole = async () => {
        if (!selectedUser || !selectedRoleSchool)
            return;
        setRoleSaving(true);
        setRoleError(null);
        try {
            await userService.addUserSchoolRole(selectedUser.id, selectedRoleSchool, selectedRoleType);
            await loadUserRoles(selectedUser.id);
            setSelectedRoleSchool('');
        }
        catch (err) {
            setRoleError(err.response?.data?.detail || 'Error al asignar rol');
        }
        finally {
            setRoleSaving(false);
        }
    };
    const handleRemoveRole = async (schoolId) => {
        if (!selectedUser)
            return;
        if (!confirm('¿Estás seguro de quitar el acceso a este colegio?'))
            return;
        try {
            await userService.removeUserSchoolRole(selectedUser.id, schoolId);
            await loadUserRoles(selectedUser.id);
        }
        catch (err) {
            console.error('Error removing role:', err);
            alert(err.response?.data?.detail || 'Error al quitar rol');
        }
    };
    const handleUpdateRole = async (schoolId, newRole) => {
        if (!selectedUser)
            return;
        setRoleSaving(true);
        try {
            await userService.updateUserSchoolRole(selectedUser.id, schoolId, newRole);
            await loadUserRoles(selectedUser.id);
        }
        catch (err) {
            console.error('Error updating role:', err);
        }
        finally {
            setRoleSaving(false);
        }
    };
    // Delivery zone handlers
    const handleOpenEditZone = (zone) => {
        setSelectedZone(zone);
        setZoneForm({
            name: zone.name,
            description: zone.description || '',
            delivery_fee: zone.delivery_fee,
            estimated_days: zone.estimated_days
        });
        setActiveModal('editDeliveryZone');
    };
    const handleSaveZone = async () => {
        setZoneSaving(true);
        setZoneError(null);
        try {
            if (activeModal === 'createDeliveryZone') {
                await deliveryZoneService.createZone(zoneForm);
            }
            else if (selectedZone) {
                const updateData = {
                    name: zoneForm.name,
                    description: zoneForm.description || undefined,
                    delivery_fee: zoneForm.delivery_fee,
                    estimated_days: zoneForm.estimated_days
                };
                await deliveryZoneService.updateZone(selectedZone.id, updateData);
            }
            await loadDeliveryZones();
            setActiveModal('manageDeliveryZones');
            setZoneForm({ name: '', description: '', delivery_fee: 0, estimated_days: 1 });
            setSelectedZone(null);
        }
        catch (err) {
            setZoneError(err.response?.data?.detail || 'Error al guardar zona');
        }
        finally {
            setZoneSaving(false);
        }
    };
    const handleToggleZoneActive = async (zone) => {
        try {
            if (zone.is_active) {
                await deliveryZoneService.deleteZone(zone.id);
            }
            else {
                await deliveryZoneService.updateZone(zone.id, { is_active: true });
            }
            await loadDeliveryZones();
        }
        catch (err) {
            console.error('Error toggling zone:', err);
        }
    };
    const closeModal = () => {
        setActiveModal(null);
        setProfileError(null);
        setPasswordError(null);
        setSchoolError(null);
        setUserError(null);
        setRoleError(null);
        setZoneError(null);
        setProfileSuccess(false);
        setPasswordSuccess(false);
        setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
        setSchoolForm({ code: '', name: '', email: '', phone: '', address: '' });
        setUserForm({ username: '', email: '', password: '', full_name: '', is_superuser: false });
        setZoneForm({ name: '', description: '', delivery_fee: 0, estimated_days: 1 });
        setSelectedSchool(null);
        setSelectedUser(null);
        setSelectedZone(null);
        setUserRoles([]);
    };
    // Get schools that user doesn't have access to yet
    const availableSchoolsForRole = schools.filter(s => s.is_active && !userRoles.find(r => r.school_id === s.id));
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6", children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Configuraci\u00F3n" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Administra la configuraci\u00F3n del sistema" })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6 mb-6", children: [_jsxs("div", { className: "flex items-center justify-between mb-4", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(Server, { className: "w-5 h-5 text-purple-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Configuraci\u00F3n del Servidor" })] }), _jsx("div", { className: "flex items-center", children: isOnline ? (_jsxs("div", { className: "flex items-center text-green-600", children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-1" }), _jsx("span", { className: "text-sm", children: "Conectado" })] })) : (_jsxs("div", { className: "flex items-center text-red-600", children: [_jsx(XCircle, { className: "w-4 h-4 mr-1" }), _jsx("span", { className: "text-sm", children: "Desconectado" })] })) })] }), _jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Selecciona el servidor al que deseas conectarte." }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Entorno" }), _jsx("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: Object.keys(ENVIRONMENTS).map((env) => (_jsxs("button", { onClick: () => {
                                                const url = ENVIRONMENTS[env];
                                                setApiUrl(url);
                                                setCustomUrl(url);
                                            }, className: `p-4 border-2 rounded-lg text-left transition ${apiUrl === ENVIRONMENTS[env]
                                                ? 'border-purple-600 bg-purple-50'
                                                : 'border-gray-200 hover:border-purple-300'}`, children: [_jsx("div", { className: "font-semibold text-gray-800 mb-1", children: ENVIRONMENT_LABELS[env] }), _jsx("div", { className: "text-xs text-gray-600", children: ENVIRONMENT_DESCRIPTIONS[env] }), _jsx("div", { className: "text-xs text-gray-500 mt-2 font-mono break-all", children: ENVIRONMENTS[env] })] }, env))) })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "URL Personalizada" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("input", { type: "text", value: customUrl, onChange: (e) => setCustomUrl(e.target.value), placeholder: "http://192.168.1.100:8000", className: "flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500" }), _jsx("button", { onClick: () => setApiUrl(customUrl), className: "px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition", children: "Aplicar" })] })] }), _jsxs("div", { className: "bg-gray-50 p-3 rounded-lg", children: [_jsx("div", { className: "text-sm font-medium text-gray-700", children: "Servidor Actual:" }), _jsxs("div", { className: "text-sm text-gray-600 font-mono mt-1", children: [apiUrl, "/api/v1"] })] })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6", children: [_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx(User, { className: "w-5 h-5 text-blue-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Perfil de Usuario" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("label", { className: "text-sm text-gray-600", children: "Nombre de usuario" }), _jsx("p", { className: "text-gray-800 font-medium", children: user?.username })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-gray-600", children: "Nombre completo" }), _jsx("p", { className: "text-gray-800 font-medium", children: user?.full_name || 'No especificado' })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-gray-600", children: "Email" }), _jsx("p", { className: "text-gray-800 font-medium", children: user?.email })] }), _jsxs("div", { children: [_jsx("label", { className: "text-sm text-gray-600", children: "Rol" }), _jsx("p", { className: "text-gray-800 font-medium", children: user?.is_superuser ? (_jsx("span", { className: "px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs", children: "Superusuario" })) : (_jsx("span", { className: "px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs", children: "Usuario" })) })] }), _jsxs("button", { onClick: () => setActiveModal('editProfile'), className: "mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center", children: [_jsx(Edit2, { className: "w-4 h-4 mr-2" }), "Editar Perfil"] })] })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx(Lock, { className: "w-5 h-5 text-red-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Seguridad" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Cambia tu contrase\u00F1a para mantener tu cuenta segura." }), _jsxs("button", { onClick: () => setActiveModal('changePassword'), className: "mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center", children: [_jsx(Lock, { className: "w-4 h-4 mr-2" }), "Cambiar Contrase\u00F1a"] })] })] }), user?.is_superuser && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx(School, { className: "w-5 h-5 text-green-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Colegios" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Gestiona los colegios registrados en el sistema." }), _jsxs("button", { onClick: () => setActiveModal('manageSchools'), className: "mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center", children: [_jsx(Building2, { className: "w-4 h-4 mr-2" }), "Administrar Colegios"] })] })] })), user?.is_superuser && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx(Users, { className: "w-5 h-5 text-indigo-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Usuarios" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Gestiona los usuarios del sistema y sus permisos por colegio." }), _jsxs("button", { onClick: () => setActiveModal('manageUsers'), className: "mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center", children: [_jsx(Users, { className: "w-4 h-4 mr-2" }), "Administrar Usuarios"] })] })] })), user?.is_superuser && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx(Truck, { className: "w-5 h-5 text-blue-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Zonas de Envio" })] }), _jsxs("div", { className: "space-y-3", children: [_jsx("p", { className: "text-sm text-gray-600", children: "Configura las zonas de envio y sus costos para pedidos con domicilio." }), _jsxs("button", { onClick: () => setActiveModal('manageDeliveryZones'), className: "mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center", children: [_jsx(Truck, { className: "w-4 h-4 mr-2" }), "Administrar Zonas"] })] })] })), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6", children: [_jsxs("div", { className: "flex items-center mb-4", children: [_jsx(Bell, { className: "w-5 h-5 text-yellow-600 mr-2" }), _jsx("h2", { className: "text-lg font-semibold text-gray-800", children: "Notificaciones" })] }), _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-700", children: "Stock bajo" }), _jsx("input", { type: "checkbox", className: "w-4 h-4 text-blue-600", defaultChecked: true })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-700", children: "Nuevas ventas" }), _jsx("input", { type: "checkbox", className: "w-4 h-4 text-blue-600", defaultChecked: true })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("span", { className: "text-sm text-gray-700", children: "Encargos listos" }), _jsx("input", { type: "checkbox", className: "w-4 h-4 text-blue-600", defaultChecked: true })] })] })] })] }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(SettingsIcon, { className: "w-6 h-6 text-blue-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-blue-800", children: "Sistema Uniformes v2.0" }), _jsxs("p", { className: "mt-1 text-sm text-blue-700", children: ["Conectado a: ", _jsx("span", { className: "font-mono", children: apiUrl }), _jsx("br", {}), "Usuario: ", _jsx("span", { className: "font-medium", children: user?.username }), user?.is_superuser && _jsx("span", { className: "ml-2 text-purple-600", children: "(Superusuario)" })] })] })] }) }), activeModal === 'editProfile' && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Editar Perfil" }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [profileError && (_jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), profileError] })), profileSuccess && (_jsxs("div", { className: "p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center", children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-2" }), "Perfil actualizado correctamente"] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre de usuario" }), _jsx("input", { type: "text", value: user?.username || '', disabled: true, className: "w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500" }), _jsx("p", { className: "text-xs text-gray-500 mt-1", children: "El nombre de usuario no se puede cambiar" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre completo" }), _jsx("input", { type: "text", value: profileForm.full_name, onChange: (e) => setProfileForm({ ...profileForm, full_name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Tu nombre completo" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", value: profileForm.email, onChange: (e) => setProfileForm({ ...profileForm, email: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "tu@email.com" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t", children: [_jsx("button", { onClick: closeModal, className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveProfile, disabled: profileLoading, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [profileLoading ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Save, { className: "w-4 h-4 mr-2" }), "Guardar"] })] })] }) })), activeModal === 'changePassword' && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Cambiar Contrase\u00F1a" }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [passwordError && (_jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), passwordError] })), passwordSuccess && (_jsxs("div", { className: "p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center", children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-2" }), "Contrase\u00F1a cambiada correctamente"] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Contrase\u00F1a actual" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPasswords.current ? 'text' : 'password', value: passwordForm.current_password, onChange: (e) => setPasswordForm({ ...passwordForm, current_password: e.target.value }), className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" }), _jsx("button", { type: "button", onClick: () => setShowPasswords({ ...showPasswords, current: !showPasswords.current }), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600", children: showPasswords.current ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nueva contrase\u00F1a" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPasswords.new ? 'text' : 'password', value: passwordForm.new_password, onChange: (e) => setPasswordForm({ ...passwordForm, new_password: e.target.value }), className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" }), _jsx("button", { type: "button", onClick: () => setShowPasswords({ ...showPasswords, new: !showPasswords.new }), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600", children: showPasswords.new ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Confirmar nueva contrase\u00F1a" }), _jsxs("div", { className: "relative", children: [_jsx("input", { type: showPasswords.confirm ? 'text' : 'password', value: passwordForm.confirm_password, onChange: (e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value }), className: "w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent" }), _jsx("button", { type: "button", onClick: () => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm }), className: "absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600", children: showPasswords.confirm ? _jsx(EyeOff, { className: "w-4 h-4" }) : _jsx(Eye, { className: "w-4 h-4" }) })] })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t", children: [_jsx("button", { onClick: closeModal, className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Cancelar" }), _jsxs("button", { onClick: handleChangePassword, disabled: passwordLoading, className: "px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [passwordLoading ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Lock, { className: "w-4 h-4 mr-2" }), "Cambiar Contrase\u00F1a"] })] })] }) })), activeModal === 'manageSchools' && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Administrar Colegios" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => {
                                                setSchoolForm({ code: '', name: '', email: '', phone: '', address: '' });
                                                setActiveModal('createSchool');
                                            }, className: "px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center", children: [_jsx(Plus, { className: "w-4 h-4 mr-1" }), "Nuevo"] }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] })] }), _jsx("div", { className: "p-4 overflow-y-auto flex-1", children: schoolsLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-green-600" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Cargando colegios..." })] })) : schools.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No hay colegios registrados" })) : (_jsx("div", { className: "space-y-3", children: schools.map((school) => (_jsx("div", { className: `p-4 border rounded-lg ${school.is_active ? 'bg-white' : 'bg-gray-50'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "font-medium text-gray-800", children: school.name }), _jsx("span", { className: "text-xs text-gray-500 font-mono", children: school.code }), !school.is_active && (_jsx("span", { className: "px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs", children: "Inactivo" }))] }), _jsxs("div", { className: "text-sm text-gray-500 mt-1", children: [school.email && _jsx("span", { children: school.email }), school.phone && _jsx("span", { className: "ml-3", children: school.phone })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => handleOpenEditSchool(school), className: "p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition", title: "Editar", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleToggleSchoolActive(school), className: `p-2 rounded-lg transition ${school.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`, title: school.is_active ? 'Desactivar' : 'Activar', children: school.is_active ? _jsx(XCircle, { className: "w-4 h-4" }) : _jsx(CheckCircle, { className: "w-4 h-4" }) })] })] }) }, school.id))) })) })] }) })), (activeModal === 'createSchool' || activeModal === 'editSchool') && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: activeModal === 'createSchool' ? 'Nuevo Colegio' : 'Editar Colegio' }), _jsx("button", { onClick: () => setActiveModal('manageSchools'), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [schoolError && (_jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), schoolError] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "C\u00F3digo *" }), _jsx("input", { type: "text", value: schoolForm.code, onChange: (e) => setSchoolForm({ ...schoolForm, code: e.target.value.toUpperCase() }), disabled: activeModal === 'editSchool', className: `w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${activeModal === 'editSchool' ? 'bg-gray-100 text-gray-500' : ''}`, placeholder: "COL-001" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", value: schoolForm.name, onChange: (e) => setSchoolForm({ ...schoolForm, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent", placeholder: "Colegio San Jos\u00E9" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", value: schoolForm.email, onChange: (e) => setSchoolForm({ ...schoolForm, email: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent", placeholder: "contacto@colegio.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Tel\u00E9fono" }), _jsx("input", { type: "text", value: schoolForm.phone, onChange: (e) => setSchoolForm({ ...schoolForm, phone: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent", placeholder: "(1) 234-5678" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Direcci\u00F3n" }), _jsx("input", { type: "text", value: schoolForm.address, onChange: (e) => setSchoolForm({ ...schoolForm, address: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent", placeholder: "Calle 123 #45-67" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t", children: [_jsx("button", { onClick: () => setActiveModal('manageSchools'), className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveSchool, disabled: schoolSaving || !schoolForm.code || !schoolForm.name, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [schoolSaving ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Save, { className: "w-4 h-4 mr-2" }), "Guardar"] })] })] }) })), activeModal === 'manageUsers' && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Administrar Usuarios" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => setActiveModal('createUser'), className: "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center", children: [_jsx(Plus, { className: "w-4 h-4 mr-1" }), "Nuevo"] }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] })] }), _jsx("div", { className: "p-4 overflow-y-auto flex-1", children: usersLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-indigo-600" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Cargando usuarios..." })] })) : users.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No hay usuarios registrados" })) : (_jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Usuario" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Nombre" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Email" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Rol" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Estado" }), _jsx("th", { className: "px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: users.map((u) => (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "px-4 py-3 whitespace-nowrap", children: _jsx("span", { className: "font-medium text-gray-900", children: u.username }) }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap text-gray-600", children: u.full_name || '-' }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap text-gray-600", children: u.email }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap", children: u.is_superuser ? (_jsx("span", { className: "px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs", children: "Superusuario" })) : (_jsx("span", { className: "px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs", children: "Usuario" })) }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap", children: u.is_active ? (_jsx("span", { className: "px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs", children: "Activo" })) : (_jsx("span", { className: "px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs", children: "Inactivo" })) }), _jsx("td", { className: "px-4 py-3 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center gap-1", children: [_jsx("button", { onClick: () => handleOpenEditUser(u), className: "p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition", title: "Editar", children: _jsx(Edit2, { className: "w-4 h-4" }) }), !u.is_superuser && (_jsx("button", { onClick: () => handleOpenManageRoles(u), className: "p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition", title: "Gestionar accesos a colegios", children: _jsx(Shield, { className: "w-4 h-4" }) })), u.id !== user?.id && (_jsx("button", { onClick: () => handleDeleteUser(u.id), className: "p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition", title: "Eliminar", children: _jsx(Trash2, { className: "w-4 h-4" }) }))] }) })] }, u.id))) })] }) })) })] }) })), activeModal === 'createUser' && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Nuevo Usuario" }), _jsx("button", { onClick: () => setActiveModal('manageUsers'), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [userError && (_jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), userError] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Usuario *" }), _jsx("input", { type: "text", value: userForm.username, onChange: (e) => setUserForm({ ...userForm, username: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "juanperez" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre completo" }), _jsx("input", { type: "text", value: userForm.full_name, onChange: (e) => setUserForm({ ...userForm, full_name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "Juan P\u00E9rez" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email *" }), _jsx("input", { type: "email", value: userForm.email, onChange: (e) => setUserForm({ ...userForm, email: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "juan@email.com" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Contrase\u00F1a *" }), _jsx("input", { type: "password", value: userForm.password, onChange: (e) => setUserForm({ ...userForm, password: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "M\u00EDnimo 6 caracteres" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "is_superuser", checked: userForm.is_superuser, onChange: (e) => setUserForm({ ...userForm, is_superuser: e.target.checked }), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("label", { htmlFor: "is_superuser", className: "ml-2 text-sm text-gray-700", children: "Es superusuario (acceso total a todos los colegios)" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t", children: [_jsx("button", { onClick: () => setActiveModal('manageUsers'), className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveUser, disabled: userSaving || !userForm.username || !userForm.email || !userForm.password, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [userSaving ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Save, { className: "w-4 h-4 mr-2" }), "Crear Usuario"] })] })] }) })), activeModal === 'editUser' && selectedUser && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsxs("h3", { className: "text-lg font-semibold", children: ["Editar Usuario: ", selectedUser.username] }), _jsx("button", { onClick: () => setActiveModal('manageUsers'), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [userError && (_jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), userError] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Usuario" }), _jsx("input", { type: "text", value: selectedUser.username, disabled: true, className: "w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre completo" }), _jsx("input", { type: "text", value: editUserForm.full_name || '', onChange: (e) => setEditUserForm({ ...editUserForm, full_name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "Nombre completo" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Email" }), _jsx("input", { type: "email", value: editUserForm.email || '', onChange: (e) => setEditUserForm({ ...editUserForm, email: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent", placeholder: "email@ejemplo.com" })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("input", { type: "checkbox", id: "is_active", checked: editUserForm.is_active, onChange: (e) => setEditUserForm({ ...editUserForm, is_active: e.target.checked }), className: "w-4 h-4 text-indigo-600 rounded" }), _jsx("label", { htmlFor: "is_active", className: "ml-2 text-sm text-gray-700", children: "Usuario activo" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t", children: [_jsx("button", { onClick: () => setActiveModal('manageUsers'), className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Cancelar" }), _jsxs("button", { onClick: handleUpdateUser, disabled: userSaving, className: "px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [userSaving ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Save, { className: "w-4 h-4 mr-2" }), "Guardar Cambios"] })] })] }) })), activeModal === 'manageUserRoles' && selectedUser && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsxs("div", { children: [_jsx("h3", { className: "text-lg font-semibold", children: "Accesos a Colegios" }), _jsxs("p", { className: "text-sm text-gray-500", children: ["Usuario: ", selectedUser.username, " (", selectedUser.full_name || selectedUser.email, ")"] })] }), _jsx("button", { onClick: () => setActiveModal('manageUsers'), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 overflow-y-auto flex-1", children: [roleError && (_jsxs("div", { className: "p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), roleError] })), _jsxs("div", { className: "bg-gray-50 p-4 rounded-lg mb-4", children: [_jsx("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: "Agregar acceso a colegio" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsxs("select", { value: selectedRoleSchool, onChange: (e) => setSelectedRoleSchool(e.target.value), className: "flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500", children: [_jsx("option", { value: "", children: "Seleccionar colegio..." }), availableSchoolsForRole.map((s) => (_jsx("option", { value: s.id, children: s.name }, s.id)))] }), _jsxs("select", { value: selectedRoleType, onChange: (e) => setSelectedRoleType(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500", children: [_jsx("option", { value: "viewer", children: "Visor (solo lectura)" }), _jsx("option", { value: "seller", children: "Vendedor" }), _jsx("option", { value: "admin", children: "Admin" })] }), _jsxs("button", { onClick: handleAddRole, disabled: !selectedRoleSchool || roleSaving, className: "px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [roleSaving ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Plus, { className: "w-4 h-4 mr-2" }), "Agregar"] })] })] }), _jsx("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: "Accesos actuales" }), rolesLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-green-600" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Cargando accesos..." })] })) : userRoles.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500 bg-gray-50 rounded-lg", children: "Este usuario no tiene acceso a ning\u00FAn colegio" })) : (_jsx("div", { className: "space-y-2", children: userRoles.map((role) => (_jsxs("div", { className: "flex items-center justify-between p-3 border rounded-lg bg-white", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx(Building2, { className: "w-5 h-5 text-gray-400" }), _jsxs("div", { children: [_jsx("span", { className: "font-medium text-gray-800", children: role.school.name }), _jsxs("span", { className: "text-xs text-gray-500 ml-2", children: ["(", role.school.code, ")"] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("select", { value: role.role, onChange: (e) => handleUpdateRole(role.school_id, e.target.value), className: "px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-green-500", children: [_jsx("option", { value: "viewer", children: "Visor" }), _jsx("option", { value: "seller", children: "Vendedor" }), _jsx("option", { value: "admin", children: "Admin" })] }), _jsx("button", { onClick: () => handleRemoveRole(role.school_id), className: "p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition", title: "Quitar acceso", children: _jsx(Trash2, { className: "w-4 h-4" }) })] })] }, role.school_id))) }))] }), _jsx("div", { className: "flex justify-end gap-2 p-4 border-t", children: _jsx("button", { onClick: () => setActiveModal('manageUsers'), className: "px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition", children: "Cerrar" }) })] }) })), activeModal === 'manageDeliveryZones' && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: "Administrar Zonas de Envio" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("button", { onClick: () => {
                                                setZoneForm({ name: '', description: '', delivery_fee: 0, estimated_days: 1 });
                                                setActiveModal('createDeliveryZone');
                                            }, className: "px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm flex items-center", children: [_jsx(Plus, { className: "w-4 h-4 mr-1" }), "Nueva Zona"] }), _jsx("button", { onClick: closeModal, className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] })] }), _jsx("div", { className: "p-4 overflow-y-auto flex-1", children: zonesLoading ? (_jsxs("div", { className: "flex items-center justify-center py-8", children: [_jsx(Loader2, { className: "w-6 h-6 animate-spin text-blue-600" }), _jsx("span", { className: "ml-2 text-gray-600", children: "Cargando zonas..." })] })) : deliveryZones.length === 0 ? (_jsx("div", { className: "text-center py-8 text-gray-500", children: "No hay zonas de envio registradas" })) : (_jsx("div", { className: "space-y-3", children: deliveryZones.map((zone) => (_jsx("div", { className: `p-4 border rounded-lg ${zone.is_active ? 'bg-white' : 'bg-gray-50'}`, children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(Truck, { className: "w-5 h-5 text-blue-500" }), _jsx("span", { className: "font-medium text-gray-800", children: zone.name }), !zone.is_active && (_jsx("span", { className: "px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs", children: "Inactiva" }))] }), _jsx("div", { className: "text-sm text-gray-500 mt-1 ml-7", children: zone.description && _jsx("span", { children: zone.description }) }), _jsxs("div", { className: "flex items-center gap-4 mt-2 ml-7", children: [_jsxs("span", { className: "text-sm font-medium text-green-600", children: ["$", zone.delivery_fee.toLocaleString()] }), _jsxs("span", { className: "text-sm text-gray-500", children: [zone.estimated_days, " dia", zone.estimated_days > 1 ? 's' : ''] })] })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => handleOpenEditZone(zone), className: "p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition", title: "Editar", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleToggleZoneActive(zone), className: `p-2 rounded-lg transition ${zone.is_active ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`, title: zone.is_active ? 'Desactivar' : 'Activar', children: zone.is_active ? _jsx(XCircle, { className: "w-4 h-4" }) : _jsx(CheckCircle, { className: "w-4 h-4" }) })] })] }) }, zone.id))) })) })] }) })), (activeModal === 'createDeliveryZone' || activeModal === 'editDeliveryZone') && (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl w-full max-w-md mx-4", children: [_jsxs("div", { className: "flex items-center justify-between p-4 border-b", children: [_jsx("h3", { className: "text-lg font-semibold", children: activeModal === 'createDeliveryZone' ? 'Nueva Zona de Envio' : 'Editar Zona de Envio' }), _jsx("button", { onClick: () => setActiveModal('manageDeliveryZones'), className: "text-gray-400 hover:text-gray-600", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "p-4 space-y-4", children: [zoneError && (_jsxs("div", { className: "p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center", children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), zoneError] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Nombre *" }), _jsx("input", { type: "text", value: zoneForm.name, onChange: (e) => setZoneForm({ ...zoneForm, name: e.target.value }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "Ej: Zona Norte" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Descripcion" }), _jsx("textarea", { value: zoneForm.description, onChange: (e) => setZoneForm({ ...zoneForm, description: e.target.value }), rows: 2, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none", placeholder: "Ej: Barrios incluidos en esta zona" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Costo de Envio *" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", children: "$" }), _jsx("input", { type: "number", min: "0", value: zoneForm.delivery_fee || '', onChange: (e) => setZoneForm({ ...zoneForm, delivery_fee: parseFloat(e.target.value) || 0 }), className: "w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "8000" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Dias Estimados *" }), _jsx("input", { type: "number", min: "1", value: zoneForm.estimated_days || '', onChange: (e) => setZoneForm({ ...zoneForm, estimated_days: parseInt(e.target.value) || 1 }), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent", placeholder: "1" })] })] }), _jsxs("div", { className: "flex justify-end gap-2 p-4 border-t", children: [_jsx("button", { onClick: () => setActiveModal('manageDeliveryZones'), className: "px-4 py-2 text-gray-600 hover:text-gray-800 transition", children: "Cancelar" }), _jsxs("button", { onClick: handleSaveZone, disabled: zoneSaving || !zoneForm.name || zoneForm.delivery_fee < 0, className: "px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center disabled:opacity-50", children: [zoneSaving ? _jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }) : _jsx(Save, { className: "w-4 h-4 mr-2" }), "Guardar"] })] })] }) }))] }));
}
