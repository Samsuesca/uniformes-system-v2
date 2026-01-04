import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Order Modal - Create new orders (encargos) with 3 order types
 * - Catalog: Select product from catalog (for out of stock items)
 * - Yomber: Custom measurements required
 * - Custom: Manual price for special items
 * Supports multi-school: allows adding items from different schools in a single transaction.
 * Creates separate orders (one per school) when items span multiple schools.
 */
import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Plus, Trash2, Package, AlertCircle, Calendar, ShoppingBag, Ruler, Settings, Building2, CheckCircle } from 'lucide-react';
import DatePicker from './DatePicker';
import ClientSelector from './ClientSelector';
import ProductSelectorModal from './ProductSelectorModal';
import { orderService } from '../services/orderService';
import { productService } from '../services/productService';
import { useSchoolStore } from '../stores/schoolStore';
import YomberMeasurementsForm, { validateYomberMeasurements } from './YomberMeasurementsForm';
export default function OrderModal({ isOpen, onClose, onSuccess, initialSchoolId, initialProduct }) {
    // Multi-school support
    const { availableSchools, currentSchool } = useSchoolStore();
    const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId || currentSchool?.id || availableSchools[0]?.id || '');
    const showSchoolSelector = availableSchools.length > 1;
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [products, setProducts] = useState([]);
    const [error, setError] = useState(null);
    // Multi-school success modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [orderResults, setOrderResults] = useState([]);
    // Form state
    const [clientId, setClientId] = useState('');
    const [deliveryDate, setDeliveryDate] = useState('');
    const [notes, setNotes] = useState('');
    const [advancePayment, setAdvancePayment] = useState(0);
    const [advancePaymentMethod, setAdvancePaymentMethod] = useState('cash');
    const [items, setItems] = useState([]);
    // Tab state
    const [activeTab, setActiveTab] = useState('catalog');
    // Product selector modal states
    const [catalogProductSelectorOpen, setCatalogProductSelectorOpen] = useState(false);
    const [yomberProductSelectorOpen, setYomberProductSelectorOpen] = useState(false);
    // Catalog tab state
    const [catalogProductId, setCatalogProductId] = useState('');
    const [catalogQuantity, setCatalogQuantity] = useState(1);
    const [catalogGarmentFilter, setCatalogGarmentFilter] = useState('');
    // Yomber tab state - simplified: just select a yomber product directly
    const [yomberProductId, setYomberProductId] = useState('');
    const [yomberQuantity, setYomberQuantity] = useState(1);
    const [yomberMeasurements, setYomberMeasurements] = useState({});
    const [yomberAdditionalPrice, setYomberAdditionalPrice] = useState(0);
    const [yomberEmbroideryText, setYomberEmbroideryText] = useState('');
    // Custom tab state
    const [customGarmentTypeId, setCustomGarmentTypeId] = useState('');
    const [customQuantity, setCustomQuantity] = useState(1);
    const [customSize, setCustomSize] = useState('');
    const [customColor, setCustomColor] = useState('');
    const [customPrice, setCustomPrice] = useState(0);
    const [customNotes, setCustomNotes] = useState('');
    const [customEmbroideryText, setCustomEmbroideryText] = useState('');
    // Get yomber garment type IDs (those with has_custom_measurements = true)
    const yomberGarmentTypeIds = useMemo(() => {
        return garmentTypes
            .filter(gt => gt.has_custom_measurements)
            .map(gt => gt.id);
    }, [garmentTypes]);
    // Filter yomber products - only products whose garment type has has_custom_measurements = true
    const yomberProducts = useMemo(() => {
        return products.filter(p => yomberGarmentTypeIds.includes(p.garment_type_id));
    }, [products, yomberGarmentTypeIds]);
    // Non-yomber garment types for catalog filter (exclude yomber types)
    const catalogGarmentTypes = useMemo(() => {
        return garmentTypes.filter(gt => !gt.has_custom_measurements);
    }, [garmentTypes]);
    // Filter catalog products:
    // 1. Exclude yomber products (they have their own tab)
    // 2. Only show products with stock = 0 (orders are for out-of-stock items)
    // 3. Apply garment type filter if selected
    const filteredCatalogProducts = useMemo(() => {
        return products.filter(p => {
            // Exclude yomber products
            if (yomberGarmentTypeIds.includes(p.garment_type_id))
                return false;
            // Only show products without stock (orders are for out-of-stock items)
            const stock = p.stock ?? p.inventory_quantity ?? 0;
            if (stock > 0)
                return false;
            // Apply garment type filter
            if (catalogGarmentFilter && p.garment_type_id !== catalogGarmentFilter)
                return false;
            return true;
        });
    }, [products, yomberGarmentTypeIds, catalogGarmentFilter]);
    useEffect(() => {
        if (isOpen) {
            // Reset school selection when opening
            setSelectedSchoolId(initialSchoolId || currentSchool?.id || availableSchools[0]?.id || '');
            loadData(initialSchoolId || currentSchool?.id || availableSchools[0]?.id || '');
            resetForm();
        }
    }, [isOpen]);
    // Pre-load product when initialProduct is provided
    useEffect(() => {
        if (isOpen && initialProduct && products.length > 0) {
            // Set to catalog tab
            setActiveTab('catalog');
            // Pre-select the product
            setCatalogProductId(initialProduct.id);
            // Auto-add to items with quantity 1
            handleCatalogProductSelect(initialProduct, 1);
        }
    }, [isOpen, initialProduct, products]);
    // Handler for school change - reload products but KEEP existing items from other schools
    // This enables multi-school orders: items from different schools stay in the cart
    const handleSchoolChange = async (newSchoolId) => {
        setSelectedSchoolId(newSchoolId);
        // DON'T clear items - they belong to their respective schools
        // DON'T reset client - clients are global
        resetCatalogForm();
        resetYomberForm();
        resetCustomForm();
        setError(null);
        await loadData(newSchoolId);
    };
    // Group items by school for display and submission
    const itemsBySchool = useMemo(() => {
        const grouped = new Map();
        items.forEach(item => {
            if (!grouped.has(item.school_id)) {
                grouped.set(item.school_id, []);
            }
            grouped.get(item.school_id).push(item);
        });
        return grouped;
    }, [items]);
    // Get school name by id
    const getSchoolName = (schoolId) => {
        return availableSchools.find(s => s.id === schoolId)?.name || 'Colegio';
    };
    // Get selected school object
    const selectedSchool = availableSchools.find(s => s.id === selectedSchoolId);
    const loadData = async (schoolIdToLoad) => {
        const targetSchoolId = schoolIdToLoad || selectedSchoolId;
        if (!targetSchoolId)
            return;
        try {
            setLoadingData(true);
            const [garmentTypesData, productsData] = await Promise.all([
                productService.getGarmentTypes(targetSchoolId),
                productService.getProducts(targetSchoolId),
            ]);
            setGarmentTypes(garmentTypesData);
            setProducts(productsData);
        }
        catch (err) {
            console.error('Error loading data:', err);
            setError('Error al cargar datos');
        }
        finally {
            setLoadingData(false);
        }
    };
    const resetForm = () => {
        setClientId('');
        setDeliveryDate('');
        setNotes('');
        setAdvancePayment(0);
        setAdvancePaymentMethod('cash');
        setItems([]);
        setError(null);
        setActiveTab('catalog');
        resetCatalogForm();
        resetYomberForm();
        resetCustomForm();
        setShowSuccessModal(false);
        setOrderResults([]);
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
    const handleCatalogProductSelect = (product, quantity) => {
        const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
        const item = {
            tempId: Date.now().toString(),
            order_type: 'catalog',
            garment_type_id: product.garment_type_id,
            product_id: product.id,
            quantity: quantity || 1,
            size: product.size,
            color: product.color || undefined,
            displayName: `${garmentType?.name || 'Producto'} - ${product.size}${product.color ? ` (${product.color})` : ''}`,
            unitPrice: Number(product.price),
            school_id: selectedSchoolId,
            school_name: selectedSchool?.name || getSchoolName(selectedSchoolId),
        };
        setItems([...items, item]);
        setCatalogProductSelectorOpen(false);
        setError(null);
    };
    const handleAddCatalogItem = () => {
        if (!catalogProductId) {
            setError('Selecciona un producto');
            return;
        }
        const product = products.find(p => p.id === catalogProductId);
        if (!product)
            return;
        const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
        const item = {
            tempId: Date.now().toString(),
            order_type: 'catalog',
            garment_type_id: product.garment_type_id,
            product_id: product.id,
            quantity: catalogQuantity,
            size: product.size,
            color: product.color || undefined,
            displayName: `${garmentType?.name || 'Producto'} - ${product.size}${product.color ? ` (${product.color})` : ''}`,
            unitPrice: Number(product.price),
            school_id: selectedSchoolId,
            school_name: selectedSchool?.name || getSchoolName(selectedSchoolId),
        };
        setItems([...items, item]);
        resetCatalogForm();
        setError(null);
    };
    const handleYomberProductSelect = (product, quantity) => {
        // Set the selected yomber product - measurements will be filled afterwards
        setYomberProductId(product.id);
        setYomberQuantity(quantity || 1);
        setYomberProductSelectorOpen(false);
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
        if (!product)
            return;
        const basePrice = Number(product.price);
        const totalPrice = basePrice + yomberAdditionalPrice;
        const item = {
            tempId: Date.now().toString(),
            order_type: 'yomber',
            garment_type_id: product.garment_type_id,
            product_id: product.id,
            quantity: yomberQuantity,
            size: product.size,
            custom_measurements: yomberMeasurements,
            additional_price: yomberAdditionalPrice > 0 ? yomberAdditionalPrice : undefined,
            embroidery_text: yomberEmbroideryText || undefined,
            displayName: `Yomber ${product.size} (sobre-medida)`,
            unitPrice: totalPrice,
            school_id: selectedSchoolId,
            school_name: selectedSchool?.name || getSchoolName(selectedSchoolId),
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
        const item = {
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
            school_id: selectedSchoolId,
            school_name: selectedSchool?.name || getSchoolName(selectedSchoolId),
        };
        setItems([...items, item]);
        resetCustomForm();
        setError(null);
    };
    const handleRemoveItem = (tempId) => {
        setItems(items.filter(item => item.tempId !== tempId));
    };
    const calculateTotal = () => {
        return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    };
    const handleSubmit = async (e) => {
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
            // Multi-school: Create separate orders for each school
            const results = [];
            // Calculate advance payment per school (proportional to school total)
            const grandTotal = calculateTotal();
            for (const [schoolId, schoolItems] of itemsBySchool.entries()) {
                const schoolTotal = schoolItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
                // Proportional advance payment
                const schoolAdvance = grandTotal > 0
                    ? Math.round((schoolTotal / grandTotal) * advancePayment)
                    : 0;
                const orderItems = schoolItems.map(item => ({
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
                console.log(`Creating order for school ${schoolId}:`, {
                    items_count: orderItems.length,
                    total: schoolTotal,
                    advance: schoolAdvance,
                });
                const response = await orderService.createOrder(schoolId, {
                    school_id: schoolId,
                    client_id: clientId,
                    delivery_date: deliveryDate || undefined,
                    notes: notes || undefined,
                    items: orderItems,
                    advance_payment: schoolAdvance > 0 ? schoolAdvance : undefined,
                    advance_payment_method: schoolAdvance > 0 ? advancePaymentMethod : undefined,
                });
                results.push({
                    schoolName: schoolItems[0].school_name,
                    orderCode: response.code,
                    total: schoolTotal,
                    orderId: response.id,
                });
            }
            // Show success modal with results
            setOrderResults(results);
            setShowSuccessModal(true);
        }
        catch (err) {
            console.error('Error creating order:', err);
            let errorMessage = 'Error al crear el encargo';
            if (err.response?.data?.detail) {
                if (typeof err.response.data.detail === 'string') {
                    errorMessage = err.response.data.detail;
                }
                else if (Array.isArray(err.response.data.detail)) {
                    errorMessage = err.response.data.detail.map((e) => e.msg || e.message || JSON.stringify(e)).join(', ');
                }
            }
            setError(errorMessage);
        }
        finally {
            setLoading(false);
        }
    };
    // Handle closing success modal
    const handleCloseSuccessModal = () => {
        setShowSuccessModal(false);
        setOrderResults([]);
        onSuccess();
        onClose();
    };
    const getOrderTypeBadge = (orderType) => {
        switch (orderType) {
            case 'catalog':
                return _jsx("span", { className: "px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded", children: "Catalogo" });
            case 'yomber':
                return _jsx("span", { className: "px-1.5 py-0.5 text-xs bg-purple-100 text-purple-700 rounded", children: "Yomber" });
            case 'custom':
                return _jsx("span", { className: "px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded", children: "Personal." });
            default:
                return null;
        }
    };
    if (!isOpen)
        return null;
    const total = calculateTotal();
    const balance = total - advancePayment;
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: onClose }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-800 flex items-center", children: [_jsx(Package, { className: "w-6 h-6 mr-2 text-blue-600" }), "Nuevo Encargo"] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), loadingData && (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando datos..." })] })), !loadingData && (_jsxs("form", { onSubmit: handleSubmit, className: "p-6", children: [error && (_jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-start", children: [_jsx(AlertCircle, { className: "w-5 h-5 text-red-600 mr-2 flex-shrink-0 mt-0.5" }), _jsx("p", { className: "text-sm text-red-700", children: error })] })), showSchoolSelector && (_jsxs("div", { className: "mb-6", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: [_jsx(Building2, { className: "w-4 h-4 inline mr-1" }), "Colegio *"] }), _jsx("select", { value: selectedSchoolId, onChange: (e) => handleSchoolChange(e.target.value), className: "w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50", children: availableSchools.map(school => (_jsx("option", { value: school.id, children: school.name }, school.id))) }), _jsx("p", { className: "mt-1 text-xs text-blue-600", children: "Los productos, tipos de prenda y clientes se cargan del colegio seleccionado" })] })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Cliente *" }), _jsx(ClientSelector, { value: clientId, onChange: (id) => setClientId(id), schoolId: selectedSchoolId, allowNoClient: false, placeholder: "Buscar cliente por nombre, tel\u00E9fono..." })] }), _jsxs("div", { className: "mb-6", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: [_jsx(Calendar, { className: "w-4 h-4 inline mr-1" }), "Fecha de Entrega"] }), _jsx(DatePicker, { value: deliveryDate, onChange: (value) => setDeliveryDate(value), minDate: new Date().toISOString().split('T')[0], placeholder: "Selecciona fecha de entrega" })] }), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-3", children: "Agregar Items al Encargo" }), _jsxs("div", { className: "flex border-b border-gray-200 mb-4", children: [_jsxs("button", { type: "button", onClick: () => setActiveTab('catalog'), className: `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'catalog'
                                                        ? 'border-blue-500 text-blue-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(ShoppingBag, { className: "w-4 h-4 mr-2" }), "Catalogo"] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('yomber'), className: `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'yomber'
                                                        ? 'border-purple-500 text-purple-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Ruler, { className: "w-4 h-4 mr-2" }), "Yomber"] }), _jsxs("button", { type: "button", onClick: () => setActiveTab('custom'), className: `flex items-center px-4 py-2 text-sm font-medium border-b-2 transition ${activeTab === 'custom'
                                                        ? 'border-orange-500 text-orange-600'
                                                        : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Settings, { className: "w-4 h-4 mr-2" }), "Personalizado"] })] }), _jsxs("div", { className: "bg-gray-50 rounded-lg p-4", children: [activeTab === 'catalog' && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-gray-600 mb-3", children: "Selecciona un producto del catalogo. Ideal para productos agotados o pedidos web." }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-2", children: "Producto del Cat\u00E1logo *" }), _jsxs("button", { type: "button", onClick: () => setCatalogProductSelectorOpen(true), className: "w-full px-6 py-4 border-2 border-dashed border-blue-400 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition flex flex-col items-center gap-2 group", children: [_jsx(Package, { className: "w-8 h-8 text-blue-500 group-hover:text-blue-600" }), _jsx("span", { className: "text-sm font-medium text-blue-600 group-hover:text-blue-700", children: "Buscar producto del cat\u00E1logo" }), _jsx("span", { className: "text-xs text-gray-500", children: "Click para abrir el selector" })] })] }), _jsx("p", { className: "text-xs text-gray-500 text-center", children: "Los productos se agregan directamente desde el selector" })] })), activeTab === 'yomber' && (_jsx("div", { className: "space-y-4", children: yomberProducts.length === 0 ? (_jsxs("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center", children: [_jsx(AlertCircle, { className: "w-8 h-8 text-yellow-500 mx-auto mb-2" }), _jsx("p", { className: "text-sm text-yellow-700 font-medium", children: "No hay productos Yomber configurados" }), _jsx("p", { className: "text-xs text-yellow-600 mt-1", children: "Configura tipos de prenda con \"medidas personalizadas\" para habilitar yombers" })] })) : (_jsxs(_Fragment, { children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Selecciona el Yomber *" }), _jsxs("button", { type: "button", onClick: () => setYomberProductSelectorOpen(true), className: "w-full px-4 py-2 border-2 border-dashed border-purple-300 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition text-sm text-purple-600 hover:text-purple-700 font-medium flex items-center justify-center gap-2", children: [_jsx(Ruler, { className: "w-4 h-4" }), yomberProductId ? 'Cambiar producto' : 'Seleccionar producto yomber'] })] }), yomberProductId && (_jsx("div", { className: "bg-purple-50 border border-purple-200 rounded-lg p-3", children: (() => {
                                                                    const product = products.find(p => p.id === yomberProductId);
                                                                    if (!product)
                                                                        return null;
                                                                    const garmentType = garmentTypes.find(gt => gt.id === product.garment_type_id);
                                                                    return (_jsxs("div", { className: "text-sm", children: [_jsxs("p", { className: "font-medium text-purple-900", children: [garmentType?.name, " - Talla ", product.size] }), _jsxs("p", { className: "text-purple-700", children: ["Precio base: $", Number(product.price).toLocaleString()] })] }));
                                                                })() })), yomberProductId && (_jsxs(_Fragment, { children: [_jsx(YomberMeasurementsForm, { measurements: yomberMeasurements, onChange: setYomberMeasurements }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Cantidad *" }), _jsx("input", { type: "number", min: "1", value: yomberQuantity, onChange: (e) => setYomberQuantity(parseInt(e.target.value) || 1), className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Adicional (opcional)" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", children: "$" }), _jsx("input", { type: "number", min: "0", value: yomberAdditionalPrice || '', onChange: (e) => setYomberAdditionalPrice(parseInt(e.target.value) || 0), placeholder: "0", className: "w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm" })] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Texto Bordado" }), _jsx("input", { type: "text", value: yomberEmbroideryText, onChange: (e) => setYomberEmbroideryText(e.target.value), placeholder: "Nombre para bordar", className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })] }), (() => {
                                                                        const product = products.find(p => p.id === yomberProductId);
                                                                        if (!product)
                                                                            return null;
                                                                        const basePrice = Number(product.price);
                                                                        const totalPrice = (basePrice + yomberAdditionalPrice) * yomberQuantity;
                                                                        return (_jsxs("div", { className: "bg-purple-100 border border-purple-300 rounded-lg p-3 text-center", children: [_jsxs("p", { className: "text-sm text-purple-700", children: [yomberQuantity, "x $", (basePrice + yomberAdditionalPrice).toLocaleString()] }), _jsxs("p", { className: "font-bold text-lg text-purple-900", children: ["Total: $", totalPrice.toLocaleString()] })] }));
                                                                    })(), _jsxs("button", { type: "button", onClick: handleAddYomberItem, className: "w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center font-medium", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Agregar Yomber"] })] }))] })) })), activeTab === 'custom' && (_jsxs("div", { className: "space-y-4", children: [_jsx("p", { className: "text-sm text-gray-600 mb-3", children: "Para productos fuera del catalogo, tallas especiales, o con modificaciones. Precio manual requerido." }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Tipo de Prenda *" }), _jsxs("select", { value: customGarmentTypeId, onChange: (e) => setCustomGarmentTypeId(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm", children: [_jsx("option", { value: "", children: "Selecciona tipo" }), garmentTypes.map((gt) => (_jsx("option", { value: gt.id, children: gt.name }, gt.id)))] })] }), _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Talla" }), _jsx("input", { type: "text", value: customSize, onChange: (e) => setCustomSize(e.target.value), placeholder: "ej: XL, 2, 18", className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Color" }), _jsx("input", { type: "text", value: customColor, onChange: (e) => setCustomColor(e.target.value), placeholder: "ej: Azul marino", className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Precio Unitario *" }), _jsxs("div", { className: "relative", children: [_jsx("span", { className: "absolute left-3 top-1/2 -translate-y-1/2 text-gray-400", children: "$" }), _jsx("input", { type: "number", min: "0", value: customPrice || '', onChange: (e) => setCustomPrice(parseInt(e.target.value) || 0), placeholder: "Ingresa el precio", className: "w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm" })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Texto Bordado" }), _jsx("input", { type: "text", value: customEmbroideryText, onChange: (e) => setCustomEmbroideryText(e.target.value), placeholder: "Nombre para bordar", className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Notas / Especificaciones" }), _jsx("textarea", { value: customNotes, onChange: (e) => setCustomNotes(e.target.value), placeholder: "Detalles especiales, modificaciones, etc.", rows: 2, className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-xs text-gray-600 mb-1", children: "Cantidad *" }), _jsx("input", { type: "number", min: "1", value: customQuantity, onChange: (e) => setCustomQuantity(parseInt(e.target.value) || 1), className: "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" })] }), _jsxs("button", { type: "button", onClick: handleAddCustomItem, className: "w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center", children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Agregar Personalizado"] })] }))] })] }), items.length > 0 && (_jsxs("div", { className: "mb-6", children: [_jsxs("h4", { className: "text-sm font-medium text-gray-700 mb-3", children: ["Items del Encargo (", items.length, ")", itemsBySchool.size > 1 && (_jsxs("span", { className: "ml-2 text-sm font-normal text-blue-600", children: ["(", itemsBySchool.size, " colegios)"] }))] }), _jsx("div", { className: "space-y-4", children: Array.from(itemsBySchool.entries()).map(([schoolId, schoolItems]) => {
                                                const schoolTotal = schoolItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
                                                return (_jsxs("div", { className: "border border-gray-200 rounded-lg overflow-hidden", children: [itemsBySchool.size > 1 && (_jsxs("div", { className: "bg-blue-50 px-4 py-2 flex items-center justify-between border-b border-blue-200", children: [_jsxs("span", { className: "font-medium text-blue-800 flex items-center", children: [_jsx(Building2, { className: "w-4 h-4 mr-2" }), schoolItems[0].school_name] }), _jsxs("span", { className: "text-sm text-blue-600 font-medium", children: ["Subtotal: $", schoolTotal.toLocaleString()] })] })), _jsx("div", { className: "bg-gray-50 p-4 overflow-x-auto", children: _jsxs("table", { className: "w-full min-w-[500px]", children: [_jsx("thead", { children: _jsxs("tr", { className: "text-xs text-gray-500 uppercase", children: [_jsx("th", { className: "text-left pb-2", children: "Item" }), _jsx("th", { className: "text-center pb-2", children: "Tipo" }), _jsx("th", { className: "text-center pb-2", children: "Cant." }), _jsx("th", { className: "text-right pb-2", children: "Precio" }), _jsx("th", { className: "text-right pb-2", children: "Subtotal" }), _jsx("th", { className: "pb-2" })] }) }), _jsx("tbody", { className: "divide-y divide-gray-200", children: schoolItems.map((item) => (_jsxs("tr", { className: "text-sm", children: [_jsx("td", { className: "py-2", children: _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: item.displayName }), item.embroidery_text && (_jsxs("p", { className: "text-xs text-gray-500", children: ["Bordado: ", item.embroidery_text] })), item.custom_measurements && (_jsx("p", { className: "text-xs text-purple-600", children: "Con medidas personalizadas" }))] }) }), _jsx("td", { className: "py-2 text-center", children: getOrderTypeBadge(item.order_type) }), _jsx("td", { className: "py-2 text-center", children: item.quantity }), _jsxs("td", { className: "py-2 text-right", children: ["$", item.unitPrice.toLocaleString()] }), _jsxs("td", { className: "py-2 text-right font-medium", children: ["$", (item.unitPrice * item.quantity).toLocaleString()] }), _jsx("td", { className: "py-2 text-right", children: _jsx("button", { type: "button", onClick: () => handleRemoveItem(item.tempId), className: "text-red-500 hover:text-red-700 p-1", children: _jsx(Trash2, { className: "w-4 h-4" }) }) })] }, item.tempId))) })] }) })] }, schoolId));
                                            }) }), itemsBySchool.size > 1 && (_jsxs("p", { className: "text-sm text-gray-500 mt-3", children: ["Se crear\u00E1n ", itemsBySchool.size, " encargos separados (uno por colegio)"] }))] })), items.length > 0 && (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 mb-6", children: [_jsxs("div", { className: "flex justify-between items-center mb-3", children: [_jsx("span", { className: "text-gray-600", children: "Subtotal:" }), _jsxs("span", { className: "font-medium", children: ["$", total.toLocaleString()] })] }), _jsxs("div", { className: "mb-3", children: [_jsxs("div", { className: "flex items-center justify-between mb-2", children: [_jsx("span", { className: "text-gray-600", children: "Anticipo:" }), _jsxs("span", { className: "font-medium text-green-600", children: ["$", advancePayment.toLocaleString()] })] }), _jsx("div", { className: "flex gap-2 mb-2", children: [0, 30, 50, 100].map((pct) => (_jsx("button", { type: "button", onClick: () => setAdvancePayment(Math.round(total * pct / 100)), className: `flex-1 py-1.5 text-xs font-medium rounded transition ${advancePayment === Math.round(total * pct / 100)
                                                            ? 'bg-blue-600 text-white'
                                                            : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: pct === 0 ? 'Sin anticipo' : pct === 100 ? 'Pago total' : `${pct}%` }, pct))) }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs text-gray-500", children: "Otro monto:" }), _jsxs("div", { className: "relative flex-1", children: [_jsx("span", { className: "absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm", children: "$" }), _jsx("input", { type: "number", min: "0", max: total, value: advancePayment || '', onChange: (e) => {
                                                                        const val = parseInt(e.target.value) || 0;
                                                                        setAdvancePayment(Math.min(Math.max(0, val), total));
                                                                    }, placeholder: "0", className: "w-full pl-6 pr-3 py-1.5 border border-gray-300 rounded text-sm text-right focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] })] }), advancePayment > 0 && (_jsxs("div", { className: "mt-3 pt-3 border-t border-gray-200", children: [_jsx("label", { className: "block text-xs text-gray-600 mb-2", children: "M\u00E9todo de Pago del Anticipo:" }), _jsxs("select", { value: advancePaymentMethod, onChange: (e) => setAdvancePaymentMethod(e.target.value), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "cash", children: "Efectivo" }), _jsx("option", { value: "nequi", children: "Nequi" }), _jsx("option", { value: "transfer", children: "Transferencia" }), _jsx("option", { value: "card", children: "Tarjeta" })] })] }))] }), _jsxs("div", { className: "flex justify-between items-center pt-3 border-t border-gray-200", children: [_jsx("span", { className: "text-gray-800 font-medium", children: "Saldo Pendiente:" }), _jsx("span", { className: `text-lg font-bold ${balance > 0 ? 'text-red-600' : 'text-green-600'}`, children: balance > 0 ? `$${balance.toLocaleString()}` : 'Pagado' })] })] })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Notas del Encargo" }), _jsx("textarea", { value: notes, onChange: (e) => setNotes(e.target.value), rows: 2, placeholder: "Notas adicionales sobre el encargo...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" })] }), _jsxs("div", { className: "flex gap-3 pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: onClose, disabled: loading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: loading || items.length === 0, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Creando..."] })) : (itemsBySchool.size > 1 ? `Crear ${itemsBySchool.size} Encargos` : 'Crear Encargo') })] })] }))] }) }), _jsx(ProductSelectorModal, { isOpen: catalogProductSelectorOpen, onClose: () => setCatalogProductSelectorOpen(false), onSelect: handleCatalogProductSelect, schoolId: selectedSchoolId, filterByStock: "without_stock", allowGlobalProducts: false, excludeProductIds: items.map(i => i.product_id || ''), title: "Seleccionar Producto del Cat\u00E1logo", emptyMessage: "No hay productos sin stock disponibles" }), yomberProductSelectorOpen && (_jsx(ProductSelectorModal, { isOpen: yomberProductSelectorOpen, onClose: () => setYomberProductSelectorOpen(false), onSelect: handleYomberProductSelect, schoolId: selectedSchoolId, filterByStock: "all", allowGlobalProducts: false, includeProductIds: yomberProducts.map(p => p.id), excludeProductIds: yomberProductId ? [yomberProductId, ...items.map(i => i.product_id || '')] : items.map(i => i.product_id || ''), title: "Seleccionar Producto Yomber", emptyMessage: "No hay productos Yomber configurados" })), showSuccessModal && orderResults.length > 0 && (_jsxs("div", { className: "fixed inset-0 z-[60] flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: handleCloseSuccessModal }), _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full p-6", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4", children: _jsx(CheckCircle, { className: "w-10 h-10 text-green-600" }) }), _jsx("h3", { className: "text-xl font-bold text-gray-900", children: orderResults.length === 1
                                            ? 'Encargo Creado Exitosamente'
                                            : `${orderResults.length} Encargos Creados Exitosamente` })] }), _jsx("div", { className: "space-y-3 mb-6", children: orderResults.map((result, index) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [orderResults.length > 1 && (_jsxs("div", { className: "flex items-center text-sm text-blue-600 mb-2", children: [_jsx(Building2, { className: "w-4 h-4 mr-1" }), result.schoolName] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-mono text-lg font-bold text-gray-900", children: result.orderCode }), _jsxs("span", { className: "text-lg font-semibold text-green-600", children: ["$", result.total.toLocaleString()] })] })] }, index))) }), orderResults.length > 1 && (_jsx("div", { className: "border-t border-gray-200 pt-4 mb-6", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-semibold text-gray-700", children: "Total General:" }), _jsxs("span", { className: "text-xl font-bold text-blue-600", children: ["$", orderResults.reduce((sum, r) => sum + r.total, 0).toLocaleString()] })] }) })), _jsx("div", { className: "flex gap-3", children: _jsx("button", { type: "button", onClick: handleCloseSuccessModal, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition", children: "Cerrar" }) })] })] }))] }));
}
