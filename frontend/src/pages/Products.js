import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Products Page - List and manage products with inventory
 * Includes both school-specific products and global products
 * Enhanced with advanced filtering, sorting, and order tracking
 */
import { useEffect, useState, useMemo } from 'react';
import Layout from '../components/Layout';
import ProductModal from '../components/ProductModal';
import GlobalProductModal from '../components/GlobalProductModal';
import GarmentTypeModal from '../components/GarmentTypeModal';
import SaleModal from '../components/SaleModal';
import OrderModal from '../components/OrderModal';
import { Package, Plus, Search, AlertCircle, Loader2, Edit2, PackagePlus, X, Save, Globe, Building2, ArrowUpDown, ArrowUp, ArrowDown, Filter, ShoppingCart, AlertTriangle, PackageX, TrendingUp, BarChart3, ChevronDown, Tag, Image as ImageIcon } from 'lucide-react';
import { productService } from '../services/productService';
import { useSchoolStore } from '../stores/schoolStore';
import { useAuthStore } from '../stores/authStore';
import { useConfigStore } from '../stores/configStore';
import apiClient from '../utils/api-client';
export default function Products() {
    const { currentSchool, availableSchools, loadSchools } = useSchoolStore();
    const { user } = useAuthStore();
    const { apiUrl } = useConfigStore();
    // Tab state
    const [activeTab, setActiveTab] = useState('school');
    // School products state
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    // Global products state
    const [globalProducts, setGlobalProducts] = useState([]);
    const [loadingGlobal, setLoadingGlobal] = useState(true);
    // Garment types for filtering
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [globalGarmentTypes, setGlobalGarmentTypes] = useState([]);
    // Common state
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sizeFilter, setSizeFilter] = useState('');
    const [schoolFilter, setSchoolFilter] = useState('');
    const [garmentTypeFilter, setGarmentTypeFilter] = useState('');
    const [stockFilter, setStockFilter] = useState('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    // Sorting state
    const [sortConfig, setSortConfig] = useState({ field: 'code', direction: 'asc' });
    // Inventory adjustment modal state
    const [inventoryModal, setInventoryModal] = useState(null);
    const [adjustmentAmount, setAdjustmentAmount] = useState('');
    const [adjustmentReason, setAdjustmentReason] = useState('');
    const [adjustmentType, setAdjustmentType] = useState('add');
    const [submitting, setSubmitting] = useState(false);
    // Sale modal state
    const [saleModalOpen, setSaleModalOpen] = useState(false);
    const [initialProduct, setInitialProduct] = useState(null);
    // Order modal state
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    // Global Product Modal state
    const [globalProductModalOpen, setGlobalProductModalOpen] = useState(false);
    const [selectedGlobalProduct, setSelectedGlobalProduct] = useState(null);
    // Garment Type Modal state
    const [garmentTypeModalOpen, setGarmentTypeModalOpen] = useState(false);
    const [selectedGarmentType, setSelectedGarmentType] = useState(null);
    const [isGlobalGarmentType, setIsGlobalGarmentType] = useState(false);
    // Garment types tab state
    const [showGlobalTypes, setShowGlobalTypes] = useState(false);
    // For creating new products, use school filter or current school
    const schoolIdForCreate = schoolFilter || currentSchool?.id || availableSchools[0]?.id || '';
    const isSuperuser = user?.is_superuser || false;
    // Check if user has admin/owner role in any school
    const isAdmin = isSuperuser || user?.school_roles?.some(sr => sr.role === 'admin' || sr.role === 'owner') || false;
    useEffect(() => {
        if (availableSchools.length === 0) {
            loadSchools();
        }
        loadProducts();
        loadGlobalProducts();
        loadGarmentTypes();
        loadGlobalGarmentTypes();
    }, []);
    useEffect(() => {
        loadProducts();
        loadGarmentTypes();
    }, [schoolFilter]);
    const loadProducts = async () => {
        try {
            setLoading(true);
            setError(null);
            const data = await productService.getAllProducts({
                school_id: schoolFilter || undefined,
                with_stock: true,
                limit: 500
            });
            setProducts(data);
        }
        catch (err) {
            console.error('Error loading products:', err);
            setError(err.response?.data?.detail || 'Error al cargar productos');
        }
        finally {
            setLoading(false);
        }
    };
    const loadGlobalProducts = async () => {
        try {
            setLoadingGlobal(true);
            const data = await productService.getGlobalProducts();
            setGlobalProducts(data);
        }
        catch (err) {
            console.error('Error loading global products:', err);
        }
        finally {
            setLoadingGlobal(false);
        }
    };
    const loadGarmentTypes = async () => {
        try {
            const data = await productService.getAllGarmentTypes({
                school_id: schoolFilter || undefined
            });
            setGarmentTypes(data);
        }
        catch (err) {
            console.error('Error loading garment types:', err);
        }
    };
    const loadGlobalGarmentTypes = async () => {
        try {
            const data = await productService.getGlobalGarmentTypes();
            setGlobalGarmentTypes(data);
        }
        catch (err) {
            console.error('Error loading global garment types:', err);
        }
    };
    const handleOpenModal = (product) => {
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
    const handleOpenInventoryModal = (product) => {
        setInventoryModal({
            productId: product.id,
            productCode: product.code,
            productName: product.name || product.code,
            currentStock: product.stock ?? product.inventory_quantity ?? 0,
            isGlobal: false,
            schoolId: product.school_id || currentSchool?.id,
        });
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setAdjustmentType('add');
    };
    const handleStartSale = (product) => {
        const stock = product.stock ?? product.inventory_quantity ?? 0;
        if (stock > 0) {
            // Has stock: open SaleModal with pre-loaded product
            setInitialProduct(product);
            setSaleModalOpen(true);
        }
        else {
            // No stock: open OrderModal for creating an order
            setInitialProduct(product);
            setOrderModalOpen(true);
        }
    };
    const handleOpenGlobalInventoryModal = (product) => {
        setInventoryModal({
            productId: product.id,
            productCode: product.code,
            productName: product.name || product.code,
            currentStock: product.inventory_quantity ?? 0,
            isGlobal: true,
        });
        setAdjustmentAmount('');
        setAdjustmentReason('');
        setAdjustmentType('add');
    };
    const handleCloseInventoryModal = () => {
        setInventoryModal(null);
        setAdjustmentAmount('');
        setAdjustmentReason('');
    };
    const handleAdjustInventory = async () => {
        if (!inventoryModal || !adjustmentAmount)
            return;
        const amount = parseInt(adjustmentAmount);
        if (isNaN(amount) || amount <= 0) {
            setError('La cantidad debe ser un numero positivo');
            return;
        }
        let adjustment;
        if (adjustmentType === 'add') {
            adjustment = amount;
        }
        else if (adjustmentType === 'remove') {
            adjustment = -amount;
            if (inventoryModal.currentStock + adjustment < 0) {
                setError('No puede quedar stock negativo');
                return;
            }
        }
        else {
            adjustment = amount - inventoryModal.currentStock;
        }
        try {
            setSubmitting(true);
            setError(null);
            if (inventoryModal.isGlobal) {
                await productService.adjustGlobalInventory(inventoryModal.productId, adjustment, adjustmentReason || undefined);
                await loadGlobalProducts();
            }
            else {
                await apiClient.post(`/schools/${inventoryModal.schoolId}/inventory/product/${inventoryModal.productId}/adjust`, {
                    adjustment,
                    reason: adjustmentReason || `Ajuste manual: ${adjustmentType === 'add' ? 'Agregar' : adjustmentType === 'remove' ? 'Remover' : 'Establecer'} ${amount} unidades`,
                });
                await loadProducts();
            }
            handleCloseInventoryModal();
        }
        catch (err) {
            console.error('Error adjusting inventory:', err);
            setError(err.response?.data?.detail || 'Error al ajustar inventario');
        }
        finally {
            setSubmitting(false);
        }
    };
    // Global Product handlers
    const handleOpenGlobalProductModal = (product) => {
        setSelectedGlobalProduct(product || null);
        setGlobalProductModalOpen(true);
    };
    const handleCloseGlobalProductModal = () => {
        setGlobalProductModalOpen(false);
        setSelectedGlobalProduct(null);
    };
    const handleGlobalProductSuccess = () => {
        loadGlobalProducts();
        handleCloseGlobalProductModal();
    };
    // Garment Type handlers
    const handleOpenGarmentTypeModal = (garmentType, isGlobal = false) => {
        setSelectedGarmentType(garmentType || null);
        setIsGlobalGarmentType(isGlobal);
        setGarmentTypeModalOpen(true);
    };
    const handleCloseGarmentTypeModal = () => {
        setGarmentTypeModalOpen(false);
        setSelectedGarmentType(null);
        setIsGlobalGarmentType(false);
    };
    const handleGarmentTypeSuccess = () => {
        loadGarmentTypes();
        loadGlobalGarmentTypes();
        handleCloseGarmentTypeModal();
    };
    // Sorting function
    const handleSort = (field) => {
        setSortConfig(prev => ({
            field,
            direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
        }));
    };
    const getSortIcon = (field) => {
        if (sortConfig.field !== field) {
            return _jsx(ArrowUpDown, { className: "w-4 h-4 text-gray-400" });
        }
        return sortConfig.direction === 'asc'
            ? _jsx(ArrowUp, { className: "w-4 h-4 text-blue-600" })
            : _jsx(ArrowDown, { className: "w-4 h-4 text-blue-600" });
    };
    // Filter and sort school products
    const filteredAndSortedProducts = useMemo(() => {
        let filtered = products.filter(product => {
            const stock = product.stock ?? product.inventory_quantity ?? 0;
            const minStock = product.min_stock ?? product.inventory_min_stock ?? 5;
            const pendingOrders = product.pending_orders_qty ?? 0;
            // Search filter
            const matchesSearch = searchTerm === '' ||
                product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.size.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.school_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.garment_type_name?.toLowerCase().includes(searchTerm.toLowerCase());
            // Size filter
            const matchesSize = sizeFilter === '' || product.size === sizeFilter;
            // Garment type filter
            const matchesGarmentType = garmentTypeFilter === '' || product.garment_type_id === garmentTypeFilter;
            // Stock filter
            let matchesStock = true;
            if (stockFilter === 'in_stock') {
                matchesStock = stock > minStock;
            }
            else if (stockFilter === 'low_stock') {
                matchesStock = stock > 0 && stock <= minStock;
            }
            else if (stockFilter === 'out_of_stock') {
                matchesStock = stock === 0;
            }
            else if (stockFilter === 'with_orders') {
                matchesStock = pendingOrders > 0;
            }
            return matchesSearch && matchesSize && matchesGarmentType && matchesStock;
        });
        // Sort
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch (sortConfig.field) {
                case 'code':
                    aVal = a.code.toLowerCase();
                    bVal = b.code.toLowerCase();
                    break;
                case 'name':
                    aVal = (a.name || '').toLowerCase();
                    bVal = (b.name || '').toLowerCase();
                    break;
                case 'size':
                    aVal = a.size.toLowerCase();
                    bVal = b.size.toLowerCase();
                    break;
                case 'price':
                    aVal = Number(a.price);
                    bVal = Number(b.price);
                    break;
                case 'stock':
                    aVal = a.stock ?? a.inventory_quantity ?? 0;
                    bVal = b.stock ?? b.inventory_quantity ?? 0;
                    break;
                case 'pending_orders':
                    aVal = a.pending_orders_qty ?? 0;
                    bVal = b.pending_orders_qty ?? 0;
                    break;
                default:
                    aVal = a.code;
                    bVal = b.code;
            }
            if (aVal < bVal)
                return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal)
                return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
        return filtered;
    }, [products, searchTerm, sizeFilter, garmentTypeFilter, stockFilter, sortConfig]);
    // Filter global products
    const filteredGlobalProducts = useMemo(() => {
        return globalProducts.filter(product => {
            const matchesSearch = searchTerm === '' ||
                product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                product.size.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesSize = sizeFilter === '' || product.size === sizeFilter;
            return matchesSearch && matchesSize;
        });
    }, [globalProducts, searchTerm, sizeFilter]);
    // Get unique sizes for filter
    const allProducts = activeTab === 'school' ? products : globalProducts;
    const uniqueSizes = Array.from(new Set(allProducts.map(p => p.size))).sort();
    // Calculate statistics
    const stats = useMemo(() => {
        const prods = activeTab === 'school' ? products : globalProducts;
        let totalProducts = prods.length;
        let totalStock = 0;
        let lowStockCount = 0;
        let outOfStockCount = 0;
        let withOrdersCount = 0;
        let totalPendingOrders = 0;
        prods.forEach(p => {
            const stock = p.stock ?? p.inventory_quantity ?? 0;
            const minStock = p.min_stock ?? p.inventory_min_stock ?? 5;
            const pendingOrders = p.pending_orders_qty ?? 0;
            totalStock += stock;
            if (stock === 0)
                outOfStockCount++;
            else if (stock <= minStock)
                lowStockCount++;
            if (pendingOrders > 0) {
                withOrdersCount++;
                totalPendingOrders += pendingOrders;
            }
        });
        return { totalProducts, totalStock, lowStockCount, outOfStockCount, withOrdersCount, totalPendingOrders };
    }, [products, globalProducts, activeTab]);
    const isLoading = activeTab === 'school' ? loading : loadingGlobal;
    const currentProducts = activeTab === 'school' ? filteredAndSortedProducts : filteredGlobalProducts;
    const clearFilters = () => {
        setSearchTerm('');
        setSizeFilter('');
        setGarmentTypeFilter('');
        setStockFilter('all');
    };
    const hasActiveFilters = searchTerm || sizeFilter || garmentTypeFilter || stockFilter !== 'all';
    // Helper to get full image URL
    const getImageUrl = (imageUrl) => {
        if (!imageUrl)
            return null;
        if (imageUrl.startsWith('http'))
            return imageUrl;
        return `${apiUrl}${imageUrl}`;
    };
    return (_jsxs(Layout, { children: [_jsxs("div", { className: "mb-6 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Productos" }), _jsxs("p", { className: "text-gray-600 mt-1", children: [isLoading ? 'Cargando...' :
                                        activeTab === 'garment-types'
                                            ? `${(showGlobalTypes ? globalGarmentTypes : garmentTypes).length} tipos de prenda`
                                            : `${currentProducts.length} productos encontrados`, activeTab === 'school' && schoolFilter && availableSchools.length > 1 && (_jsx("span", { className: "ml-2 text-blue-600", children: "- Filtrado por colegio" }))] })] }), _jsxs("div", { className: "flex gap-3", children: [activeTab === 'school' && (_jsxs("button", { onClick: () => handleOpenModal(), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Producto"] })), activeTab === 'global' && isSuperuser && (_jsxs("button", { onClick: () => handleOpenGlobalProductModal(), className: "bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Producto Global"] })), activeTab === 'garment-types' && (_jsxs(_Fragment, { children: [!showGlobalTypes && isAdmin && (_jsxs("button", { onClick: () => handleOpenGarmentTypeModal(undefined, false), className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Tipo del Colegio"] })), showGlobalTypes && isSuperuser && (_jsxs("button", { onClick: () => handleOpenGarmentTypeModal(undefined, true), className: "bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Nuevo Tipo Global"] }))] }))] })] }), _jsxs("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6", children: [_jsx("div", { className: "bg-white rounded-lg shadow-sm p-4", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Package, { className: "w-8 h-8 text-blue-600 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Total Productos" }), _jsx("p", { className: "text-xl font-bold text-gray-800", children: stats.totalProducts })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4", children: _jsxs("div", { className: "flex items-center", children: [_jsx(BarChart3, { className: "w-8 h-8 text-green-600 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Stock Total" }), _jsx("p", { className: "text-xl font-bold text-gray-800", children: stats.totalStock.toLocaleString() })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-yellow-50 transition", onClick: () => setStockFilter('low_stock'), children: _jsxs("div", { className: "flex items-center", children: [_jsx(AlertTriangle, { className: "w-8 h-8 text-yellow-600 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Stock Bajo" }), _jsx("p", { className: "text-xl font-bold text-yellow-600", children: stats.lowStockCount })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-red-50 transition", onClick: () => setStockFilter('out_of_stock'), children: _jsxs("div", { className: "flex items-center", children: [_jsx(PackageX, { className: "w-8 h-8 text-red-600 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Sin Stock" }), _jsx("p", { className: "text-xl font-bold text-red-600", children: stats.outOfStockCount })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4 cursor-pointer hover:bg-purple-50 transition", onClick: () => setStockFilter('with_orders'), children: _jsxs("div", { className: "flex items-center", children: [_jsx(ShoppingCart, { className: "w-8 h-8 text-purple-600 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Con Encargos" }), _jsx("p", { className: "text-xl font-bold text-purple-600", children: stats.withOrdersCount })] })] }) }), _jsx("div", { className: "bg-white rounded-lg shadow-sm p-4", children: _jsxs("div", { className: "flex items-center", children: [_jsx(TrendingUp, { className: "w-8 h-8 text-indigo-600 mr-3" }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Uds. en Encargos" }), _jsx("p", { className: "text-xl font-bold text-indigo-600", children: stats.totalPendingOrders })] })] }) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm mb-6", children: [_jsxs("div", { className: "flex border-b border-gray-200", children: [_jsxs("button", { onClick: () => { setActiveTab('school'); setSizeFilter(''); setStockFilter('all'); }, className: `flex items-center px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'school'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: [_jsx(Building2, { className: "w-5 h-5 mr-2" }), "Productos del Colegio", _jsx("span", { className: "ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100", children: products.length })] }), _jsxs("button", { onClick: () => { setActiveTab('global'); setSizeFilter(''); setStockFilter('all'); }, className: `flex items-center px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'global'
                                    ? 'border-green-600 text-green-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: [_jsx(Globe, { className: "w-5 h-5 mr-2" }), "Productos Compartidos", _jsx("span", { className: "ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100", children: globalProducts.length })] }), _jsxs("button", { onClick: () => { setActiveTab('garment-types'); setSizeFilter(''); setStockFilter('all'); }, className: `flex items-center px-6 py-4 text-sm font-medium border-b-2 transition ${activeTab === 'garment-types'
                                    ? 'border-purple-600 text-purple-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`, children: [_jsx(Tag, { className: "w-5 h-5 mr-2" }), "Tipos de Prenda", _jsx("span", { className: "ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100", children: garmentTypes.length + globalGarmentTypes.length })] })] }), _jsx("div", { className: "px-6 py-3 bg-gray-50 border-b border-gray-200", children: activeTab === 'school' ? (_jsxs("p", { className: "text-sm text-gray-600", children: ["Uniformes especificos de ", _jsx("strong", { children: currentSchool?.name || 'este colegio' }), " (camisetas, pantalones, etc.)"] })) : activeTab === 'global' ? (_jsxs("p", { className: "text-sm text-gray-600", children: ["Productos compartidos entre todos los colegios: ", _jsx("strong", { children: "Tennis, Zapatos, Medias, Jean, Blusa" })] })) : (_jsxs("p", { className: "text-sm text-gray-600", children: ["Gestiona los ", _jsx("strong", { children: "tipos de prenda" }), " (Camisa, Pantal\u00F3n, Zapatos, etc.) que se pueden usar para crear productos"] })) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-4 mb-6", children: [_jsxs("div", { className: "flex flex-wrap items-center gap-4", children: [_jsxs("div", { className: "flex-1 min-w-[200px] relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Buscar por codigo, nombre, talla, tipo...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("button", { onClick: () => setStockFilter('all'), className: `px-3 py-2 text-sm rounded-lg border transition ${stockFilter === 'all'
                                            ? 'bg-blue-100 border-blue-500 text-blue-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "Todos" }), _jsx("button", { onClick: () => setStockFilter('in_stock'), className: `px-3 py-2 text-sm rounded-lg border transition ${stockFilter === 'in_stock'
                                            ? 'bg-green-100 border-green-500 text-green-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "En Stock" }), _jsx("button", { onClick: () => setStockFilter('low_stock'), className: `px-3 py-2 text-sm rounded-lg border transition ${stockFilter === 'low_stock'
                                            ? 'bg-yellow-100 border-yellow-500 text-yellow-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "Stock Bajo" }), _jsx("button", { onClick: () => setStockFilter('out_of_stock'), className: `px-3 py-2 text-sm rounded-lg border transition ${stockFilter === 'out_of_stock'
                                            ? 'bg-red-100 border-red-500 text-red-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "Sin Stock" }), activeTab === 'school' && (_jsx("button", { onClick: () => setStockFilter('with_orders'), className: `px-3 py-2 text-sm rounded-lg border transition ${stockFilter === 'with_orders'
                                            ? 'bg-purple-100 border-purple-500 text-purple-700'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "Con Encargos" }))] }), _jsxs("button", { onClick: () => setShowFilters(!showFilters), className: `px-3 py-2 text-sm rounded-lg border transition flex items-center gap-2 ${showFilters || hasActiveFilters
                                    ? 'bg-blue-50 border-blue-300 text-blue-700'
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: [_jsx(Filter, { className: "w-4 h-4" }), "Filtros", hasActiveFilters && (_jsx("span", { className: "w-2 h-2 rounded-full bg-blue-600" })), _jsx(ChevronDown, { className: `w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}` })] }), hasActiveFilters && (_jsx("button", { onClick: clearFilters, className: "px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition", children: "Limpiar filtros" }))] }), showFilters && (_jsxs("div", { className: "mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-center gap-4", children: [activeTab === 'school' && availableSchools.length > 1 && (_jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-xs text-gray-500 mb-1", children: "Colegio" }), _jsxs("select", { value: schoolFilter, onChange: (e) => setSchoolFilter(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm", children: [_jsx("option", { value: "", children: "Todos los colegios" }), availableSchools.map(school => (_jsx("option", { value: school.id, children: school.name }, school.id)))] })] })), activeTab === 'school' && garmentTypes.length > 0 && (_jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-xs text-gray-500 mb-1", children: "Tipo de Prenda" }), _jsxs("select", { value: garmentTypeFilter, onChange: (e) => setGarmentTypeFilter(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm", children: [_jsx("option", { value: "", children: "Todos los tipos" }), garmentTypes.map(gt => (_jsx("option", { value: gt.id, children: gt.name }, gt.id)))] })] })), _jsxs("div", { className: "flex flex-col", children: [_jsx("label", { className: "text-xs text-gray-500 mb-1", children: "Talla" }), _jsxs("select", { value: sizeFilter, onChange: (e) => setSizeFilter(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm", children: [_jsx("option", { value: "", children: "Todas las tallas" }), uniqueSizes.map(size => (_jsx("option", { value: size, children: size }, size)))] })] })] }))] }), isLoading && (_jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando productos..." })] })), error && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6 mb-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error }), _jsx("button", { onClick: () => { setError(null); activeTab === 'school' ? loadProducts() : loadGlobalProducts(); }, className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Reintentar" })] })] }) })), !isLoading && !error && activeTab !== 'garment-types' && currentProducts.length > 0 && (_jsx("div", { className: "bg-white rounded-lg shadow-sm overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200 table-fixed", children: [_jsx("thead", { className: activeTab === 'global' ? 'bg-green-50' : 'bg-gray-50', children: _jsxs("tr", { children: [_jsx("th", { className: "w-28 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => handleSort('code'), children: _jsxs("div", { className: "flex items-center gap-1", children: ["Codigo", getSortIcon('code')] }) }), activeTab === 'school' && availableSchools.length > 1 && (_jsx("th", { className: "w-48 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Colegio" })), _jsx("th", { className: "px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => handleSort('name'), children: _jsxs("div", { className: "flex items-center gap-1", children: ["Nombre / Tipo", getSortIcon('name')] }) }), _jsx("th", { className: "w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => handleSort('size'), children: _jsxs("div", { className: "flex items-center gap-1", children: ["Talla", getSortIcon('size')] }) }), _jsx("th", { className: "w-24 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Color" }), _jsx("th", { className: "w-24 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => handleSort('price'), children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: ["Precio", getSortIcon('price')] }) }), _jsx("th", { className: "w-20 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => handleSort('stock'), children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: ["Stock", getSortIcon('stock')] }) }), activeTab === 'school' && (_jsx("th", { className: "w-24 px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100", onClick: () => handleSort('pending_orders'), children: _jsxs("div", { className: "flex items-center justify-center gap-1", children: ["Encargos", getSortIcon('pending_orders')] }) })), _jsx("th", { className: "w-20 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "w-20 px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: activeTab === 'school' ? (
                            // School products
                            filteredAndSortedProducts.map((product) => {
                                const stock = product.stock ?? product.inventory_quantity ?? 0;
                                const minStock = product.min_stock ?? product.inventory_min_stock ?? 5;
                                const isLowStock = stock <= minStock && stock > 0;
                                const isOutOfStock = stock === 0;
                                const schoolName = product.school_name;
                                const garmentTypeName = product.garment_type_name;
                                const pendingOrdersQty = product.pending_orders_qty ?? 0;
                                const pendingOrdersCount = product.pending_orders_count ?? 0;
                                return (_jsxs("tr", { className: "hover:bg-gray-50", children: [_jsx("td", { className: "w-28 px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900", children: product.code }), availableSchools.length > 1 && (_jsx("td", { className: "w-48 px-3 py-2 text-sm text-gray-900", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Building2, { className: "w-4 h-4 mr-2 text-gray-400 flex-shrink-0" }), _jsx("span", { className: "truncate", title: schoolName || '', children: schoolName || 'Sin colegio' })] }) })), _jsx("td", { className: "px-3 py-2", children: _jsxs("div", { children: [_jsx("div", { className: "text-sm font-medium text-gray-900 truncate", children: product.name || '-' }), garmentTypeName && (_jsx("div", { className: "text-xs text-gray-500 truncate", children: garmentTypeName }))] }) }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap text-sm text-gray-900", children: _jsx("span", { className: "px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium text-xs", children: product.size }) }), _jsx("td", { className: "w-24 px-3 py-2 whitespace-nowrap text-sm text-gray-900", children: product.color || '-' }), _jsxs("td", { className: "w-24 px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-medium", children: ["$", Number(product.price).toLocaleString()] }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap text-sm text-right", children: _jsxs("div", { className: "flex flex-col items-end", children: [_jsx("span", { className: `px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isOutOfStock
                                                            ? 'bg-red-100 text-red-800'
                                                            : isLowStock
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-green-100 text-green-800'}`, children: stock }), _jsxs("span", { className: "text-xs text-gray-400", children: ["min:", minStock] })] }) }), _jsx("td", { className: "w-24 px-3 py-2 whitespace-nowrap text-center", children: pendingOrdersQty > 0 ? (_jsxs("div", { className: "flex flex-col items-center", children: [_jsxs("span", { className: "px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full bg-purple-100 text-purple-800", children: [pendingOrdersQty, " uds"] }), _jsxs("span", { className: "text-xs text-gray-400", children: [pendingOrdersCount, " enc."] })] })) : (_jsx("span", { className: "text-xs text-gray-400", children: "-" })) }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap", children: _jsx("span", { className: `px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'}`, children: product.is_active ? 'Activo' : 'Inact.' }) }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap text-right text-sm font-medium", children: _jsxs("div", { className: "flex items-center justify-end gap-1", children: [_jsx("button", { onClick: () => handleStartSale(product), className: "text-purple-600 hover:text-purple-800 p-1 rounded hover:bg-purple-50", title: (product.stock ?? product.inventory_quantity ?? 0) > 0 ? "Iniciar venta con este producto" : "Crear encargo (sin stock)", children: _jsx(ShoppingCart, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleOpenModal(product), className: "text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50", title: "Editar producto", children: _jsx(Edit2, { className: "w-4 h-4" }) }), isSuperuser && (_jsx("button", { onClick: () => handleOpenInventoryModal(product), className: "text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50", title: "Ajustar inventario", children: _jsx(PackagePlus, { className: "w-4 h-4" }) }))] }) })] }, product.id));
                            })) : (
                            // Global products
                            filteredGlobalProducts.map((product) => {
                                const stock = product.inventory_quantity ?? 0;
                                const minStock = product.inventory_min_stock ?? 5;
                                const isLowStock = stock <= minStock && stock > 0;
                                const isOutOfStock = stock === 0;
                                return (_jsxs("tr", { className: "hover:bg-green-50", children: [_jsx("td", { className: "w-28 px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Globe, { className: "w-4 h-4 text-green-600 mr-2 flex-shrink-0" }), product.code] }) }), _jsx("td", { className: "px-3 py-2 text-sm text-gray-900", children: product.name || '-' }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap text-sm text-gray-900", children: _jsx("span", { className: "px-2 py-0.5 bg-gray-100 rounded text-gray-700 font-medium text-xs", children: product.size }) }), _jsx("td", { className: "w-24 px-3 py-2 whitespace-nowrap text-sm text-gray-900", children: product.color || '-' }), _jsxs("td", { className: "w-24 px-3 py-2 whitespace-nowrap text-sm text-gray-900 text-right font-medium", children: ["$", Number(product.price).toLocaleString()] }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap text-sm text-right", children: _jsxs("div", { className: "flex flex-col items-end", children: [_jsx("span", { className: `px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${isOutOfStock
                                                            ? 'bg-red-100 text-red-800'
                                                            : isLowStock
                                                                ? 'bg-yellow-100 text-yellow-800'
                                                                : 'bg-green-100 text-green-800'}`, children: stock }), _jsxs("span", { className: "text-xs text-gray-400", children: ["min:", minStock] })] }) }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap", children: _jsx("span", { className: `px-2 py-0.5 inline-flex text-xs leading-5 font-semibold rounded-full ${product.is_active
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-gray-100 text-gray-800'}`, children: product.is_active ? 'Activo' : 'Inact.' }) }), _jsx("td", { className: "w-20 px-3 py-2 whitespace-nowrap text-right text-sm font-medium", children: _jsx("div", { className: "flex items-center justify-end gap-1", children: isSuperuser && (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => handleOpenGlobalProductModal(product), className: "text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-50", title: "Editar producto global", children: _jsx(Edit2, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => handleOpenGlobalInventoryModal(product), className: "text-green-600 hover:text-green-800 p-1 rounded hover:bg-green-50", title: "Ajustar inventario global", children: _jsx(PackagePlus, { className: "w-4 h-4" }) })] })) }) })] }, product.id));
                            })) })] }) })), activeTab === 'garment-types' && !isLoading && !error && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm mb-6", children: [_jsxs("div", { className: "flex border-b border-gray-200", children: [_jsxs("button", { onClick: () => setShowGlobalTypes(false), className: `flex-1 py-3 px-4 text-sm font-medium border-b-2 transition ${!showGlobalTypes
                                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Building2, { className: "w-4 h-4 inline mr-2" }), "Tipos del Colegio (", garmentTypes.length, ")"] }), _jsxs("button", { onClick: () => setShowGlobalTypes(true), className: `flex-1 py-3 px-4 text-sm font-medium border-b-2 transition ${showGlobalTypes
                                    ? 'border-purple-600 text-purple-600 bg-purple-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'}`, children: [_jsx(Globe, { className: "w-4 h-4 inline mr-2" }), "Tipos Globales (", globalGarmentTypes.length, ")"] })] }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: showGlobalTypes ? 'bg-purple-50' : 'bg-blue-50', children: _jsxs("tr", { children: [!showGlobalTypes && (_jsx("th", { className: "w-16 px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Imagen" })), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Nombre" }), !showGlobalTypes && availableSchools.length > 1 && (_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Colegio" })), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Descripci\u00F3n" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Categor\u00EDa" }), _jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Req. Bordado" }), _jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Medidas Custom" }), _jsx("th", { className: "px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Acciones" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: (showGlobalTypes ? globalGarmentTypes : garmentTypes).map((type) => {
                                        // Get school name for school-specific types
                                        const schoolName = !showGlobalTypes && 'school_id' in type
                                            ? availableSchools.find(s => s.id === type.school_id)?.name
                                            : null;
                                        // Get primary image for school-specific types
                                        const primaryImage = !showGlobalTypes && 'images' in type && Array.isArray(type.images)
                                            ? type.images.find((img) => img.is_primary)?.image_url ||
                                                type.images[0]?.image_url
                                            : type.primary_image_url;
                                        return (_jsxs("tr", { className: "hover:bg-gray-50", children: [!showGlobalTypes && (_jsx("td", { className: "w-16 px-3 py-2", children: primaryImage ? (_jsx("img", { src: getImageUrl(primaryImage) || '', alt: type.name, className: "w-12 h-12 rounded object-cover" })) : (_jsx("div", { className: "w-12 h-12 bg-gray-100 rounded flex items-center justify-center", children: _jsx(ImageIcon, { className: "w-6 h-6 text-gray-400" }) })) })), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [showGlobalTypes && _jsx(Globe, { className: "w-4 h-4 text-purple-600 mr-2" }), _jsx("span", { className: "text-sm font-medium text-gray-900", children: type.name })] }) }), !showGlobalTypes && availableSchools.length > 1 && (_jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("div", { className: "flex items-center", children: [_jsx(Building2, { className: "w-4 h-4 text-gray-400 mr-2 flex-shrink-0" }), _jsx("span", { className: "text-sm text-gray-900", children: schoolName || 'Sin colegio' })] }) })), _jsx("td", { className: "px-6 py-4", children: _jsx("span", { className: "text-sm text-gray-600", children: type.description || '-' }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: type.category ? (_jsx("span", { className: `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${type.category === 'uniforme_diario'
                                                            ? 'bg-blue-100 text-blue-800'
                                                            : type.category === 'uniforme_deportivo'
                                                                ? 'bg-green-100 text-green-800'
                                                                : 'bg-gray-100 text-gray-800'}`, children: type.category === 'uniforme_diario'
                                                            ? 'Diario'
                                                            : type.category === 'uniforme_deportivo'
                                                                ? 'Deportivo'
                                                                : 'Accesorios' })) : (_jsx("span", { className: "text-xs text-gray-400", children: "-" })) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-center", children: type.requires_embroidery ? (_jsx("span", { className: "text-green-600", children: "\u2713" })) : (_jsx("span", { className: "text-gray-300", children: "-" })) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-center", children: type.has_custom_measurements ? (_jsx("span", { className: "text-green-600", children: "\u2713" })) : (_jsx("span", { className: "text-gray-300", children: "-" })) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-center", children: _jsx("span", { className: `px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${type.is_active
                                                            ? 'bg-green-100 text-green-800'
                                                            : 'bg-gray-100 text-gray-800'}`, children: type.is_active ? 'Activo' : 'Inactivo' }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-right text-sm font-medium", children: (showGlobalTypes ? isSuperuser : isAdmin) && (_jsx("button", { onClick: () => handleOpenGarmentTypeModal(type, showGlobalTypes), className: `${showGlobalTypes
                                                            ? 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
                                                            : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50'} p-1 rounded transition`, title: "Editar tipo de prenda", children: _jsx(Edit2, { className: "w-4 h-4" }) })) })] }, type.id));
                                    }) })] }) }), (showGlobalTypes ? globalGarmentTypes : garmentTypes).length === 0 && (_jsxs("div", { className: "text-center py-12", children: [_jsx(Tag, { className: `w-12 h-12 mx-auto mb-3 ${showGlobalTypes ? 'text-purple-400' : 'text-blue-400'}` }), _jsx("p", { className: "text-gray-600", children: showGlobalTypes
                                    ? 'No hay tipos de prenda globales'
                                    : 'No hay tipos de prenda para este colegio' }), (showGlobalTypes ? isSuperuser : isAdmin) && (_jsxs("button", { onClick: () => handleOpenGarmentTypeModal(undefined, showGlobalTypes), className: `mt-4 ${showGlobalTypes
                                    ? 'bg-purple-600 hover:bg-purple-700'
                                    : 'bg-blue-600 hover:bg-blue-700'} text-white px-4 py-2 rounded-lg inline-flex items-center transition`, children: [_jsx(Plus, { className: "w-4 h-4 mr-2" }), "Agregar Primer Tipo"] }))] }))] })), !isLoading && !error && activeTab !== 'garment-types' && currentProducts.length === 0 && (_jsxs("div", { className: `border rounded-lg p-12 text-center ${activeTab === 'global' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`, children: [_jsx(Package, { className: `w-16 h-16 mx-auto mb-4 ${activeTab === 'global' ? 'text-green-400' : 'text-blue-400'}` }), _jsx("h3", { className: `text-lg font-medium mb-2 ${activeTab === 'global' ? 'text-green-900' : 'text-blue-900'}`, children: hasActiveFilters ? 'No se encontraron productos' : 'No hay productos' }), _jsx("p", { className: activeTab === 'global' ? 'text-green-700 mb-4' : 'text-blue-700 mb-4', children: hasActiveFilters
                            ? 'Intenta ajustar los filtros de busqueda'
                            : activeTab === 'global'
                                ? 'Los productos globales son configurados por el administrador'
                                : 'Comienza agregando tu primer producto al catalogo' }), hasActiveFilters && (_jsx("button", { onClick: clearFilters, className: "text-blue-600 hover:text-blue-700 underline mr-4", children: "Limpiar filtros" })), !hasActiveFilters && activeTab === 'school' && (_jsxs("button", { onClick: () => handleOpenModal(), className: "bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center", children: [_jsx(Plus, { className: "w-5 h-5 mr-2" }), "Agregar Producto"] }))] })), _jsx(ProductModal, { isOpen: isModalOpen, onClose: handleCloseModal, onSuccess: handleSuccess, schoolId: schoolIdForCreate, product: selectedProduct }), inventoryModal && (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 transition-opacity", onClick: handleCloseInventoryModal }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-md w-full", children: [_jsxs("div", { className: `flex items-center justify-between p-6 border-b border-gray-200 ${inventoryModal.isGlobal ? 'bg-green-50' : ''}`, children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-800 flex items-center", children: [inventoryModal.isGlobal && _jsx(Globe, { className: "w-5 h-5 text-green-600 mr-2" }), "Ajustar Inventario ", inventoryModal.isGlobal ? 'Global' : ''] }), _jsx("button", { onClick: handleCloseInventoryModal, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { className: `rounded-lg p-4 ${inventoryModal.isGlobal ? 'bg-green-50' : 'bg-gray-50'}`, children: [_jsx("p", { className: "text-sm text-gray-600", children: "Producto:" }), _jsx("p", { className: "font-medium text-gray-900", children: inventoryModal.productCode }), _jsx("p", { className: "text-sm text-gray-700", children: inventoryModal.productName }), _jsxs("div", { className: "mt-2 flex items-center gap-2", children: [_jsx("span", { className: "text-sm text-gray-600", children: "Stock actual:" }), _jsxs("span", { className: `px-2 py-0.5 rounded-full text-sm font-medium ${inventoryModal.isGlobal ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`, children: [inventoryModal.currentStock, " unidades"] })] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tipo de ajuste" }), _jsxs("div", { className: "flex gap-2", children: [_jsx("button", { type: "button", onClick: () => setAdjustmentType('add'), className: `flex-1 py-2 px-4 rounded-lg border transition ${adjustmentType === 'add'
                                                                ? 'bg-green-100 border-green-500 text-green-700'
                                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "+ Agregar" }), _jsx("button", { type: "button", onClick: () => setAdjustmentType('remove'), className: `flex-1 py-2 px-4 rounded-lg border transition ${adjustmentType === 'remove'
                                                                ? 'bg-red-100 border-red-500 text-red-700'
                                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "- Remover" }), _jsx("button", { type: "button", onClick: () => setAdjustmentType('set'), className: `flex-1 py-2 px-4 rounded-lg border transition ${adjustmentType === 'set'
                                                                ? 'bg-blue-100 border-blue-500 text-blue-700'
                                                                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`, children: "= Establecer" })] })] }), _jsxs("div", { children: [_jsxs("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: [adjustmentType === 'set' ? 'Nuevo stock' : 'Cantidad', " *"] }), _jsx("input", { type: "number", value: adjustmentAmount, onChange: (e) => setAdjustmentAmount(e.target.value), min: "0", placeholder: adjustmentType === 'set' ? 'Ej: 50' : 'Ej: 10', className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" }), adjustmentType !== 'set' && adjustmentAmount && (_jsxs("p", { className: "mt-1 text-sm text-gray-500", children: ["Nuevo stock: ", adjustmentType === 'add'
                                                            ? inventoryModal.currentStock + parseInt(adjustmentAmount || '0')
                                                            : Math.max(0, inventoryModal.currentStock - parseInt(adjustmentAmount || '0')), " unidades"] }))] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-1", children: "Razon (opcional)" }), _jsx("input", { type: "text", value: adjustmentReason, onChange: (e) => setAdjustmentReason(e.target.value), placeholder: "Ej: Reposicion de inventario, Correccion de conteo...", className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] })] }), _jsxs("div", { className: "flex gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-lg", children: [_jsx("button", { type: "button", onClick: handleCloseInventoryModal, disabled: submitting, className: "flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition disabled:opacity-50", children: "Cancelar" }), _jsx("button", { type: "button", onClick: handleAdjustInventory, disabled: submitting || !adjustmentAmount, className: "flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 flex items-center justify-center", children: submitting ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Guardando..."] })) : (_jsxs(_Fragment, { children: [_jsx(Save, { className: "w-4 h-4 mr-2" }), "Guardar Ajuste"] })) })] })] }) })] })), _jsx(SaleModal, { isOpen: saleModalOpen, onClose: () => {
                    setSaleModalOpen(false);
                    setInitialProduct(null);
                }, onSuccess: () => {
                    setSaleModalOpen(false);
                    setInitialProduct(null);
                    loadProducts(); // Refresh stock after sale
                }, initialProduct: initialProduct || undefined, initialQuantity: 1 }), _jsx(OrderModal, { isOpen: orderModalOpen, onClose: () => {
                    setOrderModalOpen(false);
                    setInitialProduct(null);
                }, onSuccess: () => {
                    setOrderModalOpen(false);
                    setInitialProduct(null);
                    loadProducts(); // Refresh after order
                }, initialSchoolId: initialProduct?.school_id, initialProduct: initialProduct || undefined }), _jsx(GlobalProductModal, { isOpen: globalProductModalOpen, onClose: handleCloseGlobalProductModal, onSuccess: handleGlobalProductSuccess, product: selectedGlobalProduct }), _jsx(GarmentTypeModal, { isOpen: garmentTypeModalOpen, onClose: handleCloseGarmentTypeModal, onSuccess: handleGarmentTypeSuccess, garmentType: selectedGarmentType, isGlobal: isGlobalGarmentType, schoolId: schoolIdForCreate })] }));
}
