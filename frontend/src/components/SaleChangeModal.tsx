/**
 * Sale Change Modal - Request product changes/returns
 */
import { useState, useEffect } from 'react';
import { X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { saleChangeService } from '../services/saleChangeService';
import { productService } from '../services/productService';
import type { SaleItem, Product, ChangeType, SaleChangeCreate } from '../types/api';

interface SaleChangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
  saleId: string;
  saleItems: SaleItem[];
}

export default function SaleChangeModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId,
  saleId,
  saleItems
}: SaleChangeModalProps) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    original_item_id: '',
    change_type: 'size_change' as ChangeType,
    new_product_id: '',
    returned_quantity: 1,
    new_quantity: 1,
    reason: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadProducts();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      original_item_id: '',
      change_type: 'size_change',
      new_product_id: '',
      returned_quantity: 1,
      new_quantity: 1,
      reason: '',
    });
    setError(null);
  };

  const loadProducts = async () => {
    try {
      const data = await productService.getProducts(schoolId);
      setProducts(data);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Error al cargar productos');
    }
  };

  const getProductName = (productId: string | null) => {
    if (!productId) return 'Producto global';
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} - ${product.size}` : 'Producto no encontrado';
  };

  // Helper function to get item display name (handles global products)
  const getItemDisplayName = (item: SaleItem) => {
    // For global products, try to use global product info if available
    if (item.is_global_product) {
      return 'Producto Global';
    }
    // For school products
    return getProductName(item.product_id);
  };

  const selectedItem = saleItems.find(item => item.id === formData.original_item_id);
  const maxReturnQty = selectedItem?.quantity || 1;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.original_item_id) {
      setError('Selecciona el producto a cambiar/devolver');
      return;
    }

    if (formData.change_type !== 'return' && !formData.new_product_id) {
      setError('Selecciona el producto nuevo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build the payload based on change type
      // For returns: don't include new_product_id at all (omit the field), set new_quantity to 0
      // For other types: include new_product_id and new_quantity
      const changeData: SaleChangeCreate = {
        original_item_id: formData.original_item_id,
        change_type: formData.change_type,
        returned_quantity: formData.returned_quantity,
        reason: formData.reason.trim() || 'Sin motivo especificado',
        new_quantity: formData.change_type === 'return' ? 0 : formData.new_quantity,
      };

      // Only include new_product_id for non-return changes
      // For returns, we omit the field entirely so backend receives undefined/null properly
      if (formData.change_type !== 'return' && formData.new_product_id) {
        changeData.new_product_id = formData.new_product_id;
      }

      await saleChangeService.createChange(schoolId, saleId, changeData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating change:', err);
      // Handle validation errors from backend
      let errorMessage = 'Error al crear la solicitud de cambio';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          // Pydantic validation errors come as array
          errorMessage = err.response.data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const getChangeTypeLabel = (type: ChangeType) => {
    switch (type) {
      case 'size_change': return 'Cambio de Talla';
      case 'product_change': return 'Cambio de Producto';
      case 'return': return 'Devolución (Reembolso)';
      case 'defect': return 'Producto Defectuoso';
      default: return type;
    }
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <RefreshCw className="w-6 h-6 mr-2" />
              Solicitar Cambio o Devolución
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Change Type */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Cambio *
              </label>
              <select
                value={formData.change_type}
                onChange={(e) => setFormData({ ...formData, change_type: e.target.value as ChangeType })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="size_change">{getChangeTypeLabel('size_change')}</option>
                <option value="product_change">{getChangeTypeLabel('product_change')}</option>
                <option value="return">{getChangeTypeLabel('return')}</option>
                <option value="defect">{getChangeTypeLabel('defect')}</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {formData.change_type === 'return'
                  ? 'El cliente recibirá un reembolso por el producto devuelto'
                  : 'El cliente recibirá un producto de reemplazo'}
              </p>
            </div>

            {/* Original Item */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Producto Original a Devolver *
              </label>
              <select
                value={formData.original_item_id}
                onChange={(e) => setFormData({ ...formData, original_item_id: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                <option value="">Selecciona un producto</option>
                {saleItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {getItemDisplayName(item)} - Cantidad: {item.quantity} - ${Number(item.unit_price).toLocaleString()}
                  </option>
                ))}
              </select>
            </div>

            {/* Returned Quantity */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cantidad a Devolver *
              </label>
              <input
                type="number"
                min="1"
                max={maxReturnQty}
                value={formData.returned_quantity}
                onChange={(e) => setFormData({ ...formData, returned_quantity: parseInt(e.target.value) || 1 })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
              {selectedItem && (
                <p className="mt-1 text-xs text-gray-500">
                  Máximo: {maxReturnQty} unidades
                </p>
              )}
            </div>

            {/* New Product (only if not return) */}
            {formData.change_type !== 'return' && (
              <>
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Producto Nuevo *
                  </label>
                  <select
                    value={formData.new_product_id}
                    onChange={(e) => setFormData({ ...formData, new_product_id: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((product) => {
                      const stock = product.inventory_quantity ?? 0;
                      return (
                        <option key={product.id} value={product.id} disabled={stock === 0}>
                          {product.name} - {product.size} - ${Number(product.price).toLocaleString()}
                          {stock === 0 ? ' [SIN STOCK]' : ` [Stock: ${stock}]`}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Cantidad Nueva *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.new_quantity}
                    onChange={(e) => setFormData({ ...formData, new_quantity: parseInt(e.target.value) || 1 })}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>
              </>
            )}

            {/* Reason */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motivo (Opcional)
              </label>
              <textarea
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                rows={3}
                placeholder="Describe el motivo del cambio o devolución..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> La solicitud quedará en estado PENDIENTE y deberá ser aprobada
                por un administrador antes de que se ajuste el inventario.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
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
                    Procesando...
                  </>
                ) : (
                  'Crear Solicitud'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
