/**
 * Admin Panel - Superuser-only administration page
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import {
  ShieldCheck, Building2, Users, Database, RefreshCw,
  Loader2, AlertCircle, Plus, Edit2, Trash2, X, Save,
  AlertTriangle, UserCog, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useSchoolStore } from '../stores/schoolStore';
import apiClient from '../utils/api-client';
import type { School, User } from '../types/api';

// Role types matching backend
type UserRole = 'owner' | 'admin' | 'seller' | 'viewer';

interface UserSchoolRole {
  id: string;
  user_id: string;
  school_id: string;
  role: UserRole;
  created_at: string;
}

const ROLE_LABELS: Record<UserRole, string> = {
  owner: 'Propietario',
  admin: 'Administrador',
  seller: 'Vendedor',
  viewer: 'Solo Lectura'
};

const ROLE_COLORS: Record<UserRole, string> = {
  owner: 'bg-purple-100 text-purple-800',
  admin: 'bg-blue-100 text-blue-800',
  seller: 'bg-green-100 text-green-800',
  viewer: 'bg-gray-100 text-gray-800'
};

interface SchoolFormData {
  code: string;
  name: string;
  address: string;
  phone: string;
  email: string;
}

interface UserFormData {
  username: string;
  email: string;
  full_name: string;
  password?: string;
  is_active: boolean;
  is_superuser: boolean;
}

export default function Admin() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const { loadSchools } = useSchoolStore();

  const [activeTab, setActiveTab] = useState<'schools' | 'users' | 'system'>('schools');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Schools state
  const [schools, setSchools] = useState<School[]>([]);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [schoolForm, setSchoolForm] = useState<SchoolFormData>({
    code: '',
    name: '',
    address: '',
    phone: '',
    email: ''
  });

  // Users state
  const [users, setUsers] = useState<User[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState<UserFormData>({
    username: '',
    email: '',
    full_name: '',
    password: '',
    is_active: true,
    is_superuser: false
  });

  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<{ type: 'school' | 'user'; id: string } | null>(null);

  // Role management state
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [userRoles, setUserRoles] = useState<Record<string, UserSchoolRole[]>>({});
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [roleModalUser, setRoleModalUser] = useState<User | null>(null);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('seller');
  const [loadingRoles, setLoadingRoles] = useState<string | null>(null);

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
        apiClient.get<School[]>('/schools'),
        apiClient.get<User[]>('/users')
      ]);

      setSchools(schoolsRes.data);
      setUsers(usersRes.data);
    } catch (err: any) {
      console.error('Error loading admin data:', err);
      setError(err.response?.data?.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  // School handlers
  const handleSaveSchool = async () => {
    if (!schoolForm.code || !schoolForm.name) return;

    try {
      setSubmitting(true);
      if (editingSchool) {
        await apiClient.patch(`/schools/${editingSchool.id}`, schoolForm);
      } else {
        await apiClient.post('/schools', schoolForm);
      }
      setShowSchoolModal(false);
      setEditingSchool(null);
      resetSchoolForm();
      await loadData();
      await loadSchools();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al guardar colegio');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditSchool = (school: School) => {
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

  const handleDeleteSchool = async (id: string) => {
    try {
      setSubmitting(true);
      await apiClient.delete(`/schools/${id}`);
      setConfirmDelete(null);
      await loadData();
      await loadSchools();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar colegio');
    } finally {
      setSubmitting(false);
    }
  };

  const resetSchoolForm = () => {
    setSchoolForm({ code: '', name: '', address: '', phone: '', email: '' });
  };

  // User handlers
  const handleSaveUser = async () => {
    if (!userForm.username || !userForm.email) return;

    try {
      setSubmitting(true);
      setError(null);

      if (editingUser) {
        // For updates, only send changed fields
        const updatePayload: Record<string, unknown> = {};
        if (userForm.username !== editingUser.username) updatePayload.username = userForm.username;
        if (userForm.email !== editingUser.email) updatePayload.email = userForm.email;
        if (userForm.full_name !== (editingUser.full_name || '')) updatePayload.full_name = userForm.full_name || null;
        if (userForm.is_active !== editingUser.is_active) updatePayload.is_active = userForm.is_active;
        if (userForm.password) updatePayload.password = userForm.password;

        await apiClient.put(`/users/${editingUser.id}`, updatePayload);
      } else {
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
    } catch (err: any) {
      console.error('Error saving user:', err.response?.data);
      // Handle validation errors from backend
      const detail = err.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Pydantic validation errors
        const messages = detail.map((e: { msg: string; loc: string[] }) =>
          `${e.loc[e.loc.length - 1]}: ${e.msg}`
        ).join(', ');
        setError(messages);
      } else if (typeof detail === 'string') {
        setError(detail);
      } else {
        setError('Error al guardar usuario');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditUser = (user: User) => {
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

  const handleDeleteUser = async (id: string) => {
    try {
      setSubmitting(true);
      await apiClient.delete(`/users/${id}`);
      setConfirmDelete(null);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar usuario');
    } finally {
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
  const loadUserRoles = async (userId: string) => {
    try {
      setLoadingRoles(userId);
      const res = await apiClient.get<UserSchoolRole[]>(`/users/${userId}/schools`);
      setUserRoles(prev => ({ ...prev, [userId]: res.data }));
    } catch (err: any) {
      console.error('Error loading user roles:', err);
      setError('Error al cargar roles del usuario');
    } finally {
      setLoadingRoles(null);
    }
  };

  const toggleUserExpand = async (userId: string) => {
    if (expandedUserId === userId) {
      setExpandedUserId(null);
    } else {
      setExpandedUserId(userId);
      if (!userRoles[userId]) {
        await loadUserRoles(userId);
      }
    }
  };

  const openAddRoleModal = (user: User) => {
    setRoleModalUser(user);
    setSelectedSchoolId('');
    setSelectedRole('seller');
    setShowRoleModal(true);
  };

  const handleAddRole = async () => {
    if (!roleModalUser || !selectedSchoolId) return;

    try {
      setSubmitting(true);
      await apiClient.post(
        `/users/${roleModalUser.id}/schools/${selectedSchoolId}/role?role=${selectedRole}`
      );
      setShowRoleModal(false);
      await loadUserRoles(roleModalUser.id);
    } catch (err: any) {
      console.error('Error adding role:', err);
      setError(err.response?.data?.detail || 'Error al agregar rol');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateRole = async (userId: string, schoolId: string, newRole: UserRole) => {
    try {
      setSubmitting(true);
      await apiClient.put(
        `/users/${userId}/schools/${schoolId}/role?role=${newRole}`
      );
      await loadUserRoles(userId);
    } catch (err: any) {
      console.error('Error updating role:', err);
      setError(err.response?.data?.detail || 'Error al actualizar rol');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveRole = async (userId: string, schoolId: string) => {
    try {
      setSubmitting(true);
      await apiClient.delete(`/users/${userId}/schools/${schoolId}/role`);
      await loadUserRoles(userId);
    } catch (err: any) {
      console.error('Error removing role:', err);
      setError(err.response?.data?.detail || 'Error al eliminar rol');
    } finally {
      setSubmitting(false);
    }
  };

  const getSchoolName = (schoolId: string) => {
    const school = schools.find(s => s.id === schoolId);
    return school?.name || 'Colegio desconocido';
  };

  const getAvailableSchoolsForUser = (userId: string) => {
    const existingSchoolIds = (userRoles[userId] || []).map(r => r.school_id);
    return schools.filter(s => !existingSchoolIds.includes(s.id));
  };

  if (!currentUser?.is_superuser) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
          <span className="ml-3 text-gray-600">Cargando panel de administración...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center">
          <ShieldCheck className="w-8 h-8 mr-3 text-amber-600" />
          Panel de Administración
        </h1>
        <p className="text-gray-600 mt-1">Gestión global del sistema (solo superusuarios)</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('schools')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'schools'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Building2 className="w-4 h-4 inline mr-2" />
            Colegios ({schools.length})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'users'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Usuarios ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('system')}
            className={`pb-3 px-1 font-medium text-sm border-b-2 transition-colors ${
              activeTab === 'system'
                ? 'border-amber-600 text-amber-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Sistema
          </button>
        </nav>
      </div>

      {/* Schools Tab */}
      {activeTab === 'schools' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Colegios Registrados</h2>
            <button
              onClick={() => {
                resetSchoolForm();
                setEditingSchool(null);
                setShowSchoolModal(true);
              }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo Colegio
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contacto</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schools.map((school) => (
                  <tr key={school.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-mono text-gray-900">{school.code}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">{school.name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {school.email || school.phone || 'Sin contacto'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        school.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {school.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleEditSchool(school)}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete({ type: 'school', id: school.id })}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Usuarios del Sistema</h2>
            <button
              onClick={() => {
                resetUserForm();
                setEditingUser(null);
                setShowUserModal(true);
              }}
              className="flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nuevo Usuario
            </button>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8"></th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {users.map((user) => (
                  <>
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        {!user.is_superuser && (
                          <button
                            onClick={() => toggleUserExpand(user.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            {loadingRoles === user.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : expandedUserId === user.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{user.username}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.email}</td>
                      <td className="px-6 py-4 text-sm text-gray-500">{user.full_name || '-'}</td>
                      <td className="px-6 py-4">
                        {user.is_superuser ? (
                          <span className="px-2 py-1 text-xs rounded-full bg-amber-100 text-amber-800">
                            Superusuario
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                            Usuario
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          user.is_active
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.is_active ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditUser(user)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                          title="Editar usuario"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!user.is_superuser && (
                          <button
                            onClick={() => openAddRoleModal(user)}
                            className="text-purple-600 hover:text-purple-800 mr-3"
                            title="Agregar rol"
                          >
                            <UserCog className="w-4 h-4" />
                          </button>
                        )}
                        {user.id !== currentUser?.id && (
                          <button
                            onClick={() => setConfirmDelete({ type: 'user', id: user.id })}
                            className="text-red-600 hover:text-red-800"
                            title="Eliminar usuario"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Expanded roles row */}
                    {expandedUserId === user.id && !user.is_superuser && (
                      <tr key={`${user.id}-roles`} className="bg-gray-50">
                        <td colSpan={7} className="px-6 py-4">
                          <div className="ml-8">
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                                <UserCog className="w-4 h-4" />
                                Roles por Colegio
                              </h4>
                              <button
                                onClick={() => openAddRoleModal(user)}
                                className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Agregar Acceso
                              </button>
                            </div>
                            {(userRoles[user.id] || []).length === 0 ? (
                              <p className="text-sm text-gray-500 italic">
                                Este usuario no tiene acceso a ningún colegio
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {(userRoles[user.id] || []).map((role) => (
                                  <div
                                    key={role.id}
                                    className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border"
                                  >
                                    <div className="flex items-center gap-3">
                                      <Building2 className="w-4 h-4 text-gray-400" />
                                      <span className="text-sm font-medium">{getSchoolName(role.school_id)}</span>
                                      <span className={`px-2 py-0.5 text-xs rounded-full ${ROLE_COLORS[role.role]}`}>
                                        {ROLE_LABELS[role.role]}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={role.role}
                                        onChange={(e) => handleUpdateRole(user.id, role.school_id, e.target.value as UserRole)}
                                        className="text-xs border rounded px-2 py-1"
                                        disabled={submitting}
                                      >
                                        <option value="owner">Propietario</option>
                                        <option value="admin">Administrador</option>
                                        <option value="seller">Vendedor</option>
                                        <option value="viewer">Solo Lectura</option>
                                      </select>
                                      <button
                                        onClick={() => handleRemoveRole(user.id, role.school_id)}
                                        className="text-red-500 hover:text-red-700"
                                        disabled={submitting}
                                        title="Quitar acceso"
                                      >
                                        <X className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* Role info box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">Tipos de Roles</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.owner}`}>Propietario</span>
                <p className="text-xs text-gray-600 mt-1">Acceso completo + gestión usuarios</p>
              </div>
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.admin}`}>Administrador</span>
                <p className="text-xs text-gray-600 mt-1">Ventas, inventario, reportes</p>
              </div>
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.seller}`}>Vendedor</span>
                <p className="text-xs text-gray-600 mt-1">Crear ventas, clientes, pedidos</p>
              </div>
              <div>
                <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS.viewer}`}>Solo Lectura</span>
                <p className="text-xs text-gray-600 mt-1">Ver información sin modificar</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* System Tab */}
      {activeTab === 'system' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2 text-gray-600" />
              Estado del Sistema
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Colegios registrados:</span>
                <span className="font-medium">{schools.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Usuarios totales:</span>
                <span className="font-medium">{users.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Superusuarios:</span>
                <span className="font-medium">{users.filter(u => u.is_superuser).length}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <RefreshCw className="w-5 h-5 mr-2 text-gray-600" />
              Acciones del Sistema
            </h3>
            <div className="space-y-3">
              <button
                onClick={loadData}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Recargar Datos
              </button>
              <button
                onClick={() => loadSchools()}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <Building2 className="w-4 h-4" />
                Sincronizar Colegios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* School Modal */}
      {showSchoolModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingSchool ? 'Editar Colegio' : 'Nuevo Colegio'}
              </h3>
              <button onClick={() => setShowSchoolModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código *</label>
                  <input
                    type="text"
                    value={schoolForm.code}
                    onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    placeholder="IE-001"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={schoolForm.name}
                    onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                    placeholder="Nombre del colegio"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={schoolForm.phone}
                    onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={schoolForm.email}
                    onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowSchoolModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSchool}
                disabled={submitting || !schoolForm.code || !schoolForm.name}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                {editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}
              </h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario *</label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña {editingUser ? '(dejar vacío para no cambiar)' : '*'}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                  placeholder={editingUser ? '' : 'Mínimo 8 caracteres'}
                />
                {!editingUser && (
                  <p className="mt-1 text-xs text-gray-500">
                    Debe incluir: mayúscula, minúscula y número
                  </p>
                )}
              </div>
              <div className="flex items-center gap-6">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userForm.is_active}
                    onChange={(e) => setUserForm({ ...userForm, is_active: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Activo</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={userForm.is_superuser}
                    onChange={(e) => setUserForm({ ...userForm, is_superuser: e.target.checked })}
                    className="w-4 h-4 text-amber-600 rounded"
                  />
                  <span className="text-sm text-gray-700">Superusuario</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={submitting || !userForm.username || !userForm.email}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Save className="w-4 h-4" />
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showRoleModal && roleModalUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-semibold">
                Agregar Acceso a Colegio
              </h3>
              <button onClick={() => setShowRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-sm text-gray-600">Usuario:</p>
                <p className="font-medium">{roleModalUser.username} ({roleModalUser.email})</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Colegio *</label>
                <select
                  value={selectedSchoolId}
                  onChange={(e) => setSelectedSchoolId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="">Seleccionar colegio...</option>
                  {getAvailableSchoolsForUser(roleModalUser.id).map((school) => (
                    <option key={school.id} value={school.id}>
                      {school.code} - {school.name}
                    </option>
                  ))}
                </select>
                {getAvailableSchoolsForUser(roleModalUser.id).length === 0 && (
                  <p className="mt-1 text-xs text-amber-600">
                    Este usuario ya tiene acceso a todos los colegios disponibles
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500"
                >
                  <option value="owner">Propietario - Acceso completo + gestión usuarios</option>
                  <option value="admin">Administrador - Ventas, inventario, reportes</option>
                  <option value="seller">Vendedor - Crear ventas, clientes, pedidos</option>
                  <option value="viewer">Solo Lectura - Ver información</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t bg-gray-50 rounded-b-xl">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddRole}
                disabled={submitting || !selectedSchoolId}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <UserCog className="w-4 h-4" />
                Agregar Acceso
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Confirmar Eliminación</h3>
                <p className="text-sm text-gray-500">
                  Esta acción no se puede deshacer
                </p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              ¿Está seguro que desea eliminar este {confirmDelete.type === 'school' ? 'colegio' : 'usuario'}?
              {confirmDelete.type === 'school' && (
                <span className="block mt-2 text-sm text-red-600">
                  Esto eliminará también todos los datos asociados (ventas, productos, clientes, etc.)
                </span>
              )}
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (confirmDelete.type === 'school') {
                    handleDeleteSchool(confirmDelete.id);
                  } else {
                    handleDeleteUser(confirmDelete.id);
                  }
                }}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
