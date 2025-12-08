/**
 * Order Modal - Create new orders (encargos)
 */
import { useState, useEffect } from 'react';
import { X, Loader2, Plus, Trash2, Package, AlertCircle, Calendar, User } from 'lucide-react';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { clientService } from '../services/clientService';
import type { GarmentType, Client, OrderItemCreate } from '../types/api';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
}

interface OrderItemForm extends OrderItemCreate {
  tempId: string;
  garmentTypeName?: string;
  unitPrice: number;
}

export default function OrderModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId
}: OrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [items, setItems] = useState<OrderItemForm[]>([]);

  // New item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItem, setNewItem] = useState<Partial<OrderItemForm>>({
    garment_type_id: '',
    quantity: 1,
    size: '',
    color: '',
    gender: 'unisex',
    embroidery_text: '',
    notes: '',
  });

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [garmentTypesData, clientsData] = await Promise.all([
        productService.getGarmentTypes(schoolId),
        clientService.getClients(schoolId)
      ]);
      setGarmentTypes(garmentTypesData);
      setClients(clientsData);
    } catch (err: any) {
      console.error('Error loading data:', err);
      setError('Error al cargar datos');
    } finally {
      setLoadingData(false);
    }
  };

  const resetForm = () => {
    setClientId('');
    setDeliveryDate('');
    setNotes('');
    setAdvancePayment(0);
    setItems([]);
    setError(null);
    setShowAddItem(false);
    setNewItem({
      garment_type_id: '',
      quantity: 1,
      size: '',
      color: '',
      gender: 'unisex',
      embroidery_text: '',
      notes: '',
    });
  };

  const getGarmentTypePrice = (_garmentTypeId: string): number => {
    // For now, use a default price - in production this would come from pricing configuration
    // This is a placeholder - the backend calculates the actual price
    return 50000; // Default price
  };

  const handleAddItem = () => {
    if (!newItem.garment_type_id) {
      setError('Selecciona un tipo de prenda');
      return;
    }

    const garmentType = garmentTypes.find(g => g.id === newItem.garment_type_id);
    const unitPrice = getGarmentTypePrice(newItem.garment_type_id);

    const item: OrderItemForm = {
      tempId: Date.now().toString(),
      garment_type_id: newItem.garment_type_id,
      quantity: newItem.quantity || 1,
      size: newItem.size || undefined,
      color: newItem.color || undefined,
      gender: newItem.gender || undefined,
      embroidery_text: newItem.embroidery_text || undefined,
      notes: newItem.notes || undefined,
      garmentTypeName: garmentType?.name,
      unitPrice,
    };

    setItems([...items, item]);
    setNewItem({
      garment_type_id: '',
      quantity: 1,
      size: '',
      color: '',
      gender: 'unisex',
      embroidery_text: '',
      notes: '',
    });
    setShowAddItem(false);
    setError(null);
  };

  const handleRemoveItem = (tempId: string) => {
    setItems(items.filter(item => item.tempId !== tempId));
  };

  const calculateTotal = (): number => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!clientId) {
      setError('Selecciona un cliente');
      return;
    }

    if (items.length === 0) {
      setError('Agrega al menos un item al encargo');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const orderItems: OrderItemCreate[] = items.map(item => ({
        garment_type_id: item.garment_type_id,
        quantity: item.quantity,
        size: item.size,
        color: item.color,
        gender: item.gender,
        embroidery_text: item.embroidery_text,
        notes: item.notes,
      }));

      await orderService.createOrder(schoolId, {
        school_id: schoolId,
        client_id: clientId,
        delivery_date: deliveryDate || undefined,
        notes: notes || undefined,
        items: orderItems,
        advance_payment: advancePayment > 0 ? advancePayment : undefined,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating order:', err);
      let errorMessage = 'Error al crear el encargo';
      if (err.response?.data?.detail) {
        if (typeof err.response.data.detail === 'string') {
          errorMessage = err.response.data.detail;
        } else if (Array.isArray(err.response.data.detail)) {
          errorMessage = err.response.data.detail.map((e: any) => e.msg || e.message || JSON.stringify(e)).join(', ');
        }
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const total = calculateTotal();
  const balance = total - advancePayment;

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
              <Package className="w-6 h-6 mr-2 text-blue-600" />
              Nuevo Encargo
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Loading Data */}
          {loadingData && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <span className="ml-3 text-gray-600">Cargando datos...</span>
            </div>
          )}

          {/* Form */}
          {!loadingData && (
            <form onSubmit={handleSubmit} className="p-6">
              {/* Error Message */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Client Selection */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  Cliente *
                </label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                >
                  <option value="">Selecciona un cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} {client.student_name ? `(${client.student_name})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Delivery Date */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Fecha de Entrega
                </label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Items Section */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    <Package className="w-4 h-4 inline mr-1" />
                    Items del Encargo *
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowAddItem(true)}
                    className="text-blue-600 hover:text-blue-800 text-sm flex items-center"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar Item
                  </button>
                </div>

                {/* Items List */}
                {items.length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4 mb-4 overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left pb-2">Prenda</th>
                          <th className="text-center pb-2">Talla</th>
                          <th className="text-center pb-2">Cant.</th>
                          <th className="text-right pb-2">Precio</th>
                          <th className="text-right pb-2">Subtotal</th>
                          <th className="pb-2"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {items.map((item) => (
                          <tr key={item.tempId} className="text-sm">
                            <td className="py-2">
                              <div>
                                <p className="font-medium">{item.garmentTypeName}</p>
                                {item.embroidery_text && (
                                  <p className="text-xs text-gray-500">Bordado: {item.embroidery_text}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-2 text-center">{item.size || '-'}</td>
                            <td className="py-2 text-center">{item.quantity}</td>
                            <td className="py-2 text-right">${item.unitPrice.toLocaleString()}</td>
                            <td className="py-2 text-right font-medium">
                              ${(item.unitPrice * item.quantity).toLocaleString()}
                            </td>
                            <td className="py-2 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.tempId)}
                                className="text-red-500 hover:text-red-700 p-1"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {items.length === 0 && !showAddItem && (
                  <div className="bg-gray-50 rounded-lg p-8 text-center">
                    <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500">No hay items agregados</p>
                    <button
                      type="button"
                      onClick={() => setShowAddItem(true)}
                      className="mt-3 text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Agregar primer item
                    </button>
                  </div>
                )}

                {/* Add Item Form */}
                {showAddItem && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-3">Agregar Item</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Tipo de Prenda *</label>
                        <select
                          value={newItem.garment_type_id}
                          onChange={(e) => setNewItem({ ...newItem, garment_type_id: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Selecciona...</option>
                          {garmentTypes.map((gt) => (
                            <option key={gt.id} value={gt.id}>
                              {gt.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: parseInt(e.target.value) || 1 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Talla</label>
                        <input
                          type="text"
                          value={newItem.size}
                          onChange={(e) => setNewItem({ ...newItem, size: e.target.value })}
                          placeholder="Ej: M, L, 12, 14"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Color</label>
                        <input
                          type="text"
                          value={newItem.color}
                          onChange={(e) => setNewItem({ ...newItem, color: e.target.value })}
                          placeholder="Ej: Blanco, Azul"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Genero</label>
                        <select
                          value={newItem.gender}
                          onChange={(e) => setNewItem({ ...newItem, gender: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="unisex">Unisex</option>
                          <option value="male">Masculino</option>
                          <option value="female">Femenino</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Texto Bordado</label>
                        <input
                          type="text"
                          value={newItem.embroidery_text}
                          onChange={(e) => setNewItem({ ...newItem, embroidery_text: e.target.value })}
                          placeholder="Nombre para bordado"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-xs text-gray-600 mb-1">Notas</label>
                        <input
                          type="text"
                          value={newItem.notes}
                          onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                          placeholder="Notas adicionales..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 mt-4">
                      <button
                        type="button"
                        onClick={() => setShowAddItem(false)}
                        className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddItem}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                      >
                        Agregar
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Totals */}
              {items.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">${total.toLocaleString()}</span>
                  </div>

                  {/* Advance Payment Section */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-600">Anticipo:</span>
                      <span className="font-medium text-green-600">${advancePayment.toLocaleString()}</span>
                    </div>

                    {/* Quick Percentage Buttons */}
                    <div className="flex gap-2 mb-2">
                      {[0, 30, 50, 100].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAdvancePayment(Math.round(total * pct / 100))}
                          className={`flex-1 py-1.5 text-xs font-medium rounded transition ${
                            advancePayment === Math.round(total * pct / 100)
                              ? 'bg-blue-600 text-white'
                              : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          {pct === 0 ? 'Sin anticipo' : pct === 100 ? 'Pago total' : `${pct}%`}
                        </button>
                      ))}
                    </div>

                    {/* Custom Amount Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Otro monto:</span>
                      <div className="relative flex-1">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                        <input
                          type="number"
                          min="0"
                          max={total}
                          value={advancePayment || ''}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setAdvancePayment(Math.min(Math.max(0, val), total));
                          }}
                          placeholder="0"
                          className="w-full pl-6 pr-3 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                    <span className="text-gray-800 font-medium">Saldo Pendiente:</span>
                    <span className={`text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {balance > 0 ? `$${balance.toLocaleString()}` : 'Pagado'}
                    </span>
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notas del Encargo
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales sobre el encargo..."
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
                      Creando...
                    </>
                  ) : (
                    'Crear Encargo'
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
