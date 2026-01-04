import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Sale Modal - Create New Sale Form
 * Supports multi-school: allows adding items from different schools in a single transaction.
 * Creates separate sales (one per school) when items span multiple schools.
 */
import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Plus, Trash2, ShoppingCart, Globe, Building, UserX, Calendar, History, Building2, CheckCircle, Package } from 'lucide-react';
import { saleService } from '../services/saleService';
import { productService } from '../services/productService';
import ClientSelector, { NO_CLIENT_ID } from './ClientSelector';
import ProductSelectorModal from './ProductSelectorModal';
import { useSchoolStore } from '../stores/schoolStore';
export default function SaleModal({ isOpen, onClose, onSuccess, initialSchoolId, initialProduct, initialQuantity = 1, }) {
    // Multi-school support
    const { availableSchools, currentSchool } = useSchoolStore();
    const [selectedSchoolId, setSelectedSchoolId] = useState(initialSchoolId || currentSchool?.id || availableSchools[0]?.id || '');
    const showSchoolSelector = availableSchools.length > 1;
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState([]);
    const [globalProducts, setGlobalProducts] = useState([]);
    const [error, setError] = useState(null);
    const [productSource, setProductSource] = useState('school');
    // Product selector modal state
    const [productSelectorOpen, setProductSelectorOpen] = useState(false);
    // Multi-school success modal state
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [saleResults, setSaleResults] = useState([]);
    const [formData, setFormData] = useState({
        client_id: '',
        payment_method: 'cash',
        notes: '',
        is_historical: false,
        sale_date: '', // ISO date string for historical sales
        // Separate date fields for easier input
        sale_day: '',
        sale_month: '',
        sale_year: '',
    });
    const [items, setItems] = useState([]);
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
            const newItem = {
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
    const handleSchoolChange = async (newSchoolId) => {
        setSelectedSchoolId(newSchoolId);
        // DON'T clear items - they belong to their respective schools
        // DON'T reset client - clients are global
        setCurrentItem({ product_id: '', quantity: 1, unit_price: 0, is_global: false });
        setError(null);
        await loadProducts(newSchoolId);
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
    const loadProducts = async (schoolIdToLoad) => {
        const targetSchoolId = schoolIdToLoad || selectedSchoolId;
        if (!targetSchoolId)
            return;
        try {
            const [productsData, globalProductsData] = await Promise.all([
                productService.getProducts(targetSchoolId),
                productService.getGlobalProducts(true),
            ]);
            setProducts(productsData);
            setGlobalProducts(globalProductsData);
        }
        catch (err) {
            console.error('Error loading products:', err);
            setError('Error al cargar productos');
        }
    };
    const handleProductSelect = (productId) => {
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
        }
        else {
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
    const handleProductSelectorSelect = (product, quantity) => {
        const isGlobal = 'inventory_quantity' in product && !('school_id' in product);
        const schoolId = isGlobal ? selectedSchoolId : product.school_id;
        const schoolName = getSchoolName(schoolId);
        const newItem = {
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
        const existingIndex = items.findIndex(item => item.product_id === product.id && item.is_global === isGlobal);
        if (existingIndex !== -1) {
            const updatedItems = [...items];
            updatedItems[existingIndex] = {
                ...updatedItems[existingIndex],
                quantity: updatedItems[existingIndex].quantity + (quantity || 1),
            };
            setItems(updatedItems);
        }
        else {
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
        let productName;
        let availableStock;
        let displayName;
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
        }
        else {
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
        const existingItem = items.find(item => item.product_id === currentItem.product_id && item.is_global === currentItem.is_global);
        const totalQuantity = (existingItem?.quantity || 0) + currentItem.quantity;
        // Check stock availability (skip for historical sales - they don't affect inventory)
        if (!formData.is_historical && totalQuantity > availableStock) {
            setError(`Stock insuficiente para ${productName}. Disponible: ${availableStock}, solicitado: ${totalQuantity}`);
            return;
        }
        // Check if product already in items (same product, same source, same school)
        const existingIndex = items.findIndex(item => item.product_id === currentItem.product_id &&
            item.is_global === currentItem.is_global &&
            item.school_id === selectedSchoolId);
        if (existingIndex >= 0) {
            // Update quantity
            const updatedItems = [...items];
            updatedItems[existingIndex].quantity += currentItem.quantity;
            setItems(updatedItems);
        }
        else {
            // Get product size
            let productSize = '';
            if (currentItem.is_global) {
                const globalProduct = globalProducts.find(p => p.id === currentItem.product_id);
                productSize = globalProduct?.size || '';
            }
            else {
                const product = products.find(p => p.id === currentItem.product_id);
                productSize = product?.size || '';
            }
            // Add new item with school info
            const newItem = {
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
    const handleRemoveItem = (index) => {
        setItems(items.filter((_, i) => i !== index));
    };
    const calculateTotal = () => {
        return items.reduce((total, item) => total + (item.quantity * item.unit_price), 0);
    };
    const handleSubmit = async (e) => {
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
            let saleDateStr = undefined;
            if (formData.is_historical && formData.sale_day && formData.sale_month && formData.sale_year) {
                const day = formData.sale_day.padStart(2, '0');
                const month = formData.sale_month;
                const year = formData.sale_year;
                saleDateStr = `${year}-${month}-${day}T12:00:00`;
            }
            // Multi-school: Create separate sales for each school
            const results = [];
            for (const [schoolId, schoolItems] of itemsBySchool.entries()) {
                // Build sale data for this school
                const saleData = {
                    school_id: schoolId,
                    client_id: clientId, // Will be null in backend
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
                const schoolTotal = schoolItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
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
        }
        catch (err) {
            console.error('Error creating sale:', err);
            setError(err.response?.data?.detail || 'Error al crear la venta');
        }
        finally {
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
    const getProductName = (productId, isGlobal = false) => {
        if (isGlobal) {
            const product = globalProducts.find(p => p.id === productId);
            return product ? `🌐 ${product.name} - ${product.size} (${product.code})` : productId;
        }
        const product = products.find(p => p.id === productId);
        return product ? `${product.name} - ${product.size} (${product.code})` : productId;
    };
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: onClose }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200 sticky top-0 bg-white z-10", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-800 flex items-center", children: [_jsx(ShoppingCart, { className: "w-6 h-6 mr-2" }), "Nueva Venta"] }), _jsx("button", { onClick: onClose, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("form", { onSubmit: handleSubmit, className: "p-6", children: [error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-3 mb-4", children: _jsx("p", { className: "text-sm text-red-700", children: error }) })), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-6 mb-6", children: [showSchoolSelector && (_jsxs("div", { className: "md:col-span-2 mb-4", children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: [_jsx(Building2, { className: "w-4 h-4 inline mr-1" }), "Colegio *"] }), _jsx("select", { value: selectedSchoolId, onChange: (e) => handleSchoolChange(e.target.value), className: "w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-blue-50", children: availableSchools.map(school => (_jsx("option", { value: school.id, children: school.name }, school.id))) }), _jsx("p", { className: "mt-1 text-xs text-blue-600", children: "Los productos y clientes se cargan del colegio seleccionado" })] })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Cliente" }), _jsx(ClientSelector, { value: formData.client_id, onChange: (clientId) => setFormData({ ...formData, client_id: clientId }), schoolId: selectedSchoolId, allowNoClient: true, placeholder: "Buscar cliente por nombre, tel\u00E9fono..." }), formData.client_id === NO_CLIENT_ID && (_jsxs("p", { className: "mt-1 text-xs text-orange-600 flex items-center", children: [_jsx(UserX, { className: "w-3 h-3 mr-1" }), "La venta se registrar\u00E1 sin cliente asociado"] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "M\u00E9todo de Pago *" }), _jsxs("select", { value: formData.payment_method, onChange: (e) => setFormData({ ...formData, payment_method: e.target.value }), required: true, className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none", children: [_jsx("option", { value: "cash", children: "Efectivo" }), _jsx("option", { value: "nequi", children: "Nequi" }), _jsx("option", { value: "transfer", children: "Transferencia" }), _jsx("option", { value: "card", children: "Tarjeta" }), _jsx("option", { value: "credit", children: "Cr\u00E9dito" })] })] })] }), _jsxs("div", { className: "bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6", children: [_jsxs("div", { className: "flex items-start gap-3", children: [_jsx("div", { className: "flex items-center h-5 mt-0.5", children: _jsx("input", { id: "is_historical", type: "checkbox", checked: formData.is_historical, onChange: (e) => setFormData({
                                                            ...formData,
                                                            is_historical: e.target.checked,
                                                            sale_date: e.target.checked ? formData.sale_date : '',
                                                            sale_day: e.target.checked ? formData.sale_day : '',
                                                            sale_month: e.target.checked ? formData.sale_month : '',
                                                            sale_year: e.target.checked ? formData.sale_year : '',
                                                        }), className: "w-4 h-4 text-amber-600 border-amber-300 rounded focus:ring-amber-500" }) }), _jsxs("div", { className: "flex-1", children: [_jsxs("label", { htmlFor: "is_historical", className: "text-sm font-semibold text-amber-800 flex items-center cursor-pointer", children: [_jsx(History, { className: "w-4 h-4 mr-2" }), "Venta Hist\u00F3rica (Migraci\u00F3n de datos)"] }), _jsx("p", { className: "text-xs text-amber-700 mt-1", children: "Las ventas hist\u00F3ricas NO afectan el inventario actual y permiten establecer una fecha pasada. \u00DAtil para migrar registros de ventas anteriores." })] })] }), formData.is_historical && (_jsxs("div", { className: "mt-4 pl-7", children: [_jsxs("label", { className: "block text-sm font-medium text-amber-800 mb-2", children: [_jsx(Calendar, { className: "w-4 h-4 inline mr-1" }), "Fecha de la venta *"] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsxs("div", { children: [_jsx("input", { type: "number", placeholder: "D\u00EDa", min: "1", max: "31", value: formData.sale_day, onChange: (e) => setFormData({ ...formData, sale_day: e.target.value }), className: "w-20 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white text-center" }), _jsx("p", { className: "text-xs text-amber-600 mt-1 text-center", children: "D\u00EDa" })] }), _jsx("span", { className: "text-amber-600 text-xl font-bold", children: "/" }), _jsxs("div", { children: [_jsxs("select", { value: formData.sale_month, onChange: (e) => setFormData({ ...formData, sale_month: e.target.value }), className: "w-32 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white", children: [_jsx("option", { value: "", children: "Mes" }), _jsx("option", { value: "01", children: "Enero" }), _jsx("option", { value: "02", children: "Febrero" }), _jsx("option", { value: "03", children: "Marzo" }), _jsx("option", { value: "04", children: "Abril" }), _jsx("option", { value: "05", children: "Mayo" }), _jsx("option", { value: "06", children: "Junio" }), _jsx("option", { value: "07", children: "Julio" }), _jsx("option", { value: "08", children: "Agosto" }), _jsx("option", { value: "09", children: "Septiembre" }), _jsx("option", { value: "10", children: "Octubre" }), _jsx("option", { value: "11", children: "Noviembre" }), _jsx("option", { value: "12", children: "Diciembre" })] }), _jsx("p", { className: "text-xs text-amber-600 mt-1 text-center", children: "Mes" })] }), _jsx("span", { className: "text-amber-600 text-xl font-bold", children: "/" }), _jsxs("div", { children: [_jsx("input", { type: "number", placeholder: "A\u00F1o", min: "2020", max: new Date().getFullYear(), value: formData.sale_year, onChange: (e) => setFormData({ ...formData, sale_year: e.target.value }), className: "w-24 px-3 py-2 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none bg-white text-center" }), _jsx("p", { className: "text-xs text-amber-600 mt-1 text-center", children: "A\u00F1o" })] })] }), _jsx("p", { className: "text-xs text-amber-600 mt-2", children: "Ingresa la fecha real en que se realiz\u00F3 esta venta" })] }))] }), _jsxs("div", { className: "border-t border-gray-200 pt-6 mb-6", children: [_jsx("h3", { className: "text-lg font-semibold text-gray-800 mb-4", children: "Agregar Productos" }), _jsxs("div", { className: "flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg", children: [_jsxs("button", { type: "button", onClick: () => {
                                                        setProductSource('school');
                                                        setCurrentItem({ ...currentItem, product_id: '', is_global: false });
                                                    }, className: `flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${productSource === 'school'
                                                        ? 'bg-white text-blue-600 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'}`, children: [_jsx(Building, { className: "w-4 h-4 mr-2" }), "Productos del Colegio (", products.length, ")"] }), _jsxs("button", { type: "button", onClick: () => {
                                                        setProductSource('global');
                                                        setCurrentItem({ ...currentItem, product_id: '', is_global: true });
                                                    }, className: `flex-1 flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition ${productSource === 'global'
                                                        ? 'bg-white text-purple-600 shadow-sm'
                                                        : 'text-gray-600 hover:text-gray-900'}`, children: [_jsx(Globe, { className: "w-4 h-4 mr-2" }), "Productos Globales (", globalProducts.length, ")"] })] }), _jsxs("div", { className: "mb-4", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Agregar Productos" }), _jsxs("button", { type: "button", onClick: () => setProductSelectorOpen(true), className: "w-full px-6 py-4 border-2 border-dashed border-blue-400 rounded-lg hover:border-blue-600 hover:bg-blue-50 transition flex flex-col items-center gap-2 group", children: [_jsx(Package, { className: "w-8 h-8 text-blue-500 group-hover:text-blue-600" }), _jsx("span", { className: "text-sm font-medium text-blue-600 group-hover:text-blue-700", children: "Buscar y agregar productos" }), _jsx("span", { className: "text-xs text-gray-500", children: "Click para abrir el cat\u00E1logo" })] })] }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-4 gap-4 mb-4", style: { display: 'none' }, children: [_jsx("div", { className: "md:col-span-2" }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Cantidad" }), _jsx("input", { type: "number", min: "1", step: "1", inputMode: "numeric", pattern: "[0-9]*", value: currentItem.quantity, onChange: (e) => {
                                                                const val = e.target.value;
                                                                // Allow empty string while typing, default to 1 when empty
                                                                const num = val === '' ? 1 : parseInt(val, 10);
                                                                setCurrentItem({ ...currentItem, quantity: isNaN(num) ? 1 : Math.max(1, num) });
                                                            }, onFocus: (e) => e.target.select(), className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), _jsx("div", { className: "flex items-end", children: _jsxs("button", { type: "button", onClick: handleAddItem, disabled: !currentItem.product_id, className: `w-full px-4 py-2 text-white rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${productSource === 'global'
                                                            ? 'bg-purple-600 hover:bg-purple-700'
                                                            : 'bg-green-600 hover:bg-green-700'}`, children: [_jsx(Plus, { className: "w-4 h-4 mr-1" }), "Agregar"] }) })] })] }), items.length > 0 && (_jsxs("div", { className: "border-t border-gray-200 pt-6 mb-6", children: [_jsxs("h3", { className: "text-lg font-semibold text-gray-800 mb-4", children: ["Productos en la Venta", itemsBySchool.size > 1 && (_jsxs("span", { className: "ml-2 text-sm font-normal text-blue-600", children: ["(", itemsBySchool.size, " colegios)"] }))] }), _jsx("div", { className: "space-y-4", children: Array.from(itemsBySchool.entries()).map(([schoolId, schoolItems]) => {
                                                const schoolTotal = schoolItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
                                                return (_jsxs("div", { className: "border border-gray-200 rounded-lg overflow-hidden", children: [itemsBySchool.size > 1 && (_jsxs("div", { className: "bg-blue-50 px-4 py-2 flex items-center justify-between border-b border-blue-200", children: [_jsxs("span", { className: "font-medium text-blue-800 flex items-center", children: [_jsx(Building2, { className: "w-4 h-4 mr-2" }), schoolItems[0].school_name] }), _jsxs("span", { className: "text-sm text-blue-600 font-medium", children: ["Subtotal: $", schoolTotal.toLocaleString()] })] })), _jsx("div", { className: "divide-y divide-gray-100", children: schoolItems.map((item) => {
                                                                // Find original index for removal
                                                                const originalIndex = items.findIndex(i => i.product_id === item.product_id &&
                                                                    i.school_id === item.school_id &&
                                                                    i.is_global === item.is_global);
                                                                return (_jsxs("div", { className: `flex items-center justify-between p-3 ${item.is_global ? 'bg-purple-50' : 'bg-white'}`, children: [_jsxs("div", { className: "flex-1", children: [_jsxs("p", { className: "font-medium text-gray-900", children: [item.display_name || getProductName(item.product_id, item.is_global), item.is_global && (_jsx("span", { className: "ml-2 text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded", children: "Global" }))] }), _jsxs("p", { className: "text-sm text-gray-600", children: [item.size && _jsxs("span", { className: "font-medium", children: ["Talla: ", item.size, " | "] }), "Cantidad: ", item.quantity, " \u00D7 $", item.unit_price.toLocaleString(), " = $", (item.quantity * item.unit_price).toLocaleString()] })] }), _jsx("button", { type: "button", onClick: () => handleRemoveItem(originalIndex), className: "ml-4 text-red-600 hover:text-red-800 transition", children: _jsx(Trash2, { className: "w-5 h-5" }) })] }, `${item.school_id}-${item.product_id}-${item.is_global}`));
                                                            }) })] }, schoolId));
                                            }) }), _jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200", children: [_jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "text-lg font-semibold text-gray-900", children: itemsBySchool.size > 1 ? 'Total General:' : 'Total:' }), _jsxs("span", { className: "text-2xl font-bold text-blue-600", children: ["$", calculateTotal().toLocaleString()] })] }), itemsBySchool.size > 1 && (_jsxs("p", { className: "text-sm text-gray-500 mt-1", children: ["Se crear\u00E1n ", itemsBySchool.size, " ventas separadas (una por colegio)"] }))] })] })), _jsxs("div", { className: "mb-6", children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Notas (Opcional)" }), _jsx("textarea", { value: formData.notes, onChange: (e) => setFormData({ ...formData, notes: e.target.value }), rows: 3, placeholder: "Observaciones adicionales...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none" })] }), _jsxs("div", { className: "flex gap-3 pt-4 border-t border-gray-200", children: [_jsx("button", { type: "button", onClick: onClose, disabled: loading, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "submit", disabled: loading || items.length === 0, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center", children: loading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Procesando..."] })) : (itemsBySchool.size > 1 ? `Crear ${itemsBySchool.size} Ventas` : 'Crear Venta') })] })] })] }) }), showSuccessModal && saleResults.length > 0 && (_jsxs("div", { className: "fixed inset-0 z-[60] flex items-center justify-center p-4", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: handleCloseSuccessModal }), _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full p-6", children: [_jsxs("div", { className: "text-center mb-6", children: [_jsx("div", { className: "mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4", children: _jsx(CheckCircle, { className: "w-10 h-10 text-green-600" }) }), _jsx("h3", { className: "text-xl font-bold text-gray-900", children: saleResults.length === 1
                                            ? 'Venta Creada Exitosamente'
                                            : `${saleResults.length} Ventas Creadas Exitosamente` })] }), _jsx("div", { className: "space-y-3 mb-6", children: saleResults.map((result, index) => (_jsxs("div", { className: "bg-gray-50 rounded-lg p-4 border border-gray-200", children: [saleResults.length > 1 && (_jsxs("div", { className: "flex items-center text-sm text-blue-600 mb-2", children: [_jsx(Building2, { className: "w-4 h-4 mr-1" }), result.schoolName] })), _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-mono text-lg font-bold text-gray-900", children: result.saleCode }), _jsxs("span", { className: "text-lg font-semibold text-green-600", children: ["$", result.total.toLocaleString()] })] })] }, index))) }), saleResults.length > 1 && (_jsx("div", { className: "border-t border-gray-200 pt-4 mb-6", children: _jsxs("div", { className: "flex justify-between items-center", children: [_jsx("span", { className: "font-semibold text-gray-700", children: "Total General:" }), _jsxs("span", { className: "text-xl font-bold text-blue-600", children: ["$", saleResults.reduce((sum, r) => sum + r.total, 0).toLocaleString()] })] }) })), _jsx("div", { className: "flex gap-3", children: _jsx("button", { type: "button", onClick: handleCloseSuccessModal, className: "flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition", children: "Cerrar" }) })] })] })), _jsx(ProductSelectorModal, { isOpen: productSelectorOpen, onClose: () => setProductSelectorOpen(false), onSelect: handleProductSelectorSelect, schoolId: selectedSchoolId, filterByStock: formData.is_historical ? 'all' : 'with_stock', allowGlobalProducts: true, excludeProductIds: items.map(i => i.product_id), title: "Buscar y Agregar Producto", emptyMessage: "No se encontraron productos disponibles" })] }));
}
