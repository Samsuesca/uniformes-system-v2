'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Package,
  Filter,
  X,
  Plus as PlusIcon,
  Minus,
  Check,
} from 'lucide-react';
import schoolService from '@/lib/services/schoolService';
import productService from '@/lib/services/productService';
import type { School, Product, GarmentType } from '@/lib/api';

export default function ProductsPage() {
  const [schools, setSchools] = useState<School[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSchool, setSelectedSchool] = useState<string>('all');
  const [selectedGarmentType, setSelectedGarmentType] = useState<string>('all');
  const [stockFilter, setStockFilter] = useState<string>('all');
  const [showGlobalOnly, setShowGlobalOnly] = useState(false);

  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    size: '',
    price: 0,
    stock: 0,
    garment_type_id: '',
    image_url: '',
    school_id: '',
    is_global: false,
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Inventory modal
  const [showInventoryModal, setShowInventoryModal] = useState(false);
  const [inventoryProduct, setInventoryProduct] = useState<Product | null>(null);
  const [inventoryData, setInventoryData] = useState({
    adjustment_type: 'add' as 'add' | 'remove' | 'set',
    quantity: 0,
    reason: '',
  });

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const schoolsData = await schoolService.list({ include_inactive: false });
      setSchools(schoolsData);

      // Load products from all schools + global
      const allProducts: Product[] = [];
      const allGarmentTypes: GarmentType[] = [];

      // Load global products
      try {
        const globalProducts = await productService.listGlobal({ limit: 500 });
        allProducts.push(...globalProducts.map(p => ({ ...p, is_global: true })));
      } catch (e) {
        console.error('Error loading global products:', e);
      }

      // Load products and garment types from each school
      for (const school of schoolsData) {
        try {
          const schoolProducts = await productService.listBySchool(school.id, { limit: 500 });
          allProducts.push(...schoolProducts.map(p => ({ ...p, school_id: school.id, is_global: false })));

          const schoolGarmentTypes = await productService.listGarmentTypes(school.id);
          schoolGarmentTypes.forEach(gt => {
            if (!allGarmentTypes.find(t => t.id === gt.id)) {
              allGarmentTypes.push(gt);
            }
          });
        } catch (e) {
          console.error(`Error loading products for school ${school.name}:`, e);
        }
      }

      setProducts(allProducts);
      setGarmentTypes(allGarmentTypes);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter products
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSchool =
      selectedSchool === 'all' ||
      (selectedSchool === 'global' && product.is_global) ||
      product.school_id === selectedSchool;

    const matchesGarmentType =
      selectedGarmentType === 'all' ||
      product.garment_type_id === selectedGarmentType;

    const matchesStock =
      stockFilter === 'all' ||
      (stockFilter === 'in_stock' && product.stock > 0) ||
      (stockFilter === 'low_stock' && product.stock > 0 && product.stock <= 5) ||
      (stockFilter === 'out_of_stock' && product.stock === 0);

    const matchesGlobal = !showGlobalOnly || product.is_global;

    return matchesSearch && matchesSchool && matchesGarmentType && matchesStock && matchesGlobal;
  });

  const getSchoolName = (schoolId: string | undefined) => {
    if (!schoolId) return 'Global';
    const school = schools.find((s) => s.id === schoolId);
    return school?.name || 'Desconocido';
  };

  const openCreateModal = () => {
    setEditingProduct(null);
    setFormData({
      code: '',
      name: '',
      size: '',
      price: 0,
      stock: 0,
      garment_type_id: '',
      image_url: '',
      school_id: schools[0]?.id || '',
      is_global: false,
    });
    setFormError(null);
    setShowModal(true);
  };

  const openEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      code: product.code,
      name: product.name,
      size: product.size,
      price: product.price,
      stock: product.stock,
      garment_type_id: product.garment_type_id || '',
      image_url: product.image_url || '',
      school_id: product.school_id || '',
      is_global: product.is_global,
    });
    setFormError(null);
    setShowModal(true);
  };

  const openInventoryModal = (product: Product) => {
    setInventoryProduct(product);
    setInventoryData({
      adjustment_type: 'add',
      quantity: 0,
      reason: '',
    });
    setShowInventoryModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSaving(true);

    try {
      const productData = {
        code: formData.code,
        name: formData.name,
        size: formData.size,
        price: formData.price,
        stock: formData.stock,
        garment_type_id: formData.garment_type_id || undefined,
        image_url: formData.image_url || undefined,
      };

      if (editingProduct) {
        if (editingProduct.is_global) {
          await productService.updateGlobal(editingProduct.id, productData);
        } else {
          await productService.update(editingProduct.school_id!, editingProduct.id, productData);
        }
      } else {
        if (formData.is_global) {
          await productService.createGlobal(productData);
        } else {
          await productService.create(formData.school_id, productData);
        }
      }
      setShowModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleInventorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryProduct || !inventoryProduct.school_id) return;

    try {
      setSaving(true);
      await productService.adjustInventory(
        inventoryProduct.school_id,
        inventoryProduct.id,
        inventoryData
      );
      setShowInventoryModal(false);
      loadData();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || 'Error al ajustar inventario');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (product: Product) => {
    if (!confirm(`¿Estás seguro de eliminar "${product.name}"?`)) return;

    try {
      if (product.is_global) {
        await productService.deleteGlobal(product.id);
      } else {
        await productService.delete(product.school_id!, product.id);
      }
      loadData();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Error al eliminar');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedSchool('all');
    setSelectedGarmentType('all');
    setStockFilter('all');
    setShowGlobalOnly(false);
  };

  const hasActiveFilters =
    searchTerm || selectedSchool !== 'all' || selectedGarmentType !== 'all' || stockFilter !== 'all' || showGlobalOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Productos e Inventario
          </h1>
          <p className="text-slate-600 mt-1">
            {filteredProducts.length} de {products.length} productos
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={loadData}
            disabled={loading}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
          <button onClick={openCreateModal} className="btn-primary flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Nuevo Producto
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <Filter className="w-4 h-4" />
          Filtros
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto text-brand-600 hover:text-brand-700 flex items-center gap-1"
            >
              <X className="w-4 h-4" />
              Limpiar
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="admin-input pl-10"
            />
          </div>

          {/* School Filter */}
          <select
            value={selectedSchool}
            onChange={(e) => setSelectedSchool(e.target.value)}
            className="admin-input"
          >
            <option value="all">Todos los colegios</option>
            <option value="global">Solo Globales</option>
            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          {/* Garment Type Filter */}
          <select
            value={selectedGarmentType}
            onChange={(e) => setSelectedGarmentType(e.target.value)}
            className="admin-input"
          >
            <option value="all">Todos los tipos</option>
            {garmentTypes.map((type) => (
              <option key={type.id} value={type.id}>
                {type.name}
              </option>
            ))}
          </select>

          {/* Stock Filter */}
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="admin-input"
          >
            <option value="all">Todo el stock</option>
            <option value="in_stock">En stock</option>
            <option value="low_stock">Stock bajo (≤5)</option>
            <option value="out_of_stock">Sin stock</option>
          </select>
        </div>
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
                <th>Talla</th>
                <th>Precio</th>
                <th>Stock</th>
                <th>Colegio</th>
                <th>Tipo</th>
                <th className="text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-brand-500"></div>
                    <p className="mt-2 text-slate-500">Cargando productos...</p>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-2 text-slate-300" />
                    No se encontraron productos
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="font-mono text-sm">{product.code}</td>
                    <td className="font-medium">{product.name}</td>
                    <td>{product.size}</td>
                    <td className="font-medium text-green-600">
                      {formatCurrency(product.price)}
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          product.stock === 0
                            ? 'badge-error'
                            : product.stock <= 5
                            ? 'badge-warning'
                            : 'badge-success'
                        }`}
                      >
                        {product.stock}
                      </span>
                    </td>
                    <td>
                      {product.is_global ? (
                        <span className="badge bg-purple-100 text-purple-800">Global</span>
                      ) : (
                        <span className="text-sm text-slate-600">
                          {getSchoolName(product.school_id)}
                        </span>
                      )}
                    </td>
                    <td className="text-sm text-slate-600">
                      {product.garment_type_name || '-'}
                    </td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        {!product.is_global && (
                          <button
                            onClick={() => openInventoryModal(product)}
                            className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Ajustar inventario"
                          >
                            <Package className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => openEditModal(product)}
                          className="p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(product)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Product Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl my-8">
            <h2 className="text-xl font-bold text-slate-900 mb-6">
              {editingProduct ? 'Editar Producto' : 'Nuevo Producto'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {!editingProduct && (
                <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      checked={!formData.is_global}
                      onChange={() => setFormData({ ...formData, is_global: false })}
                      className="w-4 h-4 text-brand-500"
                    />
                    <div>
                      <span className="font-medium">Producto de Colegio</span>
                      <p className="text-xs text-slate-500">Solo disponible para un colegio específico</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="productType"
                      checked={formData.is_global}
                      onChange={() => setFormData({ ...formData, is_global: true, school_id: '' })}
                      className="w-4 h-4 text-brand-500"
                    />
                    <div>
                      <span className="font-medium">Producto Global</span>
                      <p className="text-xs text-slate-500">Disponible para todos los colegios</p>
                    </div>
                  </label>
                </div>
              )}

              {!formData.is_global && !editingProduct && (
                <div>
                  <label className="admin-label">Colegio *</label>
                  <select
                    value={formData.school_id}
                    onChange={(e) => setFormData({ ...formData, school_id: e.target.value })}
                    className="admin-input"
                    required={!formData.is_global}
                  >
                    <option value="">Seleccionar colegio</option>
                    {schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Código *</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="admin-input"
                    required
                    placeholder="COD001"
                  />
                </div>
                <div>
                  <label className="admin-label">Talla *</label>
                  <input
                    type="text"
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="admin-input"
                    required
                    placeholder="M, L, XL..."
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">Nombre *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="admin-input"
                  required
                  placeholder="Nombre del producto"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="admin-label">Precio (COP) *</label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="admin-input"
                    required
                    min={0}
                    step={100}
                  />
                </div>
                <div>
                  <label className="admin-label">Stock Inicial</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                    className="admin-input"
                    min={0}
                  />
                </div>
              </div>

              <div>
                <label className="admin-label">URL de Imagen</label>
                <input
                  type="url"
                  value={formData.image_url}
                  onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                  className="admin-input"
                  placeholder="https://..."
                />
              </div>

              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : editingProduct ? 'Guardar Cambios' : 'Crear Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Inventory Modal */}
      {showInventoryModal && inventoryProduct && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900 mb-2">Ajustar Inventario</h2>
            <p className="text-slate-600 mb-6">
              <strong>{inventoryProduct.name}</strong> - Stock actual: {inventoryProduct.stock}
            </p>

            <form onSubmit={handleInventorySubmit} className="space-y-4">
              <div>
                <label className="admin-label">Tipo de Ajuste</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'add', label: 'Agregar', icon: PlusIcon, color: 'text-green-600 border-green-500 bg-green-50' },
                    { value: 'remove', label: 'Quitar', icon: Minus, color: 'text-red-600 border-red-500 bg-red-50' },
                    { value: 'set', label: 'Establecer', icon: Check, color: 'text-blue-600 border-blue-500 bg-blue-50' },
                  ].map((type) => {
                    const Icon = type.icon;
                    const isSelected = inventoryData.adjustment_type === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() =>
                          setInventoryData({
                            ...inventoryData,
                            adjustment_type: type.value as typeof inventoryData.adjustment_type,
                          })
                        }
                        className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                          isSelected ? type.color : 'border-slate-200 text-slate-600'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {type.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="admin-label">Cantidad</label>
                <input
                  type="number"
                  value={inventoryData.quantity}
                  onChange={(e) =>
                    setInventoryData({ ...inventoryData, quantity: parseInt(e.target.value) || 0 })
                  }
                  className="admin-input"
                  min={0}
                  required
                />
              </div>

              <div>
                <label className="admin-label">Razón (opcional)</label>
                <input
                  type="text"
                  value={inventoryData.reason}
                  onChange={(e) => setInventoryData({ ...inventoryData, reason: e.target.value })}
                  className="admin-input"
                  placeholder="Motivo del ajuste..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowInventoryModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancelar
                </button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Guardando...' : 'Aplicar Ajuste'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
