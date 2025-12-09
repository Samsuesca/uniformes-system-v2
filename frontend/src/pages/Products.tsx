/**
 * Products Page - List and manage products with inventory
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProductModal from '../components/ProductModal';
import { Package, Plus, Search, AlertCircle, Loader2, Edit2, PackagePlus, X, Save } from 'lucide-react';
import { productService } from '../services/productService';
import { useSchoolStore } from '../stores/schoolStore';
import { useAuthStore } from '../stores/authStore';
import apiClient from '../utils/api-client';
import type { Product } from '../types/api';

interface InventoryAdjustment {
  productId: string;
  productCode: string;
  productName: string;
  currentStock: number;
}

export default function Products() {
  const { currentSchool } = useSchoolStore();
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // Inventory adjustment modal state
  const [inventoryModal, setInventoryModal] = useState<InventoryAdjustment | null>(null);
  const [adjustmentAmount, setAdjustmentAmount] = useState<string>('');
  const [adjustmentReason, setAdjustmentReason] = useState<string>('');
  const [adjustmentType, setAdjustmentType] = useState<'add' | 'remove' | 'set'>('add');
  const [submitting, setSubmitting] = useState(false);

  const schoolId = currentSchool?.id || '';
  const isSuperuser = user?.is_superuser || false;

  useEffect(() => {
    if (schoolId) {
      loadProducts();
    }
  }, [schoolId]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getProducts(schoolId);
      setProducts(data);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.detail || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
    setSelectedProduct(product || null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProduct(null);
  };

  const handleSuccess = () => {
    loadProducts();
  };

  // Open inventory adjustment modal
  const handleOpenInventoryModal = (product: Product) => {
    setInventoryModal({
      productId: product.id,
      productCode: product.code,
      productName: product.name || product.code,
      currentStock: product.inventory_quantity ?? 0,
    });
    setAdjustmentAmount('');
    setAdjustmentReason('');
    setAdjustmentType('add');
  };

  // Close inventory modal
  const handleCloseInventoryModal = () => {
    setInventoryModal(null);
    setAdjustmentAmount('');
    setAdjustmentReason('');
  };

  // Submit inventory adjustment
  const handleAdjustInventory = async () => {
    if (!inventoryModal || !adjustmentAmount) return;

    const amount = parseInt(adjustmentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError('La cantidad debe ser un número positivo');
      return;
    }

    let adjustment: number;
    if (adjustmentType === 'add') {
      adjustment = amount;
    } else if (adjustmentType === 'remove') {
      adjustment = -amount;
      if (inventoryModal.currentStock + adjustment < 0) {
        setError('No puede quedar stock negativo');
        return;
      }
    } else {
      // 'set' - calculate difference
      adjustment = amount - inventoryModal.currentStock;
    }

    try {
      setSubmitting(true);
      setError(null);

      await apiClient.post(`/schools/${schoolId}/inventory/product/${inventoryModal.productId}/adjust`, {
        adjustment,
        reason: adjustmentReason || `Ajuste manual: ${adjustmentType === 'add' ? 'Agregar' : adjustmentType === 'remove' ? 'Remover' : 'Establecer'} ${amount} unidades`,
      });

      handleCloseInventoryModal();
      await loadProducts();
    } catch (err: any) {
      console.error('Error adjusting inventory:', err);
      setError(err.response?.data?.detail || 'Error al ajustar inventario');
    } finally {
      setSubmitting(false);
    }
  };

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.size.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSize = sizeFilter === '' || product.size === sizeFilter;

    return matchesSearch && matchesSize;
  });

  // Get unique sizes for filter
  const uniqueSizes = Array.from(new Set(products.map(p => p.size))).sort();

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Cargando...' : `${filteredProducts.length} productos encontrados`}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por código, nombre, talla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todas las tallas</option>
            {uniqueSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando productos...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={() => { setError(null); loadProducts(); }}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Talla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => {
                const stock = product.inventory_quantity ?? 0;
                const minStock = product.inventory_min_stock ?? 5;
                const isLowStock = stock <= minStock && stock > 0;
                const isOutOfStock = stock === 0;

                return (
                  <tr key={product.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {product.code}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.name || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.size}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {product.color || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      ${Number(product.price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        isOutOfStock
                          ? 'bg-red-100 text-red-800'
                          : isLowStock
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {stock} {isOutOfStock ? '⚠️' : isLowStock ? '⚡' : '✓'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        product.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {product.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-2">
                        {/* Edit Product Button */}
                        <button
                          onClick={() => handleOpenModal(product)}
                          className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50"
                          title="Editar producto"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {/* Adjust Inventory Button - only for superusers/admins */}
                        {isSuperuser && (
                          <button
                            onClick={() => handleOpenInventoryModal(product)}
                            className="text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50"
                            title="Ajustar inventario"
                          >
                            <PackagePlus className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {searchTerm || sizeFilter ? 'No se encontraron productos' : 'No hay productos'}
          </h3>
          <p className="text-blue-700 mb-4">
            {searchTerm || sizeFilter
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando tu primer producto al catálogo'
            }
          </p>
          {!searchTerm && !sizeFilter && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Producto
            </button>
          )}
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        schoolId={schoolId}
        product={selectedProduct}
      />

      {/* Inventory Adjustment Modal */}
      {inventoryModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div
            className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
            onClick={handleCloseInventoryModal}
          />
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-800">
                  Ajustar Inventario
                </h2>
                <button
                  onClick={handleCloseInventoryModal}
                  className="text-gray-400 hover:text-gray-600 transition"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Product Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm text-gray-600">Producto:</p>
                  <p className="font-medium text-gray-900">{inventoryModal.productCode}</p>
                  <p className="text-sm text-gray-700">{inventoryModal.productName}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-600">Stock actual:</span>
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                      {inventoryModal.currentStock} unidades
                    </span>
                  </div>
                </div>

                {/* Adjustment Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tipo de ajuste
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('add')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition ${
                        adjustmentType === 'add'
                          ? 'bg-green-100 border-green-500 text-green-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      + Agregar
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('remove')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition ${
                        adjustmentType === 'remove'
                          ? 'bg-red-100 border-red-500 text-red-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      - Remover
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustmentType('set')}
                      className={`flex-1 py-2 px-4 rounded-lg border transition ${
                        adjustmentType === 'set'
                          ? 'bg-blue-100 border-blue-500 text-blue-700'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      = Establecer
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {adjustmentType === 'set' ? 'Nuevo stock' : 'Cantidad'} *
                  </label>
                  <input
                    type="number"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    min="0"
                    placeholder={adjustmentType === 'set' ? 'Ej: 50' : 'Ej: 10'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                  {adjustmentType !== 'set' && adjustmentAmount && (
                    <p className="mt-1 text-sm text-gray-500">
                      Nuevo stock: {
                        adjustmentType === 'add'
                          ? inventoryModal.currentStock + parseInt(adjustmentAmount || '0')
                          : Math.max(0, inventoryModal.currentStock - parseInt(adjustmentAmount || '0'))
                      } unidades
                    </p>
                  )}
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Razón (opcional)
                  </label>
                  <input
                    type="text"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    placeholder="Ej: Reposición de inventario, Corrección de conteo..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg">
                <button
                  type="button"
                  onClick={handleCloseInventoryModal}
                  disabled={submitting}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleAdjustInventory}
                  disabled={submitting || !adjustmentAmount}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar Ajuste
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
