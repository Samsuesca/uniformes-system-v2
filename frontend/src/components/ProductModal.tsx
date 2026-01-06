/**
 * Product Modal - Create/Edit Product Form
 */
import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';
import { extractErrorMessage } from '../utils/api-client';
import type { Product, GarmentType } from '../types/api';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  product?: Product | null;
}

export default function ProductModal({ isOpen, onClose, onSuccess, schoolId, product }: ProductModalProps) {
  const [loading, setLoading] = useState(false);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    garment_type_id: '',
    name: '',
    size: '',
    color: '',
    gender: 'Unisex',
    price: '',
    is_active: true,
  });

  useEffect(() => {
    if (isOpen) {
      loadGarmentTypes();
      if (product) {
        // Edit mode
        setFormData({
          garment_type_id: product.garment_type_id || '',
          name: product.name || '',
          size: product.size,
          color: product.color || '',
          gender: product.gender || 'Unisex',
          price: product.price.toString(),
          is_active: product.is_active ?? true,
        });
      } else {
        // Create mode - reset form
        setFormData({
          garment_type_id: '',
          name: '',
          size: '',
          color: '',
          gender: 'Unisex',
          price: '',
          is_active: true,
        });
      }
      setError(null);
    }
  }, [isOpen, product]);

  const loadGarmentTypes = async () => {
    try {
      const types = await productService.getGarmentTypes(schoolId);
      setGarmentTypes(types);
    } catch (err: any) {
      console.error('Error loading garment types:', err);
      setError('Error al cargar tipos de prenda');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // === VALIDACIONES FRONTEND ===
    if (!schoolId) {
      setError('⚠️ Debes seleccionar un colegio primero');
      return;
    }
    if (!formData.garment_type_id) {
      setError('⚠️ Selecciona un tipo de prenda');
      return;
    }
    if (!formData.name?.trim()) {
      setError('⚠️ El nombre del producto es requerido');
      return;
    }
    if (!formData.size?.trim()) {
      setError('⚠️ La talla es requerida');
      return;
    }
    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      setError('⚠️ El precio debe ser un número mayor a 0');
      return;
    }

    setLoading(true);

    try {
      const data = {
        ...formData,
        price,
      };

      if (product) {
        // Update existing product
        await productService.updateProduct(schoolId, product.id, data);
      } else {
        // Create new product
        await productService.createProduct(schoolId, data);
      }

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error('Error saving product:', err);
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-800">
              {product ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>
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
                <p className="text-sm text-red-700 whitespace-pre-line">{error}</p>
              </div>
            )}

            {/* Garment Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Prenda *
              </label>
              <select
                name="garment_type_id"
                value={formData.garment_type_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Selecciona un tipo</option>
                {garmentTypes.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre del Producto *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                placeholder="Ej: Camisa Polo Azul"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Size and Color */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Talla *
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  required
                  placeholder="Ej: M, 14, 32"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  placeholder="Ej: Azul"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Gender */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género
              </label>
              <select
                name="gender"
                value={formData.gender}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="Unisex">Unisex</option>
                <option value="Masculino">Masculino</option>
                <option value="Femenino">Femenino</option>
              </select>
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Precio *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                  $
                </span>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>
            </div>

            {/* Active Status - Only show when editing */}
            {product && (
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {formData.is_active ? 'Producto Activo' : 'Producto Inactivo'}
                  </span>
                  <p className="text-xs text-gray-500">
                    {formData.is_active
                      ? 'El producto está visible y disponible para ventas'
                      : 'El producto está oculto y no se puede vender'}
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
                  product ? 'Actualizar' : 'Crear Producto'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
