import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * ProductSelectorModal - Professional product selection component
 * Features: Search, filters, grid/list view, stock indicators
 */
import { useState, useEffect, useMemo } from 'react';
import { X, Search, Package, Grid3x3, List, ChevronDown, Check, AlertTriangle, Plus, Loader2, } from 'lucide-react';
import { productService } from '../services/productService';
export default function ProductSelectorModal({ isOpen, onClose, onSelect, schoolId, filterByStock = 'all', allowGlobalProducts = false, excludeProductIds = [], includeProductIds, title = 'Seleccionar Producto', emptyMessage = 'No se encontraron productos', }) {
    // View state
    const [viewMode, setViewMode] = useState('grid');
    const [productSource, setProductSource] = useState('school');
    const [showFilters, setShowFilters] = useState(false);
    // Search and filters
    const [searchQuery, setSearchQuery] = useState('');
    const [garmentTypeFilter, setGarmentTypeFilter] = useState('');
    const [sizeFilter, setSizeFilter] = useState('');
    const [colorFilter, setColorFilter] = useState('');
    // Data
    const [products, setProducts] = useState([]);
    const [globalProducts, setGlobalProducts] = useState([]);
    const [garmentTypes, setGarmentTypes] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    // Quantity tracking for quick add
    const [quantities, setQuantities] = useState({});
    // Load data when modal opens
    useEffect(() => {
        if (isOpen && schoolId) {
            loadData();
        }
    }, [isOpen, schoolId]);
    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            // Load school products, global products (if allowed), and garment types in parallel
            const promises = [
                productService.getProducts(schoolId, true), // with inventory
                productService.getGarmentTypes(schoolId),
            ];
            if (allowGlobalProducts) {
                promises.push(productService.getGlobalProducts(true)); // with inventory
            }
            const results = await Promise.all(promises);
            setProducts(results[0] || []);
            setGarmentTypes(results[1] || []);
            if (allowGlobalProducts && results[2]) {
                setGlobalProducts(results[2]);
            }
        }
        catch (err) {
            console.error('Error loading products:', err);
            setError('Error al cargar productos');
        }
        finally {
            setLoading(false);
        }
    };
    // Get garment type name for a product
    const getGarmentTypeName = (garmentTypeId) => {
        return garmentTypes.find(gt => gt.id === garmentTypeId)?.name || 'Sin tipo';
    };
    // Filtered products based on all filters
    const filteredProducts = useMemo(() => {
        let filtered = productSource === 'school' ? products : globalProducts;
        // Include only specific products (if provided) - takes precedence
        if (includeProductIds && includeProductIds.length > 0) {
            filtered = filtered.filter(p => includeProductIds.includes(p.id));
        }
        // Stock filter (based on prop)
        if (filterByStock === 'with_stock') {
            filtered = filtered.filter(p => (p.stock ?? p.inventory_quantity ?? 0) > 0);
        }
        else if (filterByStock === 'without_stock') {
            filtered = filtered.filter(p => (p.stock ?? p.inventory_quantity ?? 0) === 0);
        }
        // Exclude already selected products
        if (excludeProductIds.length > 0) {
            filtered = filtered.filter(p => !excludeProductIds.includes(p.id));
        }
        // Search query (fuzzy)
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(p => p.code.toLowerCase().includes(query) ||
                (p.name && p.name.toLowerCase().includes(query)) ||
                p.size.toLowerCase().includes(query) ||
                (p.color && p.color.toLowerCase().includes(query)) ||
                getGarmentTypeName(p.garment_type_id).toLowerCase().includes(query));
        }
        // Garment type filter
        if (garmentTypeFilter) {
            filtered = filtered.filter(p => p.garment_type_id === garmentTypeFilter);
        }
        // Size filter
        if (sizeFilter) {
            filtered = filtered.filter(p => p.size === sizeFilter);
        }
        // Color filter
        if (colorFilter) {
            filtered = filtered.filter(p => p.color === colorFilter);
        }
        return filtered;
    }, [
        products,
        globalProducts,
        productSource,
        filterByStock,
        excludeProductIds,
        includeProductIds,
        searchQuery,
        garmentTypeFilter,
        sizeFilter,
        colorFilter,
        garmentTypes,
    ]);
    // Get available sizes dynamically
    const availableSizes = useMemo(() => {
        const sizes = new Set();
        (productSource === 'school' ? products : globalProducts).forEach(p => {
            if (p.size)
                sizes.add(p.size);
        });
        return Array.from(sizes).sort();
    }, [products, globalProducts, productSource]);
    // Get available colors dynamically
    const availableColors = useMemo(() => {
        const colors = new Set();
        (productSource === 'school' ? products : globalProducts).forEach(p => {
            if (p.color)
                colors.add(p.color);
        });
        return Array.from(colors).sort();
    }, [products, globalProducts, productSource]);
    const handleSelect = (product) => {
        const quantity = quantities[product.id] || 1;
        onSelect(product, quantity);
    };
    const handleSetQuantity = (productId, quantity) => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(1, quantity) }));
    };
    const handleClose = () => {
        // Reset state
        setSearchQuery('');
        setGarmentTypeFilter('');
        setSizeFilter('');
        setColorFilter('');
        setQuantities({});
        onClose();
    };
    if (!isOpen)
        return null;
    return (_jsxs("div", { className: "fixed inset-0 z-50 overflow-y-auto", children: [_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50", onClick: handleClose }), _jsx("div", { className: "flex min-h-screen items-center justify-center p-4", children: _jsxs("div", { className: "relative bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[85vh] flex flex-col", children: [_jsxs("div", { className: "flex items-center justify-between p-6 border-b border-gray-200", children: [_jsxs("h2", { className: "text-xl font-semibold text-gray-800 flex items-center", children: [_jsx(Package, { className: "w-6 h-6 mr-2 text-blue-600" }), title] }), _jsx("button", { onClick: handleClose, className: "text-gray-400 hover:text-gray-600 transition", children: _jsx(X, { className: "w-6 h-6" }) })] }), _jsxs("div", { className: "p-4 border-b border-gray-200 bg-gray-50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsxs("div", { className: "flex-1 relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", placeholder: "Buscar por c\u00F3digo, nombre, talla, color...", value: searchQuery, onChange: e => setSearchQuery(e.target.value), className: "w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" })] }), _jsxs("div", { className: "flex items-center gap-1 bg-white border border-gray-300 rounded-lg p-1", children: [_jsx("button", { onClick: () => setViewMode('grid'), className: `p-2 rounded transition ${viewMode === 'grid'
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'text-gray-600 hover:bg-gray-100'}`, title: "Vista Grid", children: _jsx(Grid3x3, { className: "w-4 h-4" }) }), _jsx("button", { onClick: () => setViewMode('list'), className: `p-2 rounded transition ${viewMode === 'list'
                                                        ? 'bg-blue-100 text-blue-600'
                                                        : 'text-gray-600 hover:bg-gray-100'}`, title: "Vista Lista", children: _jsx(List, { className: "w-4 h-4" }) })] }), _jsxs("button", { onClick: () => setShowFilters(!showFilters), className: "px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100 transition flex items-center gap-2", children: ["Filtros", _jsx(ChevronDown, { className: `w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}` })] })] }), showFilters && (_jsxs("div", { className: "mt-3 pt-3 border-t border-gray-200 grid grid-cols-3 gap-3", children: [_jsxs("select", { value: garmentTypeFilter, onChange: e => setGarmentTypeFilter(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm", children: [_jsx("option", { value: "", children: "Todos los tipos" }), garmentTypes.map(gt => (_jsx("option", { value: gt.id, children: gt.name }, gt.id)))] }), _jsxs("select", { value: sizeFilter, onChange: e => setSizeFilter(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm", children: [_jsx("option", { value: "", children: "Todas las tallas" }), availableSizes.map(size => (_jsxs("option", { value: size, children: ["Talla: ", size] }, size)))] }), _jsxs("select", { value: colorFilter, onChange: e => setColorFilter(e.target.value), className: "px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm", children: [_jsx("option", { value: "", children: "Todos los colores" }), availableColors.map(color => (_jsx("option", { value: color, children: color }, color)))] })] }))] }), allowGlobalProducts && (_jsxs("div", { className: "flex border-b border-gray-200 bg-gray-50", children: [_jsxs("button", { onClick: () => setProductSource('school'), className: `flex-1 px-6 py-3 text-sm font-medium transition ${productSource === 'school'
                                        ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`, children: ["\uD83D\uDCE6 Productos del Colegio (", products.length, ")"] }), _jsxs("button", { onClick: () => setProductSource('global'), className: `flex-1 px-6 py-3 text-sm font-medium transition ${productSource === 'global'
                                        ? 'border-b-2 border-purple-600 text-purple-600 bg-white'
                                        : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'}`, children: ["\uD83C\uDF10 Productos Globales (", globalProducts.length, ")"] })] })), _jsx("div", { className: "flex-1 overflow-y-auto p-6", children: loading ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600 mb-3" }), _jsx("p", { className: "text-gray-600", children: "Cargando productos..." })] })) : error ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-12", children: [_jsx(AlertTriangle, { className: "w-12 h-12 text-red-600 mb-3" }), _jsx("p", { className: "text-red-700 font-medium", children: error }), _jsx("button", { onClick: loadData, className: "mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition", children: "Reintentar" })] })) : filteredProducts.length === 0 ? (_jsxs("div", { className: "flex flex-col items-center justify-center py-12", children: [_jsx(Package, { className: "w-12 h-12 text-gray-300 mb-3" }), _jsx("p", { className: "text-gray-600 font-medium", children: emptyMessage }), (searchQuery || garmentTypeFilter || sizeFilter || colorFilter) && (_jsx("button", { onClick: () => {
                                            setSearchQuery('');
                                            setGarmentTypeFilter('');
                                            setSizeFilter('');
                                            setColorFilter('');
                                        }, className: "mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition", children: "Limpiar filtros" }))] })) : viewMode === 'grid' ? (_jsx("div", { className: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4", children: filteredProducts.map(product => (_jsx(ProductCardGrid, { product: product, garmentTypeName: getGarmentTypeName(product.garment_type_id), quantity: quantities[product.id] || 1, onSetQuantity: handleSetQuantity, onSelect: handleSelect, isGlobal: productSource === 'global' }, product.id))) })) : (_jsx("div", { className: "space-y-2", children: filteredProducts.map(product => (_jsx(ProductCardList, { product: product, garmentTypeName: getGarmentTypeName(product.garment_type_id), quantity: quantities[product.id] || 1, onSetQuantity: handleSetQuantity, onSelect: handleSelect, isGlobal: productSource === 'global' }, product.id))) })) }), _jsxs("div", { className: "p-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600 text-center", children: ["Mostrando ", filteredProducts.length, " producto", filteredProducts.length !== 1 && 's'] })] }) })] }));
}
function ProductCardGrid({ product, garmentTypeName, quantity, onSetQuantity, onSelect, isGlobal, }) {
    const stock = product.stock ?? product.inventory_quantity ?? 0;
    const minStock = product.min_stock ?? product.inventory_min_stock ?? 5;
    return (_jsxs("div", { className: "group relative bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-lg transition-all cursor-pointer", children: [_jsx("div", { className: "aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden flex items-center justify-center", children: product.image_url ? (_jsx("img", { src: product.image_url, alt: product.code, className: "w-full h-full object-cover" })) : (_jsx(Package, { className: "w-12 h-12 text-gray-300" })) }), _jsx("p", { className: "text-xs font-mono text-gray-500 mb-1", children: product.code }), _jsx("p", { className: "font-semibold text-gray-900 text-sm mb-2 truncate", title: product.name || garmentTypeName, children: product.name || garmentTypeName }), _jsxs("div", { className: "flex flex-wrap gap-1 mb-2", children: [_jsxs("span", { className: "px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full", children: ["Talla: ", product.size] }), product.color && (_jsx("span", { className: "px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full", children: product.color }))] }), _jsxs("p", { className: "text-lg font-bold text-green-600 mb-2", children: ["$", Number(product.price).toLocaleString()] }), _jsx("div", { className: "flex items-center gap-1 text-sm mb-2", children: stock > minStock ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4 text-green-600" }), _jsxs("span", { className: "text-green-600", children: [stock, " uds"] })] })) : stock > 0 ? (_jsxs(_Fragment, { children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-yellow-600" }), _jsxs("span", { className: "text-yellow-600", children: [stock, " uds"] })] })) : (_jsxs(_Fragment, { children: [_jsx(X, { className: "w-4 h-4 text-red-600" }), _jsx("span", { className: "text-red-600", children: "Sin stock" })] })) }), _jsxs("div", { className: "absolute inset-0 bg-blue-600 bg-opacity-95 rounded-lg p-4 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsx("label", { htmlFor: `qty-${product.id}`, className: "text-white text-sm mb-2", children: "Cantidad:" }), _jsx("input", { id: `qty-${product.id}`, type: "number", min: "1", value: quantity, onChange: e => onSetQuantity(product.id, parseInt(e.target.value) || 1), onClick: e => e.stopPropagation(), onFocus: e => e.target.select(), className: "w-20 px-2 py-1 text-center border rounded mb-3 focus:ring-2 focus:ring-white focus:border-transparent outline-none" }), _jsxs("button", { onClick: e => {
                            e.stopPropagation();
                            onSelect(product);
                        }, className: "w-full px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-gray-100 flex items-center justify-center gap-2", children: [_jsx(Plus, { className: "w-4 h-4" }), "Agregar"] })] })] }));
}
// ===== LIST VIEW CARD =====
function ProductCardList({ product, garmentTypeName, quantity, onSetQuantity, onSelect, isGlobal, }) {
    const stock = product.stock ?? product.inventory_quantity ?? 0;
    const minStock = product.min_stock ?? product.inventory_min_stock ?? 5;
    return (_jsxs("div", { className: "bg-white border border-gray-200 rounded-lg p-4 hover:border-blue-400 hover:shadow-md transition-all flex items-center gap-4", children: [_jsx("div", { className: "w-16 h-16 bg-gray-100 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden", children: product.image_url ? (_jsx("img", { src: product.image_url, alt: product.code, className: "w-full h-full object-cover" })) : (_jsx(Package, { className: "w-8 h-8 text-gray-300" })) }), _jsx("div", { className: "flex-1 min-w-0", children: _jsxs("div", { className: "flex items-start justify-between gap-4", children: [_jsxs("div", { className: "flex-1", children: [_jsx("p", { className: "text-xs font-mono text-gray-500", children: product.code }), _jsx("p", { className: "font-semibold text-gray-900 truncate", children: product.name || garmentTypeName }), _jsxs("div", { className: "flex flex-wrap gap-2 mt-1", children: [_jsxs("span", { className: "text-xs text-gray-600", children: ["Talla: ", product.size] }), product.color && _jsxs("span", { className: "text-xs text-gray-600", children: ["\u2022 ", product.color] })] })] }), _jsxs("div", { className: "text-right", children: [_jsxs("p", { className: "text-lg font-bold text-green-600", children: ["$", Number(product.price).toLocaleString()] }), _jsx("div", { className: "flex items-center justify-end gap-1 mt-1", children: stock > minStock ? (_jsxs(_Fragment, { children: [_jsx(Check, { className: "w-4 h-4 text-green-600" }), _jsxs("span", { className: "text-sm text-green-600", children: [stock, " uds"] })] })) : stock > 0 ? (_jsxs(_Fragment, { children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-yellow-600" }), _jsxs("span", { className: "text-sm text-yellow-600", children: [stock, " uds"] })] })) : (_jsxs(_Fragment, { children: [_jsx(X, { className: "w-4 h-4 text-red-600" }), _jsx("span", { className: "text-sm text-red-600", children: "Sin stock" })] })) })] })] }) }), _jsxs("div", { className: "flex items-center gap-2 flex-shrink-0", children: [_jsx("input", { type: "number", min: "1", value: quantity, onChange: e => onSetQuantity(product.id, parseInt(e.target.value) || 1), className: "w-16 px-2 py-1 text-center border border-gray-300 rounded" }), _jsxs("button", { onClick: () => onSelect(product), className: "px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center gap-2", children: [_jsx(Plus, { className: "w-4 h-4" }), "Agregar"] })] })] }));
}
