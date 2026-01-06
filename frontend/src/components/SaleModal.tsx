/**
 * Sale Modal - Create New Sale Form
 * Supports multi-school: allows adding items from different schools in a single transaction.
 * Creates separate sales (one per school) when items span multiple schools.
 */
import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Plus, Trash2, ShoppingCart, Globe, Building, UserX, Calendar, History, Building2, CheckCircle, Package } from 'lucide-react';
import { saleService, type SaleCreate, type SaleItemCreate } from '../services/saleService';
import { productService } from '../services/productService';
import ClientSelector, { NO_CLIENT_ID } from './ClientSelector';
import ProductGroupSelector from './ProductGroupSelector';
import { useSchoolStore } from '../stores/schoolStore';
import type { Product, GlobalProduct } from '../types/api';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialSchoolId?: string;  // Optional - modal can manage school selection internally
  initialProduct?: Product;  // Pre-load product (for "Start Sale" from Products page)
  initialQuantity?: number;  // Initial quantity for pre-loaded product
}

// Extended type for sale items with global flag AND school info for multi-school support
interface SaleItemCreateExtended extends SaleItemCreate {
  is_global: boolean;
  display_name?: string;
  size?: string;          // Product size for display
  school_id: string;      // School this item belongs to
  school_name: string;    // For display in UI
}

// Result of creating a sale (for multi-school success modal)
interface SaleResult {
  schoolName: string;
  saleCode: string;
  total: number;
  saleId: string;
}

export default function SaleModal({
  isOpen,
  onClose,
  onSuccess,
  initialSchoolId,
  initialProduct,
  initialQuantity = 1,
}: SaleModalProps) {
  // Multi-school support
  const { availableSchools, currentSchool } = useSchoolStore();
  const [selectedSchoolId, setSelectedSchoolId] = useState(
    initialSchoolId || currentSchool?.id || availableSchools[0]?.id || ''
  );
  const showSchoolSelector = availableSchools.length > 1;

  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [globalProducts, setGlobalProducts] = useState<GlobalProduct[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [productSource, setProductSource] = useState<'school' | 'global'>('school');

  // Product selector modal state
  const [productSelectorOpen, setProductSelectorOpen] = useState(false);

  // Multi-school success modal state
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [saleResults, setSaleResults] = useState<SaleResult[]>([]);

  const [formData, setFormData] = useState({
    client_id: '',
    payment_method: 'cash' as 'cash' | 'nequi' | 'credit' | 'transfer' | 'card',
    notes: '',
    is_historical: false,
    sale_date: '',  // ISO date string for historical sales
    // Separate date fields for easier input
    sale_day: '',
    sale_month: '',
    sale_year: '',
  });

  const [items, setItems] = useState<SaleItemCreateExtended[]>([]);
  const [currentItem, setCurrentItem] = useState({
    product_id: '',
    quantity: 1,
    unit_price: 0,
    is_global: false,
  });

  useEffect(() => {
    if (isOpen) {
      // Reset school selection when opening
      setSelectedSchoolId(initialSchoolId || currentSchool?.id || availableSchools[0]?.id || '');
      loadProducts(initialSchoolId || currentSchool?.id || availableSchools[0]?.id || '');
      resetForm();
    }
  }, [isOpen]);

  // Pre-load product if initialProduct is provided (for "Start Sale" from Products page)
  useEffect(() => {
    if (isOpen && initialProduct) {
      // Auto-add the initial product to the cart
      const schoolName = getSchoolName(initialProduct.school_id);
      const newItem: SaleItemCreateExtended = {
        product_id: initialProduct.id,
        quantity: initialQuantity,
        unit_price: Number(initialProduct.price),
        is_global: false,
        display_name: initialProduct.name || '',
        size: initialProduct.size,
        school_id: initialProduct.school_id,
        school_name: schoolName,
      };
      setItems([newItem]);
    }
  }, [isOpen, initialProduct]);

  // Handler for school change - reload products but KEEP existing items from other schools
  // This enables multi-school sales: items from different schools stay in the cart
  const handleSchoolChange = async (newSchoolId: string) => {
    setSelectedSchoolId(newSchoolId);
    // DON'T clear items - they belong to their respective schools
    // DON'T reset client - clients are global
    setCurrentItem({ product_id: '', quantity: 1, unit_price: 0, is_global: false });
    setError(null);
    await loadProducts(newSchoolId);
  };

  // Group items by school for display and submission
  const itemsBySchool = useMemo(() => {
    const grouped = new Map<string, SaleItemCreateExtended[]>();
    items.forEach(item => {
      if (!grouped.has(item.school_id)) {
        grouped.set(item.school_id, []);
      }
      grouped.get(item.school_id)!.push(item);
    });
    return grouped;
  }, [items]);

  // Get school name by id
  const getSchoolName = (schoolId: string) => {
    return availableSchools.find(s => s.id === schoolId)?.name || 'Colegio';
  };

  // Get selected school object
  const selectedSchool = availableSchools.find(s => s.id === selectedSchoolId);

  const resetForm = () => {
    setFormData({
      client_id: '',
      payment_method: 'cash',
      notes: '',
      is_historical: false,
      sale_date: '',
      sale_day: '',
      sale_month: '',
      sale_year: '',
    });
    setItems([]);
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      is_global: false,
    });
    setProductSource('school');
    setError(null);
    setShowSuccessModal(false);
    setSaleResults([]);
  };

  const loadProducts = async (schoolIdToLoad?: string) => {
    const targetSchoolId = schoolIdToLoad || selectedSchoolId;
    if (!targetSchoolId) return;

    try {
      const [productsData, globalProductsData] = await Promise.all([
        productService.getProducts(targetSchoolId),
        productService.getGlobalProducts(true),
      ]);
      setProducts(productsData);
      setGlobalProducts(globalProductsData);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Error al cargar productos');
    }
  };

  const handleProductSelect = (productId: string) => {
    if (productSource === 'global') {
      const product = globalProducts.find(p => p.id === productId);
      if (product) {
        setCurrentItem({
          product_id: productId,
          quantity: 1,
          unit_price: Number(product.price),
          is_global: true,
        });
      }
    } else {
      const product = products.find(p => p.id === productId);
      if (product) {
        setCurrentItem({
          product_id: productId,
          quantity: 1,
          unit_price: Number(product.price),
          is_global: false,
        });
      }
    }
  };

  // Handler for ProductSelectorModal selection
  const handleProductSelectorSelect = (product: Product | GlobalProduct, quantity?: number, isGlobalParam?: boolean) => {
    // Use explicit isGlobal param if provided, otherwise detect from product structure
    const isGlobal = isGlobalParam ?? ('inventory_quantity' in product && !('school_id' in product));
    const schoolId = isGlobal ? selectedSchoolId : (product as Product).school_id;
    const schoolName = getSchoolName(schoolId);

    const newItem: SaleItemCreateExtended = {
      product_id: product.id,
      quantity: quantity || 1,
      unit_price: Number(product.price),
      is_global: isGlobal,
      display_name: product.name || '',
      size: product.size,
      school_id: schoolId,
      school_name: schoolName,
    };

    // Check if item already exists, if so, update quantity
    const existingIndex = items.findIndex(
      item => item.product_id === product.id && item.is_global === isGlobal
    );

    if (existingIndex !== -1) {
      const updatedItems = [...items];
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + (quantity || 1),
      };
      setItems(updatedItems);
    } else {
      setItems([...items, newItem]);
    }

    // Close modal
    setProductSelectorOpen(false);
  };

  const handleAddItem = () => {
    if (!currentItem.product_id || currentItem.quantity <= 0) {
      setError('Selecciona un producto y cantidad válida');
      return;
    }

    let productName: string;
    let availableStock: number;
    let displayName: string;

    if (currentItem.is_global) {
      // Handle global product
      const product = globalProducts.find(p => p.id === currentItem.product_id);
      if (!product) {
        setError('Producto global no encontrado');
        return;
      }
      productName = product.name || product.code;
      availableStock = product.inventory_quantity ?? 0;
      const colorInfo = product.color ? ` [${product.color}]` : '';
      displayName = `🌐 ${productName} - ${product.size}${colorInfo} (${product.code})`;
    } else {
      // Handle school product
      const product = products.find(p => p.id === currentItem.product_id);
      if (!product) {
        setError('Producto no encontrado');
        return;
      }
      productName = product.name || product.code;
      availableStock = product.inventory_quantity ?? product.stock ?? 0;
      const colorInfo = product.color ? ` [${product.color}]` : '';
      displayName = `${productName} - ${product.size}${colorInfo} (${product.code})`;
    }

    // Calculate total quantity (existing + new)
    const existingItem = items.find(
      item => item.product_id === currentItem.product_id && item.is_global === currentItem.is_global
    );
    const totalQuantity = (existingItem?.quantity || 0) + currentItem.quantity;

    // Check stock availability (skip for historical sales - they don't affect inventory)
    if (!formData.is_historical && totalQuantity > availableStock) {
      setError(`Stock insuficiente para ${productName}. Disponible: ${availableStock}, solicitado: ${totalQuantity}`);
      return;
    }

    // Check if product already in items (same product, same source, same school)
    const existingIndex = items.findIndex(
      item => item.product_id === currentItem.product_id &&
              item.is_global === currentItem.is_global &&
              item.school_id === selectedSchoolId
    );
    if (existingIndex >= 0) {
      // Update quantity
      const updatedItems = [...items];
      updatedItems[existingIndex].quantity += currentItem.quantity;
      setItems(updatedItems);
    } else {
      // Get product size
      let productSize = '';
      if (currentItem.is_global) {
        const globalProduct = globalProducts.find(p => p.id === currentItem.product_id);
        productSize = globalProduct?.size || '';
      } else {
        const product = products.find(p => p.id === currentItem.product_id);
        productSize = product?.size || '';
      }

      // Add new item with school info
      const newItem: SaleItemCreateExtended = {
        ...currentItem,
        display_name: displayName,
        size: productSize,
        school_id: selectedSchoolId,
        school_name: selectedSchool?.name || getSchoolName(selectedSchoolId),
      };
      setItems([...items, newItem]);
    }

    // Reset current item
    setCurrentItem({
      product_id: '',
      quantity: 1,
      unit_price: 0,
      is_global: false,
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
      setError('Selecciona un cliente o "Sin Cliente"');
      return;
    }

    if (items.length === 0) {
      setError('Agrega al menos un producto a la venta');
      return;
    }

    // Validate historical date fields
    if (formData.is_historical) {
      if (!formData.sale_day || !formData.sale_month || !formData.sale_year) {
        setError('Para ventas históricas debes ingresar día, mes y año');
        return;
      }
      const day = parseInt(formData.sale_day);
      const month = parseInt(formData.sale_month);
      const year = parseInt(formData.sale_year);
      if (day < 1 || day > 31 || month < 1 || month > 12 || year < 2020) {
        setError('La fecha ingresada no es válida');
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      // If "No Client" selected, send null/undefined for client_id
      const clientId = formData.client_id === NO_CLIENT_ID ? undefined : formData.client_id;

      // Build sale date from separate fields
      let saleDateStr: string | undefined = undefined;
      if (formData.is_historical && formData.sale_day && formData.sale_month && formData.sale_year) {
        const day = formData.sale_day.padStart(2, '0');
        const month = formData.sale_month;
        const year = formData.sale_year;
        saleDateStr = `${year}-${month}-${day}T12:00:00`;
      }

      // Multi-school: Create separate sales for each school
      const results: SaleResult[] = [];

      for (const [schoolId, schoolItems] of itemsBySchool.entries()) {
        // Build sale data for this school
        const saleData: SaleCreate = {
          school_id: schoolId,
          client_id: clientId as string, // Will be null in backend
          items: schoolItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: item.unit_price,
            is_global: item.is_global,
          })),
          payment_method: formData.payment_method,
          notes: formData.notes || undefined,
          // Historical sale fields - must be explicit
          is_historical: formData.is_historical === true,
          sale_date: saleDateStr,
        };

        console.log(`Creating sale for school ${schoolId}:`, {
          is_historical: saleData.is_historical,
          sale_date: saleData.sale_date,
          items_count: saleData.items.length
        });

        const response = await saleService.createSale(schoolId, saleData);

        // Calculate school total
        const schoolTotal = schoolItems.reduce(
          (sum, item) => sum + (item.quantity * item.unit_price),
          0
        );

        results.push({
          schoolName: schoolItems[0].school_name,
          saleCode: response.code,
          total: schoolTotal,
          saleId: response.id,
        });
      }

      // Show success modal with results
      setSaleResults(results);
      setShowSuccessModal(true);

    } catch (err: any) {
      console.error('Error creating sale:', err);
      setError(err.response?.data?.detail || 'Error al crear la venta');
    } finally {
      setLoading(false);
    }
  };

  // Handle closing success modal
  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSaleResults([]);
    onSuccess();
    onClose();
  };

  const getProductName = (productId: string, isGlobal: boolean = false) => {
    if (isGlobal) {
      const product = globalProducts.find(p => p.id === productId);
      return product ? `🌐 ${product.name} - ${product.size} (${product.code})` : productId;
    }
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
              {/* School Selector - Only show when multiple schools available */}
              {showSchoolSelector && (
                <div className="md:col-span-2 mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <Building2 className="w-4 h-4 inline mr-1" />
                    Colegio *
                  </label>
                  <select
                    value={selectedSchoolId}
                    onChange={(e) => handleSchoolChange(e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50"
                  >
                    {availableSchools.map(school => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-blue-600">
                    Los productos y clientes se cargan del colegio seleccionado
                  </p>
                </div>
              )}

              {/* Client */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <ClientSelector
                  value={formData.client_id}
                  onChange={(clientId) => setFormData({ ...formData, client_id: clientId })}
                  schoolId={selectedSchoolId}
                  allowNoClient={true}
                  placeholder="Buscar cliente por nombre, teléfono..."
                />
                {formData.client_id === NO_CLIENT_ID && (
                  <p className="mt-1 text-xs text-orange-600 flex items-center">
                    <UserX className="w-3 h-3 mr-1" />
                    La venta se registrará sin cliente asociado
                  </p>
                )}
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
                  <option value="nequi">Nequi</option>
                  <option value="transfer">Transferencia</option>
                  <option value="card">Tarjeta</option>
                  <option value="credit">Crédito</option>
                </select>
              </div>
            </div>

            {/* Historical Sale Section */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <div className="flex items-start gap-3">
                <div className="flex items-center h-5 mt-0.5">
                  <input
                    id="is_historical"
                    type="checkbox"
                    checked={formData.is_historical}
                    onChange={(e) => setFormData({
                      ...formData,
                      is_historical: e.target.checked,
                      sale_date: e.target.checked ? formData.sale_date : '',
                      sale_day: e.target.checked ? formData.sale_day : '',
                      sale_month: e.target.checked ? formData.sale_month : '',
                      sale_year: e.target.checked ? formData.sale_year : '',
                    })}
                    className="w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500"
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="is_historical" className="text-sm font-semibold text-amber-800 flex items-center cursor-pointer">
                    <History className="w-4 h-4 mr-2" />
                    Venta Histórica (Migración de datos)
                  </label>
                  <p className="text-xs text-amber-700 mt-1">
                    Las ventas históricas NO afectan el inventario actual y permiten establecer una fecha pasada.
                    Útil para migrar registros de ventas anteriores.
                  </p>
                </div>
              </div>

              {/* Date inputs for Historical Sales */}
              {formData.is_historical && (
                <div className="mt-4 pl-7">
                  <label className="block text-sm font-medium text-amber-800 mb-2">
                    <Calendar className="w-4 h-4 inline mr-1" />
                    Fecha de la venta *
                  </label>
                  <div className="flex items-center gap-2">
                    {/* Day */}
                    <div>
                      <input
                        type="number"
                        placeholder="Día"
                        min="1"
                        max="31"
                        value={formData.sale_day}
                        onChange={(e) => setFormData({ ...formData, sale_day: e.target.value })}
                        className="w-20 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white text-center"
                      />
                      <p className="text-xs text-amber-600 mt-1 text-center">Día</p>
                    </div>
                    <span className="text-amber-600 text-xl font-bold">/</span>
                    {/* Month */}
                    <div>
                      <select
                        value={formData.sale_month}
                        onChange={(e) => setFormData({ ...formData, sale_month: e.target.value })}
                        className="w-32 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white"
                      >
                        <option value="">Mes</option>
                        <option value="01">Enero</option>
                        <option value="02">Febrero</option>
                        <option value="03">Marzo</option>
                        <option value="04">Abril</option>
                        <option value="05">Mayo</option>
                        <option value="06">Junio</option>
                        <option value="07">Julio</option>
                        <option value="08">Agosto</option>
                        <option value="09">Septiembre</option>
                        <option value="10">Octubre</option>
                        <option value="11">Noviembre</option>
                        <option value="12">Diciembre</option>
                      </select>
                      <p className="text-xs text-amber-600 mt-1 text-center">Mes</p>
                    </div>
                    <span className="text-amber-600 text-xl font-bold">/</span>
                    {/* Year */}
                    <div>
                      <input
                        type="number"
                        placeholder="Año"
                        min="2020"
                        max={new Date().getFullYear()}
                        value={formData.sale_year}
                        onChange={(e) => setFormData({ ...formData, sale_year: e.target.value })}
                        className="w-24 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white text-center"
                      />
                      <p className="text-xs text-amber-600 mt-1 text-center">Año</p>
                    </div>
                  </div>
                  <p className="text-xs text-amber-600 mt-2">
                    Ingresa la fecha real en que se realizó esta venta
                  </p>
                </div>
              )}
            </div>

            {/* Add Product Section */}
            <div className="border-t border-gray-200 pt-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Agregar Productos</h3>

              {/* Product Source Tabs */}
              <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setProductSource('school');
                    setCurrentItem({ ...currentItem, product_id: '', is_global: false });
                  }}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${
                    productSource === 'school'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Building className="w-4 h-4 mr-2" />
                  Productos del Colegio ({products.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setProductSource('global');
                    setCurrentItem({ ...currentItem, product_id: '', is_global: true });
                  }}
                  className={`flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${
                    productSource === 'global'
                      ? 'bg-white text-purple-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  Productos Globales ({globalProducts.length})
                </button>
              </div>

              {/* Product Selector Button */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Agregar Productos
                </label>
                <button
                  type="button"
                  onClick={() => setProductSelectorOpen(true)}
                  className="w-full px-6 py-4 border-2 border-dashed border-blue-400 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition flex flex-col items-center gap-2 group"
                >
                  <Package className="w-8 h-8 text-blue-500 group-hover:text-blue-600" />
                  <span className="text-sm font-medium text-blue-600 group-hover:text-blue-700">
                    Buscar y agregar productos
                  </span>
                  <span className="text-xs text-gray-500">
                    Click para abrir el catálogo
                  </span>
                </button>
              </div>

              {/* Legacy product add section - keeping old flow temporarily */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4" style={{ display: 'none' }}>
                {/* Hidden old selector for backwards compatibility */}
                <div className="md:col-span-2"></div>

                {/* Quantity */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cantidad
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={currentItem.quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      // Allow empty string while typing, default to 1 when empty
                      const num = val === '' ? 1 : parseInt(val, 10);
                      setCurrentItem({ ...currentItem, quantity: isNaN(num) ? 1 : Math.max(1, num) });
                    }}
                    onFocus={(e) => e.target.select()}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                  />
                </div>

                {/* Add Button */}
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!currentItem.product_id}
                    className={`w-full px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                      productSource === 'global'
                        ? 'bg-purple-600 hover:bg-purple-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </button>
                </div>
              </div>
            </div>

            {/* Items List - Grouped by School for multi-school support */}
            {items.length > 0 && (
              <div className="border-t border-gray-200 pt-6 mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  Productos en la Venta
                  {itemsBySchool.size > 1 && (
                    <span className="ml-2 text-sm font-normal text-blue-600">
                      ({itemsBySchool.size} colegios)
                    </span>
                  )}
                </h3>

                {/* Items grouped by school */}
                <div className="space-y-4">
                  {Array.from(itemsBySchool.entries()).map(([schoolId, schoolItems]) => {
                    const schoolTotal = schoolItems.reduce(
                      (sum, item) => sum + (item.quantity * item.unit_price),
                      0
                    );
                    return (
                      <div key={schoolId} className="border border-gray-200 rounded-lg overflow-hidden">
                        {/* School header - only show if multiple schools */}
                        {itemsBySchool.size > 1 && (
                          <div className="bg-blue-50 px-4 py-2 flex items-center justify-between border-b border-blue-200">
                            <span className="font-medium text-blue-800 flex items-center">
                              <Building2 className="w-4 h-4 mr-2" />
                              {schoolItems[0].school_name}
                            </span>
                            <span className="text-sm text-blue-600 font-medium">
                              Subtotal: ${schoolTotal.toLocaleString()}
                            </span>
                          </div>
                        )}

                        {/* Items for this school */}
                        <div className="divide-y divide-gray-100">
                          {schoolItems.map((item) => {
                            // Find original index for removal
                            const originalIndex = items.findIndex(
                              i => i.product_id === item.product_id &&
                                   i.school_id === item.school_id &&
                                   i.is_global === item.is_global
                            );
                            return (
                              <div
                                key={`${item.school_id}-${item.product_id}-${item.is_global}`}
                                className={`flex items-center justify-between p-3 ${
                                  item.is_global ? 'bg-purple-50' : 'bg-white'
                                }`}
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900">
                                    {item.display_name || getProductName(item.product_id, item.is_global)}
                                    {item.is_global && (
                                      <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                                        Global
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {item.size && <span className="font-medium">Talla: {item.size} | </span>}
                                    Cantidad: {item.quantity} × ${item.unit_price.toLocaleString()} = ${(item.quantity * item.unit_price).toLocaleString()}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveItem(originalIndex)}
                                  className="ml-4 text-red-600 hover:text-red-800 transition"
                                >
                                  <Trash2 className="w-5 h-5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Total */}
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-gray-900">
                      {itemsBySchool.size > 1 ? 'Total General:' : 'Total:'}
                    </span>
                    <span className="text-2xl font-bold text-blue-600">
                      ${calculateTotal().toLocaleString()}
                    </span>
                  </div>
                  {itemsBySchool.size > 1 && (
                    <p className="text-sm text-gray-500 mt-1">
                      Se crearán {itemsBySchool.size} ventas separadas (una por colegio)
                    </p>
                  )}
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
                  itemsBySchool.size > 1 ? `Crear ${itemsBySchool.size} Ventas` : 'Crear Venta'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Success Modal for Multi-School Sales */}
      {showSuccessModal && saleResults.length > 0 && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={handleCloseSuccessModal} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">
                {saleResults.length === 1
                  ? 'Venta Creada Exitosamente'
                  : `${saleResults.length} Ventas Creadas Exitosamente`}
              </h3>
            </div>

            {/* Sales Results */}
            <div className="space-y-3 mb-6">
              {saleResults.map((result, index) => (
                <div
                  key={index}
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  {saleResults.length > 1 && (
                    <div className="flex items-center text-sm text-blue-600 mb-2">
                      <Building2 className="w-4 h-4 mr-1" />
                      {result.schoolName}
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-lg font-bold text-gray-900">
                      {result.saleCode}
                    </span>
                    <span className="text-lg font-semibold text-green-600">
                      ${result.total.toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Total Summary */}
            {saleResults.length > 1 && (
              <div className="border-t border-gray-200 pt-4 mb-6">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Total General:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${saleResults.reduce((sum, r) => sum + r.total, 0).toLocaleString()}
                  </span>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCloseSuccessModal}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Group Selector - Grouped by garment type */}
      <ProductGroupSelector
        isOpen={productSelectorOpen}
        onClose={() => setProductSelectorOpen(false)}
        onSelect={handleProductSelectorSelect}
        schoolId={selectedSchoolId}
        filterByStock={formData.is_historical ? 'all' : 'with_stock'}
        excludeProductIds={items.map(i => i.product_id)}
        allowGlobalProducts={true}
        initialProductSource={productSource}
        title="Seleccionar Producto"
        emptyMessage="No se encontraron productos disponibles"
      />
    </div>
  );
}
