/**
 * Order Modal - Create new orders (encargos) with 3 order types
 * - Catalog: Select product from catalog (for out of stock items)
 * - Yomber: Custom measurements required
 * - Custom: Manual price for special items
 */
import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Plus, Trash2, Package, AlertCircle, Calendar, User, ShoppingBag, Ruler, Settings } from 'lucide-react';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { clientService } from '../services/clientService';
import YomberMeasurementsForm, { validateYomberMeasurements } from './YomberMeasurementsForm';
import type { GarmentType, Client, OrderItemCreate, Product, OrderType, YomberMeasurements } from '../types/api';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  schoolId: string;
}

interface OrderItemForm extends OrderItemCreate {
  tempId: string;
  displayName?: string;
  unitPrice: number;
}

type TabType = 'catalog' | 'yomber' | 'custom';

export default function OrderModal({
  isOpen,
  onClose,
  onSuccess,
  schoolId
}: OrderModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(true);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [clientId, setClientId] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [advancePayment, setAdvancePayment] = useState<number>(0);
  const [items, setItems] = useState<OrderItemForm[]>([]);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('catalog');

  // Catalog tab state
  const [catalogProductId, setCatalogProductId] = useState('');
  const [catalogQuantity, setCatalogQuantity] = useState(1);
  const [catalogGarmentFilter, setCatalogGarmentFilter] = useState('');

  // Yomber tab state - simplified: just select a yomber product directly
  const [yomberProductId, setYomberProductId] = useState('');
  const [yomberQuantity, setYomberQuantity] = useState(1);
  const [yomberMeasurements, setYomberMeasurements] = useState<Partial<YomberMeasurements>>({});
  const [yomberAdditionalPrice, setYomberAdditionalPrice] = useState(0);
  const [yomberEmbroideryText, setYomberEmbroideryText] = useState('');

  // Custom tab state
  const [customGarmentTypeId, setCustomGarmentTypeId] = useState('');
  const [customQuantity, setCustomQuantity] = useState(1);
  const [customSize, setCustomSize] = useState('');
  const [customColor, setCustomColor] = useState('');
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [customNotes, setCustomNotes] = useState('');
  const [customEmbroideryText, setCustomEmbroideryText] = useState('');

  // Filter yomber products - only products whose garment type has has_custom_measurements = true
  const yomberProducts = useMemo(() => {
    const yomberGarmentTypeIds = garmentTypes
      .filter(gt => gt.has_custom_measurements)
      .map(gt => gt.id);
    return products.filter(p => yomberGarmentTypeIds.includes(p.garment_type_id));
  }, [products, garmentTypes]);

  // Filter catalog products by garment type
  const filteredCatalogProducts = useMemo(() => {
    if (!catalogGarmentFilter) return products;
    return products.filter(p => p.garment_type_id === catalogGarmentFilter);
  }, [products, catalogGarmentFilter]);

  useEffect(() => {
    if (isOpen) {
      loadData();
      resetForm();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoadingData(true);
      const [garmentTypesData, productsData, clientsData] = await Promise.all([
        productService.getGarmentTypes(schoolId),
        productService.getProducts(schoolId),
        clientService.getClients(schoolId)
      ]);
      setGarmentTypes(garmentTypesData);
      setProducts(productsData);
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
    setActiveTab('catalog');
    resetCatalogForm();
    resetYomberForm();
    resetCustomForm();
  };

  const resetCatalogForm = () => {
    setCatalogProductId('');
    setCatalogQuantity(1);
    setCatalogGarmentFilter('');
  };

  const resetYomberForm = () => {
    setYomberProductId('');
    setYomberQuantity(1);
    setYomberMeasurements({});
    setYomberAdditionalPrice(0);
    setYomberEmbroideryText('');
  };

  const resetCustomForm = () => {
    setCustomGarmentTypeId('');
    setCustomQuantity(1);
    setCustomSize('');
    setCustomColor('');
    setCustomPrice(0);
    setCustomNotes('');
    setCustomEmbroideryText('');
  };

  const handleAddCatalogItem = () => {
    if (!catalogProductId) {
      setError('Selecciona un producto');
      return;
    }

    const product = products.find(p => p.id === catalogProductId);
    if (!product) return;

    const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);

    const item: OrderItemForm = {
      tempId: Date.now().toString(),
      order_type: 'catalog',
      garment_type_id: product.garment_type_id,
      product_id: product.id,
      quantity: catalogQuantity,
      size: product.size,
      color: product.color || undefined,
      displayName: `${garmentType?.name || 'Producto'} - ${product.size}${product.color ? ` (${product.color})` : ''}`,
      unitPrice: Number(product.price),
    };

    setItems([...items, item]);
    resetCatalogForm();
    setError(null);
  };

  const handleAddYomberItem = () => {
    if (!yomberProductId) {
      setError('Selecciona un producto yomber para el precio base');
      return;
    }

    const validation = validateYomberMeasurements(yomberMeasurements);
    if (!validation.valid) {
      setError('Completa todas las medidas obligatorias del yomber');
      return;
    }

    const product = products.find(p => p.id === yomberProductId);
    if (!product) return;

    const basePrice = Number(product.price);
    const totalPrice = basePrice + yomberAdditionalPrice;

    const item: OrderItemForm = {
      tempId: Date.now().toString(),
      order_type: 'yomber',
      garment_type_id: product.garment_type_id,
      product_id: product.id,
      quantity: yomberQuantity,
      size: product.size,
      custom_measurements: yomberMeasurements as YomberMeasurements,
      additional_price: yomberAdditionalPrice > 0 ? yomberAdditionalPrice : undefined,
      embroidery_text: yomberEmbroideryText || undefined,
      displayName: `Yomber ${product.size} (sobre-medida)`,
      unitPrice: totalPrice,
    };

    setItems([...items, item]);
    resetYomberForm();
    setError(null);
  };

  const handleAddCustomItem = () => {
    if (!customGarmentTypeId) {
      setError('Selecciona un tipo de prenda');
      return;
    }

    if (!customPrice || customPrice <= 0) {
      setError('Ingresa un precio válido');
      return;
    }

    const garmentType = garmentTypes.find(gt => gt.id === customGarmentTypeId);

    const item: OrderItemForm = {
      tempId: Date.now().toString(),
      order_type: 'custom',
      garment_type_id: customGarmentTypeId,
      quantity: customQuantity,
      unit_price: customPrice,
      size: customSize || undefined,
      color: customColor || undefined,
      embroidery_text: customEmbroideryText || undefined,
      notes: customNotes || undefined,
      displayName: `${garmentType?.name || 'Personalizado'}${customSize ? ` - ${customSize}` : ''}${customColor ? ` (${customColor})` : ''}`,
      unitPrice: customPrice,
    };

    setItems([...items, item]);
    resetCustomForm();
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
        order_type: item.order_type,
        product_id: item.product_id,
        unit_price: item.unit_price,
        additional_price: item.additional_price,
        size: item.size,
        color: item.color,
        gender: item.gender,
        custom_measurements: item.custom_measurements,
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

  const getOrderTypeBadge = (orderType: OrderType | undefined) => {
    switch (orderType) {
      case 'catalog':
        return <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">Catalogo</span>;
      case 'yomber':
        return <span className="px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">Yomber</span>;
      case 'custom':
        return <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded">Personal.</span>;
      default:
        return null;
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
        <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
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

              {/* Order Type Tabs */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Agregar Items al Encargo
                </label>

                {/* Tabs */}
                <div className="flex border-b border-gray-200 mb-4">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition ${
                      activeTab === 'catalog'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4 mr-2" />
                    Catalogo
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('yomber')}
                    className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition ${
                      activeTab === 'yomber'
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Ruler className="w-4 h-4 mr-2" />
                    Yomber
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('custom')}
                    className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 transition ${
                      activeTab === 'custom'
                        ? 'border-orange-500 text-orange-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Personalizado
                  </button>
                </div>

                {/* Tab Content */}
                <div className="bg-gray-50 rounded-lg p-4">
                  {/* CATALOG TAB */}
                  {activeTab === 'catalog' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Selecciona un producto del catalogo. Ideal para productos agotados o pedidos web.
                      </p>

                      {/* Garment Type Filter */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Filtrar por tipo</label>
                        <select
                          value={catalogGarmentFilter}
                          onChange={(e) => setCatalogGarmentFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Todos los tipos</option>
                          {garmentTypes.map((gt) => (
                            <option key={gt.id} value={gt.id}>
                              {gt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Product Selection */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Producto *</label>
                        <select
                          value={catalogProductId}
                          onChange={(e) => setCatalogProductId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Selecciona un producto</option>
                          {filteredCatalogProducts.map((product) => {
                            const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
                            const stock = product.inventory_quantity ?? product.stock ?? 0;
                            return (
                              <option key={product.id} value={product.id}>
                                {garmentType?.name} - {product.size}
                                {product.color ? ` (${product.color})` : ''} -
                                ${Number(product.price).toLocaleString()}
                                {stock === 0 ? ' [SIN STOCK]' : ` [Stock: ${stock}]`}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      {/* Show selected product info */}
                      {catalogProductId && (
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          {(() => {
                            const product = products.find(p => p.id === catalogProductId);
                            if (!product) return null;
                            const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
                            return (
                              <div className="text-sm">
                                <p className="font-medium text-blue-900">{garmentType?.name} - {product.size}</p>
                                <p className="text-blue-700">Precio: ${Number(product.price).toLocaleString()}</p>
                              </div>
                            );
                          })()}
                        </div>
                      )}

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          value={catalogQuantity}
                          onChange={(e) => setCatalogQuantity(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCatalogItem}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar al Encargo
                      </button>
                    </div>
                  )}

                  {/* YOMBER TAB */}
                  {activeTab === 'yomber' && (
                    <div className="space-y-4">
                      {yomberProducts.length === 0 ? (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                          <p className="text-sm text-yellow-700 font-medium">No hay productos Yomber configurados</p>
                          <p className="text-xs text-yellow-600 mt-1">
                            Configura tipos de prenda con "medidas personalizadas" para habilitar yombers
                          </p>
                        </div>
                      ) : (
                        <>
                          {/* Direct Yomber Product Selection */}
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              Selecciona el Yomber *
                            </label>
                            <select
                              value={yomberProductId}
                              onChange={(e) => setYomberProductId(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                              <option value="">-- Selecciona un yomber --</option>
                              {yomberProducts.map((product) => {
                                const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
                                return (
                                  <option key={product.id} value={product.id}>
                                    {garmentType?.name} - Talla {product.size} - ${Number(product.price).toLocaleString()}
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Show selected yomber info */}
                          {yomberProductId && (
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                              {(() => {
                                const product = products.find(p => p.id === yomberProductId);
                                if (!product) return null;
                                const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
                                return (
                                  <div className="text-sm">
                                    <p className="font-medium text-purple-900">{garmentType?.name} - Talla {product.size}</p>
                                    <p className="text-purple-700">Precio base: ${Number(product.price).toLocaleString()}</p>
                                  </div>
                                );
                              })()}
                            </div>
                          )}

                          {/* Yomber Measurements - only show when product selected */}
                          {yomberProductId && (
                            <>
                              <YomberMeasurementsForm
                                measurements={yomberMeasurements}
                                onChange={setYomberMeasurements}
                              />

                              <div className="grid grid-cols-2 gap-4">
                                {/* Quantity */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Cantidad *</label>
                                  <input
                                    type="number"
                                    min="1"
                                    value={yomberQuantity}
                                    onChange={(e) => setYomberQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  />
                                </div>

                                {/* Additional Price */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Adicional (opcional)</label>
                                  <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                                    <input
                                      type="number"
                                      min="0"
                                      value={yomberAdditionalPrice || ''}
                                      onChange={(e) => setYomberAdditionalPrice(parseInt(e.target.value) || 0)}
                                      placeholder="0"
                                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Embroidery Text */}
                              <div>
                                <label className="block text-xs text-gray-600 mb-1">Texto Bordado</label>
                                <input
                                  type="text"
                                  value={yomberEmbroideryText}
                                  onChange={(e) => setYomberEmbroideryText(e.target.value)}
                                  placeholder="Nombre para bordar"
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                />
                              </div>

                              {/* Total Price Summary */}
                              {(() => {
                                const product = products.find(p => p.id === yomberProductId);
                                if (!product) return null;
                                const basePrice = Number(product.price);
                                const totalPrice = (basePrice + yomberAdditionalPrice) * yomberQuantity;
                                return (
                                  <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 text-center">
                                    <p className="text-sm text-purple-700">
                                      {yomberQuantity}x ${(basePrice + yomberAdditionalPrice).toLocaleString()}
                                    </p>
                                    <p className="font-bold text-lg text-purple-900">
                                      Total: ${totalPrice.toLocaleString()}
                                    </p>
                                  </div>
                                );
                              })()}

                              <button
                                type="button"
                                onClick={handleAddYomberItem}
                                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center font-medium"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Agregar Yomber
                              </button>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  )}

                  {/* CUSTOM TAB */}
                  {activeTab === 'custom' && (
                    <div className="space-y-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Para productos fuera del catalogo, tallas especiales, o con modificaciones. Precio manual requerido.
                      </p>

                      {/* Garment Type */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Tipo de Prenda *</label>
                        <select
                          value={customGarmentTypeId}
                          onChange={(e) => setCustomGarmentTypeId(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        >
                          <option value="">Selecciona tipo</option>
                          {garmentTypes.map((gt) => (
                            <option key={gt.id} value={gt.id}>
                              {gt.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* Size */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Talla</label>
                          <input
                            type="text"
                            value={customSize}
                            onChange={(e) => setCustomSize(e.target.value)}
                            placeholder="ej: XL, 2, 18"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>

                        {/* Color */}
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Color</label>
                          <input
                            type="text"
                            value={customColor}
                            onChange={(e) => setCustomColor(e.target.value)}
                            placeholder="ej: Azul marino"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Price */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Precio Unitario *</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                          <input
                            type="number"
                            min="0"
                            value={customPrice || ''}
                            onChange={(e) => setCustomPrice(parseInt(e.target.value) || 0)}
                            placeholder="Ingresa el precio"
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                          />
                        </div>
                      </div>

                      {/* Embroidery Text */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Texto Bordado</label>
                        <input
                          type="text"
                          value={customEmbroideryText}
                          onChange={(e) => setCustomEmbroideryText(e.target.value)}
                          placeholder="Nombre para bordar"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Notas / Especificaciones</label>
                        <textarea
                          value={customNotes}
                          onChange={(e) => setCustomNotes(e.target.value)}
                          placeholder="Detalles especiales, modificaciones, etc."
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                        />
                      </div>

                      {/* Quantity */}
                      <div>
                        <label className="block text-xs text-gray-600 mb-1">Cantidad *</label>
                        <input
                          type="number"
                          min="1"
                          value={customQuantity}
                          onChange={(e) => setCustomQuantity(parseInt(e.target.value) || 1)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleAddCustomItem}
                        className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Agregar Personalizado
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Items List */}
              {items.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-medium text-gray-700 mb-3">
                    Items del Encargo ({items.length})
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 overflow-x-auto">
                    <table className="w-full min-w-[500px]">
                      <thead>
                        <tr className="text-xs text-gray-500 uppercase">
                          <th className="text-left pb-2">Item</th>
                          <th className="text-center pb-2">Tipo</th>
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
                                <p className="font-medium">{item.displayName}</p>
                                {item.embroidery_text && (
                                  <p className="text-xs text-gray-500">Bordado: {item.embroidery_text}</p>
                                )}
                                {item.custom_measurements && (
                                  <p className="text-xs text-purple-600">Con medidas personalizadas</p>
                                )}
                              </div>
                            </td>
                            <td className="py-2 text-center">
                              {getOrderTypeBadge(item.order_type)}
                            </td>
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
                </div>
              )}

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
