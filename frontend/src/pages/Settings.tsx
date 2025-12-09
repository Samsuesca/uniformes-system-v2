/**
 * Settings Page - Application and school settings
 */
import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import {
  Settings as SettingsIcon, School, User, Bell, Lock, Server,
  CheckCircle, XCircle, X, Plus, Edit2, Trash2, Users,
  Building2, Loader2, AlertCircle, Eye, EyeOff, Save
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import { ENVIRONMENTS, ENVIRONMENT_LABELS, ENVIRONMENT_DESCRIPTIONS, type EnvironmentKey } from '../config/environments';
import { userService, type User as UserType, type UserCreate } from '../services/userService';
import { schoolService, type School as SchoolType, type SchoolCreate, type SchoolUpdate } from '../services/schoolService';

type ModalType = 'editProfile' | 'changePassword' | 'manageSchools' | 'manageUsers' | 'createSchool' | 'editSchool' | 'createUser' | null;

export default function Settings() {
  const { user, updateUser } = useAuthStore();
  const { apiUrl, setApiUrl, isOnline } = useConfigStore();
  const [customUrl, setCustomUrl] = useState(apiUrl);
  const [activeModal, setActiveModal] = useState<ModalType>(null);

  // Profile edit state
  const [profileForm, setProfileForm] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
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
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);

  // Schools management state
  const [schools, setSchools] = useState<SchoolType[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [selectedSchool, setSelectedSchool] = useState<SchoolType | null>(null);
  const [schoolForm, setSchoolForm] = useState<SchoolCreate>({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [schoolSaving, setSchoolSaving] = useState(false);
  const [schoolError, setSchoolError] = useState<string | null>(null);

  // Users management state
  const [users, setUsers] = useState<UserType[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userForm, setUserForm] = useState<UserCreate>({
    username: '',
    email: '',
    password: '',
    full_name: '',
    is_superuser: false
  });
  const [userSaving, setUserSaving] = useState(false);
  const [userError, setUserError] = useState<string | null>(null);

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
    if (activeModal === 'manageSchools' || activeModal === 'createSchool' || activeModal === 'editSchool') {
      loadSchools();
    }
  }, [activeModal]);

  // Load users when modal opens
  useEffect(() => {
    if (activeModal === 'manageUsers' || activeModal === 'createUser') {
      loadUsers();
    }
  }, [activeModal]);

  const loadSchools = async () => {
    setSchoolsLoading(true);
    try {
      const data = await schoolService.getSchools(false); // Include inactive
      setSchools(data);
    } catch (err: any) {
      console.error('Error loading schools:', err);
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Profile handlers
  const handleSaveProfile = async () => {
    if (!user) return;
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
    } catch (err: any) {
      setProfileError(err.response?.data?.detail || 'Error al actualizar perfil');
    } finally {
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
    } catch (err: any) {
      setPasswordError(err.response?.data?.detail || 'Error al cambiar contraseña');
    } finally {
      setPasswordLoading(false);
    }
  };

  // School handlers
  const handleOpenEditSchool = (school: SchoolType) => {
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
      } else if (selectedSchool) {
        const updateData: SchoolUpdate = {
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
    } catch (err: any) {
      setSchoolError(err.response?.data?.detail || 'Error al guardar colegio');
    } finally {
      setSchoolSaving(false);
    }
  };

  const handleToggleSchoolActive = async (school: SchoolType) => {
    try {
      if (school.is_active) {
        await schoolService.deleteSchool(school.id);
      } else {
        await schoolService.activateSchool(school.id);
      }
      await loadSchools();
    } catch (err: any) {
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
    } catch (err: any) {
      setUserError(err.response?.data?.detail || 'Error al crear usuario');
    } finally {
      setUserSaving(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    try {
      await userService.deleteUser(userId);
      await loadUsers();
    } catch (err: any) {
      console.error('Error deleting user:', err);
      alert(err.response?.data?.detail || 'Error al eliminar usuario');
    }
  };

  const closeModal = () => {
    setActiveModal(null);
    setProfileError(null);
    setPasswordError(null);
    setSchoolError(null);
    setUserError(null);
    setProfileSuccess(false);
    setPasswordSuccess(false);
    setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    setSchoolForm({ code: '', name: '', email: '', phone: '', address: '' });
    setUserForm({ username: '', email: '', password: '', full_name: '', is_superuser: false });
    setSelectedSchool(null);
  };

  return (
    <Layout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Configuración</h1>
        <p className="text-gray-600 mt-1">Administra la configuración del sistema</p>
      </div>

      {/* Server Configuration - Full Width */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Server className="w-5 h-5 text-purple-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Configuración del Servidor</h2>
          </div>
          <div className="flex items-center">
            {isOnline ? (
              <div className="flex items-center text-green-600">
                <CheckCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Conectado</span>
              </div>
            ) : (
              <div className="flex items-center text-red-600">
                <XCircle className="w-4 h-4 mr-1" />
                <span className="text-sm">Desconectado</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Selecciona el servidor al que deseas conectarte. Esto te permite trabajar en modo local,
            conectarte a un servidor en tu red local, o usar el servidor en la nube.
          </p>

          {/* Environment Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Entorno
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {(Object.keys(ENVIRONMENTS) as EnvironmentKey[]).map((env) => (
                <button
                  key={env}
                  onClick={() => {
                    const url = ENVIRONMENTS[env];
                    setApiUrl(url);
                    setCustomUrl(url);
                  }}
                  className={`p-4 border-2 rounded-lg text-left transition ${
                    apiUrl === ENVIRONMENTS[env]
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="font-semibold text-gray-800 mb-1">
                    {ENVIRONMENT_LABELS[env]}
                  </div>
                  <div className="text-xs text-gray-600">
                    {ENVIRONMENT_DESCRIPTIONS[env]}
                  </div>
                  <div className="text-xs text-gray-500 mt-2 font-mono break-all">
                    {ENVIRONMENTS[env]}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              URL Personalizada
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                placeholder="http://192.168.1.100:8000"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={() => setApiUrl(customUrl)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
              >
                Aplicar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Ingresa la dirección IP y puerto de tu servidor personalizado
            </p>
          </div>

          {/* Current URL Display */}
          <div className="bg-gray-50 p-3 rounded-lg">
            <div className="text-sm font-medium text-gray-700">Servidor Actual:</div>
            <div className="text-sm text-gray-600 font-mono mt-1">{apiUrl}/api/v1</div>
          </div>
        </div>
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Profile */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <User className="w-5 h-5 text-blue-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Perfil de Usuario</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-600">Nombre de usuario</label>
              <p className="text-gray-800 font-medium">{user?.username}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Nombre completo</label>
              <p className="text-gray-800 font-medium">{user?.full_name || 'No especificado'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Email</label>
              <p className="text-gray-800 font-medium">{user?.email}</p>
            </div>
            <div>
              <label className="text-sm text-gray-600">Rol</label>
              <p className="text-gray-800 font-medium">
                {user?.is_superuser ? (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">Superusuario</span>
                ) : (
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Usuario</span>
                )}
              </p>
            </div>
            <button
              onClick={() => setActiveModal('editProfile')}
              className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Editar Perfil
            </button>
          </div>
        </div>

        {/* Security */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Lock className="w-5 h-5 text-red-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Seguridad</h2>
          </div>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Cambia tu contraseña para mantener tu cuenta segura.
            </p>
            <button
              onClick={() => setActiveModal('changePassword')}
              className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center"
            >
              <Lock className="w-4 h-4 mr-2" />
              Cambiar Contraseña
            </button>
          </div>
        </div>

        {/* School Settings (only for superusers) */}
        {user?.is_superuser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <School className="w-5 h-5 text-green-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Colegios</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Gestiona los colegios registrados en el sistema.
              </p>
              <button
                onClick={() => setActiveModal('manageSchools')}
                className="mt-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Administrar Colegios
              </button>
            </div>
          </div>
        )}

        {/* User Management (only for superusers) */}
        {user?.is_superuser && (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <div className="flex items-center mb-4">
              <Users className="w-5 h-5 text-indigo-600 mr-2" />
              <h2 className="text-lg font-semibold text-gray-800">Usuarios</h2>
            </div>
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Gestiona los usuarios del sistema y sus permisos.
              </p>
              <button
                onClick={() => setActiveModal('manageUsers')}
                className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center"
              >
                <Users className="w-4 h-4 mr-2" />
                Administrar Usuarios
              </button>
            </div>
          </div>
        )}

        {/* Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center mb-4">
            <Bell className="w-5 h-5 text-yellow-600 mr-2" />
            <h2 className="text-lg font-semibold text-gray-800">Notificaciones</h2>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Stock bajo</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Nuevas ventas</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700">Encargos listos</span>
              <input type="checkbox" className="w-4 h-4 text-blue-600" defaultChecked />
            </div>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
        <div className="flex items-start">
          <SettingsIcon className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-blue-800">Sistema Uniformes v2.0</h3>
            <p className="mt-1 text-sm text-blue-700">
              Conectado a: <span className="font-mono">{apiUrl}</span>
              <br />
              Usuario: <span className="font-medium">{user?.username}</span>
              {user?.is_superuser && <span className="ml-2 text-purple-600">(Superusuario)</span>}
            </p>
          </div>
        </div>
      </div>

      {/* ========== MODALS ========== */}

      {/* Edit Profile Modal */}
      {activeModal === 'editProfile' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Editar Perfil</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {profileError}
                </div>
              )}
              {profileSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Perfil actualizado correctamente
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre de usuario
                </label>
                <input
                  type="text"
                  value={user?.username || ''}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-500"
                />
                <p className="text-xs text-gray-500 mt-1">El nombre de usuario no se puede cambiar</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={profileForm.full_name}
                  onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Tu nombre completo"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="tu@email.com"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveProfile}
                disabled={profileLoading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center disabled:opacity-50"
              >
                {profileLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Change Password Modal */}
      {activeModal === 'changePassword' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Cambiar Contraseña</h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center">
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Contraseña cambiada correctamente
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña actual
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.current ? 'text' : 'password'}
                    value={passwordForm.current_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, current_password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, current: !showPasswords.current })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.new ? 'text' : 'password'}
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, new_password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, new: !showPasswords.new })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar nueva contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPasswords.confirm ? 'text' : 'password'}
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm({ ...passwordForm, confirm_password: e.target.value })}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords({ ...showPasswords, confirm: !showPasswords.confirm })}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPasswords.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleChangePassword}
                disabled={passwordLoading}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition flex items-center disabled:opacity-50"
              >
                {passwordLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4 mr-2" />
                )}
                Cambiar Contraseña
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Schools Modal */}
      {activeModal === 'manageSchools' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Administrar Colegios</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSchoolForm({ code: '', name: '', email: '', phone: '', address: '' });
                    setActiveModal('createSchool');
                  }}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo
                </button>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {schoolsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  <span className="ml-2 text-gray-600">Cargando colegios...</span>
                </div>
              ) : schools.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay colegios registrados
                </div>
              ) : (
                <div className="space-y-3">
                  {schools.map((school) => (
                    <div
                      key={school.id}
                      className={`p-4 border rounded-lg ${school.is_active ? 'bg-white' : 'bg-gray-50'}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-800">{school.name}</span>
                            <span className="text-xs text-gray-500 font-mono">{school.code}</span>
                            {!school.is_active && (
                              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs">
                                Inactivo
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">
                            {school.email && <span>{school.email}</span>}
                            {school.phone && <span className="ml-3">{school.phone}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleOpenEditSchool(school)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                            title="Editar"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleSchoolActive(school)}
                            className={`p-2 rounded-lg transition ${
                              school.is_active
                                ? 'text-red-600 hover:bg-red-50'
                                : 'text-green-600 hover:bg-green-50'
                            }`}
                            title={school.is_active ? 'Desactivar' : 'Activar'}
                          >
                            {school.is_active ? <XCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit School Modal */}
      {(activeModal === 'createSchool' || activeModal === 'editSchool') && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">
                {activeModal === 'createSchool' ? 'Nuevo Colegio' : 'Editar Colegio'}
              </h3>
              <button onClick={() => setActiveModal('manageSchools')} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {schoolError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {schoolError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código *
                </label>
                <input
                  type="text"
                  value={schoolForm.code}
                  onChange={(e) => setSchoolForm({ ...schoolForm, code: e.target.value.toUpperCase() })}
                  disabled={activeModal === 'editSchool'}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent ${
                    activeModal === 'editSchool' ? 'bg-gray-100 text-gray-500' : ''
                  }`}
                  placeholder="COL-001"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={schoolForm.name}
                  onChange={(e) => setSchoolForm({ ...schoolForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Colegio San José"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={schoolForm.email}
                  onChange={(e) => setSchoolForm({ ...schoolForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="contacto@colegio.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={schoolForm.phone}
                  onChange={(e) => setSchoolForm({ ...schoolForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="(1) 234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={schoolForm.address}
                  onChange={(e) => setSchoolForm({ ...schoolForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Calle 123 #45-67"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal('manageSchools')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveSchool}
                disabled={schoolSaving || !schoolForm.code || !schoolForm.name}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition flex items-center disabled:opacity-50"
              >
                {schoolSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Users Modal */}
      {activeModal === 'manageUsers' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Administrar Usuarios</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModal('createUser')}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo
                </button>
                <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {usersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  <span className="ml-2 text-gray-600">Cargando usuarios...</span>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay usuarios registrados
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuario</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {users.map((u) => (
                        <tr key={u.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="font-medium text-gray-900">{u.username}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {u.full_name || '-'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                            {u.email}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.is_superuser ? (
                              <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs">
                                Superusuario
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                Usuario
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.is_active ? (
                              <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs">
                                Activo
                              </span>
                            ) : (
                              <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs">
                                Inactivo
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {u.id !== user?.id && (
                              <button
                                onClick={() => handleDeleteUser(u.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition"
                                title="Eliminar"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {activeModal === 'createUser' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-semibold">Nuevo Usuario</h3>
              <button onClick={() => setActiveModal('manageUsers')} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              {userError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {userError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Usuario *
                </label>
                <input
                  type="text"
                  value={userForm.username}
                  onChange={(e) => setUserForm({ ...userForm, username: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="juanperez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={userForm.full_name}
                  onChange={(e) => setUserForm({ ...userForm, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Juan Pérez"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="juan@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contraseña *
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Mínimo 6 caracteres"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_superuser"
                  checked={userForm.is_superuser}
                  onChange={(e) => setUserForm({ ...userForm, is_superuser: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
                <label htmlFor="is_superuser" className="ml-2 text-sm text-gray-700">
                  Es superusuario (acceso total)
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t">
              <button
                onClick={() => setActiveModal('manageUsers')}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveUser}
                disabled={userSaving || !userForm.username || !userForm.email || !userForm.password}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition flex items-center disabled:opacity-50"
              >
                {userSaving ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                Crear Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
