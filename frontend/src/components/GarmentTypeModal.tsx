/**
 * GarmentType Modal - Create/Edit Garment Type Form
 * Handles both school-specific and global garment types
 * Access: Admin (school) or Superuser (global)
 */
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';
import type { GarmentType, GlobalGarmentType } from '../types/api';

interface GarmentTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  garmentType?: GarmentType | GlobalGarmentType | null;
  isGlobal: boolean;
  schoolId?: string;
}

export default function GarmentTypeModal({
  isOpen,
  onClose,
  onSuccess,
  garmentType,
  isGlobal,
  schoolId,
}: GarmentTypeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    requires_embroidery: false,
    has_custom_measurements: false,
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      if (garmentType) {
        // Edit mode
        setFormData({
          name: garmentType.name || '',
          description: garmentType.description || '',
          category: garmentType.category || '',
          requires_embroidery: garmentType.requires_embroidery || false,
          has_custom_measurements: garmentType.has_custom_measurements || false,
          is_active: garmentType.is_active ?? true,
        });
      } else {
        // Create mode - reset form
        setFormData({
          name: '',
          description: '',
          category: '',
          requires_embroidery: false,
          has_custom_measurements: false,
          is_active: true,
        });
      }
      setError(null);
    }
  }, [isOpen, garmentType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data: any = {
        name: formData.name.trim(),
      };

      // Optional fields
      if (formData.description.trim()) data.description = formData.description.trim();
      if (formData.category) data.category = formData.category;
      data.requires_embroidery = formData.requires_embroidery;
      data.has_custom_measurements = formData.has_custom_measurements;
      if (garmentType) data.is_active = formData.is_active;

      if (isGlobal) {
        // Global garment type
        if (garmentType) {
          // Update existing
          await productService.updateGlobalGarmentType(garmentType.id, data);
        } else {
          // Create new
          await productService.createGlobalGarmentType(data);
        }
      } else {
        // School-specific garment type
        if (!schoolId) {
          throw new Error('School ID is required for school-specific garment types');
        }

        if (garmentType) {
          // Update existing
          await productService.updateGarmentType(schoolId, garmentType.id, data);
        } else {
          // Create new
          await productService.createGarmentType(schoolId, data);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving garment type:', err);
      setError(err.response?.data?.detail || 'Error al guardar tipo de prenda');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {garmentType ? 'Editar Tipo de Prenda' : 'Nuevo Tipo de Prenda'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {isGlobal
                  ? 'Tipo compartido entre todos los colegios'
                  : 'Tipo específico del colegio'}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Scope indicator */}
            <div className={`${isGlobal ? 'bg-purple-50 border-purple-200' : 'bg-blue-50 border-blue-200'} border rounded-lg p-3`}>
              <p className={`text-sm ${isGlobal ? 'text-purple-700' : 'text-blue-700'}`}>
                <span className="font-medium">Alcance:</span>{' '}
                {isGlobal ? 'Global (todos los colegios)' : 'Específico del colegio'}
              </p>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                minLength={3}
                maxLength={100}
                placeholder="Ej: Camisa, Pantalón, Zapatos"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-500 mt-1">
                Entre 3 y 100 caracteres
              </p>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Descripción opcional del tipo de prenda"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Sin categoría</option>
                <option value="uniforme_diario">Uniforme Diario</option>
                <option value="uniforme_deportivo">Uniforme Deportivo</option>
                <option value="accesorios">Accesorios</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Opcional - Ayuda a organizar los productos
              </p>
            </div>

            {/* Boolean Flags */}
            <div className="space-y-3">
              {/* Requires Embroidery */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="requires_embroidery"
                    checked={formData.requires_embroidery}
                    onChange={(e) => setFormData({ ...formData, requires_embroidery: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Requiere bordado
                  </span>
                  <p className="text-xs text-gray-500">
                    Indica si los productos de este tipo necesitan personalización con bordado
                  </p>
                </div>
              </div>

              {/* Has Custom Measurements */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="has_custom_measurements"
                    checked={formData.has_custom_measurements}
                    onChange={(e) => setFormData({ ...formData, has_custom_measurements: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    Medidas personalizadas
                  </span>
                  <p className="text-xs text-gray-500">
                    Indica si los productos requieren medidas específicas del cliente (ej: Yomber)
                  </p>
                </div>
              </div>
            </div>

            {/* Active Status - Only show when editing */}
            {garmentType && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-500"></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {formData.is_active ? 'Tipo Activo' : 'Tipo Inactivo'}
                  </span>
                  <p className="text-xs text-gray-500">
                    {formData.is_active
                      ? 'El tipo está visible y disponible para crear productos'
                      : 'El tipo está oculto y no se puede usar para nuevos productos'}
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  garmentType ? 'Actualizar Tipo' : 'Crear Tipo de Prenda'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
