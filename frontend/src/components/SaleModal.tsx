/**
 * Sale Modal - Create New Sale Form
 */
import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { saleService, type SaleCreate, type SaleItemCreate } from '../services/saleService';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import type { Client, Product } from '../types/api';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
}

export default function SaleModal({ isOpen, onClose, onSuccess, schoolId }: SaleModalProps) {
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    client_id: '',
    payment_method: 'cash' as 'cash' | 'credit' | 'transfer' | 'card',
    notes: '',
  });

  const [items, setItems] = useState<SaleItemCreate[]>([]);
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
  });

  useEffect(() => {
    if (isOpen) {
      loadClientsAndProducts();
      resetForm();
    }
  }, [isOpen]);

  const resetForm = () => {
    setFormData({
      client_id: '',
      payment_method: 'cash',
      notes: '',
    });
    setItems([]);
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
    });
    setError(null);
  };

  const loadClientsAndProducts = async () => {
    try {
      const [clientsData, productsData] = await Promise.all([
        clientService.getClients(schoolId),
        productService.getProducts(schoolId),
      ]);
      setClients(clientsData);
      setProducts(productsData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Error al cargar clientes y productos');
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setCurrentItem({
        product_id: productId,
        quantity: 1,
        unit_price: Number(product.price),
      });
    }
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }

    // Get product and check stock
    const product = products.find(p => p.id === currentItem.product_id);
    if (!product) {
      setError('Producto no encontrado');
      return;
    }

    // Calculate total quantity (existing + new)
    const existingItem = items.find(item => item.product_id === currentItem.product_id);
    const totalQuantity = (existingItem?.quantity || 0) + currentItem.quantity;

    // Check stock availability
    const availableStock = product.inventory_quantity ?? product.stock ?? 0;
    if (totalQuantity > availableStock) {
      setError(`Stock insuficiente para ${product.name}. Disponible: ${availableStock}, solicitado: ${totalQuantity}`);
      return;
    }

    // Check if product already in items
    const existingIndex = items.findIndex(item => item.product_id === currentItem.product_id);
    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += currentItem.quantity;
      setItems(updatedItems);
    } else {
      // Add new item
      setItems([...items, { ...currentItem }]);
    }

    // Reset current item
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
    });
    setError(null);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const calculateTotal = () => {
    return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.client_id) {
      setError('Selecciona un cliente');
      return;
    }

    if (items.length === 0) {
      setError('Agrega al menos un producto a la venta');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const saleData: SaleCreate = {
        school_id: schoolId,
        client_id: formData.client_id,
        items: items,
        payment_method: formData.payment_method,
        notes: formData.notes || undefined,
      };

      await saleService.createSale(schoolId, saleData);
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating sale:', err);
      setError(err.response?.data?.detail || 'Error al crear la venta');
    } finally {
      setLoading(false);
    }
  };

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product ? `${product.name} - ${product.size} (${product.code})` : productId;
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              <ShoppingCart className="w-6 h-6 mr-2" />
              Nueva Venta
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
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => setFormData({ ...formData, client_id: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - {client.code}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Pago *
                </label>
                <select
                  value={formData.payment_method}
                  onChange={(e) => setFormData({ ...formData, payment_method: e.target.value as any })}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="cash">Efectivo</option>
                  <option value="card">Tarjeta</option>
                  <option value="transfer">Transferencia</option>
                  <option value="credit">Crédito</option>
                </select>
              </div>
            </div>

            {/* Add Product Section */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Productos</h3>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                {/* Product Select */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Producto
                  </label>
                  <select
                    value={currentItem.product_id}
                    onChange={(e) => handleProductSelect(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  >
                    <option value="">Selecciona un producto</option>
                    {products.map((product) => {
                      const stock = product.inventory_quantity ?? product.stock ?? 0;
                      const lowStock = stock < 5;
                      const outOfStock = stock === 0;
                      return (
                        <option
                          key={product.id}
                          value={product.id}
                          disabled={outOfStock}
                        >
                          {product.name} - {product.size} - ${Number(product.price).toLocaleString()}
                          {outOfStock ? ' [SIN STOCK]' : lowStock ? ` [Stock: ${stock} ⚠️]` : ` [Stock: ${stock}]`}
                        </option>
                      );
                    })}
                  </select>
                  {/* Stock indicator for selected product */}
                  {currentItem.product_id && (
                    <p className="mt-1 text-sm">
                      {(() => {
                        const product = products.find(p => p.id === currentItem.product_id);
                        const stock = product?.inventory_quantity ?? product?.stock ?? 0;
                        const alreadySelected = items.find(i => i.product_id === currentItem.product_id)?.quantity || 0;
                        const available = stock - alreadySelected;

                        if (available === 0) {
                          return <span className="text-red-600 font-medium">⚠️ Sin stock disponible</span>;
                        } else if (available < 5) {
                          return <span className="text-orange-600 font-medium">⚠️ Stock bajo: {available} unidades disponibles</span>;
                        } else {
                          return <span className="text-green-600">✓ {available} unidades disponibles</span>;
                        }
                      })()}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={currentItem.quantity}
                    onChange={(e) => setCurrentItem({ ...currentItem, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!currentItem.product_id}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Items List */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Productos en la Venta</h3>
                <div className="space-y-2">
                  {items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{getProductName(item.product_id)}</p>
                        <p className="text-sm text-gray-600">
                          Cantidad: {item.quantity} × ${item.unit_price.toLocaleString()} = ${(item.quantity * item.unit_price).toLocaleString()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="ml-4 text-red-600 hover:text-red-800 transition"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">Total:</span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${calculateTotal().toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas (Opcional)
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={3}
                placeholder="Observaciones adicionales..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
              />
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
                disabled={loading || items.length === 0}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  'Crear Venta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
