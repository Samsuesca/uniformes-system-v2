'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Power,
  PowerOff,
  RefreshCw,
  School as SchoolIcon,
} from 'lucide-react';
import schoolService from '@/lib/services/schoolService';
import type { School } from '@/lib/api';

export default function SchoolsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showInactive, setShowInactive] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingSchool, setEditingSchool] = useState<School | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    email: '',
    phone: '',
    address: '',
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadSchools = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await schoolService.list({ include_inactive: true });
      setSchools(data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar colegios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const filteredSchools = schools.filter((school) => {
    const matchesSearch =
      school.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      school.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesActive = showInactive || school.is_active;
    return matchesSearch && matchesActive;
  });

  const openCreateModal = () => {
    setEditingSchool(null);
    setFormData({ code: '', name: '', email: '', phone: '', address: '' });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (school: School) => {
    setEditingSchool(school);
    setFormData({
      code: school.code,
      name: school.name,
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
    });
    setFormError(null);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      if (editingSchool) {
        await schoolService.update(editingSchool.id, formData);
      } else {
        await schoolService.create(formData);
      }
      setShowModal(false);
      loadSchools();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (school: School) => {
    try {
      if (school.is_active) {
        await schoolService.deactivate(school.id);
      } else {
        await schoolService.activate(school.id);
      }
      loadSchools();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cambiar estado');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Colegios
          </h1>
          <p className="text-slate-600 mt-1">
            Gestiona los colegios registrados en el sistema
          </p>
        </div>
        <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Nuevo Colegio
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o código..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="admin-input pl-10"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="w-4 h-4 rounded border-slate-300 text-brand-500 focus:ring-brand-500"
          />
          <span className="text-sm text-slate-600">Mostrar inactivos</span>
        </label>
        <button
          onClick={loadSchools}
          disabled={loading}
          className="btn-secondary flex items-center gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Email</th>
                <th>Teléfono</th>
                <th>Estado</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-brand-500"></div>
                  </td>
                </tr>
              ) : filteredSchools.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-500">
                    <SchoolIcon className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    No se encontraron colegios
                  </td>
                </tr>
              ) : (
                filteredSchools.map((school) => (
                  <tr key={school.id}>
                    <td className="font-mono text-sm">{school.code}</td>
                    <td className="font-medium">{school.name}</td>
                    <td className="text-slate-600">{school.email || '-'}</td>
                    <td className="text-slate-600">{school.phone || '-'}</td>
                    <td>
                      <span
                        className={`badge ${
                          school.is_active ? 'badge-success' : 'badge-error'
                        }`}
                      >
                        {school.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(school)}
                          className="p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggleActive(school)}
                          className={`p-2 rounded-lg transition-colors ${
                            school.is_active
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={school.is_active ? 'Desactivar' : 'Activar'}
                        >
                          {school.is_active ? (
                            <PowerOff className="w-4 h-4" />
                          ) : (
                            <Power className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingSchool ? 'Editar Colegio' : 'Nuevo Colegio'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    className="admin-input"
                    required
                    placeholder="CODIGO"
                  />
                </div>
                <div>
                  <label className="admin-label">Teléfono</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    className="admin-input"
                    placeholder="3001234567"
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="admin-input"
                  required
                  placeholder="Nombre del colegio"
                />
              </div>

              <div>
                <label className="admin-label">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  className="admin-input"
                  placeholder="colegio@email.com"
                />
              </div>

              <div>
                <label className="admin-label">Dirección</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) =>
                    setFormData({ ...formData, address: e.target.value })
                  }
                  className="admin-input"
                  placeholder="Dirección física"
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="btn-primary flex-1"
                >
                  {saving ? 'Guardando...' : editingSchool ? 'Guardar Cambios' : 'Crear Colegio'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
