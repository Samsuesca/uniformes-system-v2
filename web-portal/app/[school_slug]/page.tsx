'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Filter, Phone, MessageCircle, Package, X, Search, SlidersHorizontal, Globe, Clock, ChevronUp, ChevronDown } from 'lucide-react';
import { productsApi, schoolsApi, type Product, type School, getProductImage } from '@/lib/api';
import { useCartStore } from '@/lib/store';
import { formatNumber } from '@/lib/utils';

export default function CatalogPage() {
    const params = useParams();
    const router = useRouter();
    const schoolSlug = params.school_slug as string;

    const [school, setSchool] = useState<School | null>(null);
    const [products, setProducts] = useState<Product[]>([]);
    const [globalProducts, setGlobalProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [sizeFilter, setSizeFilter] = useState('all');
    const [error, setError] = useState<string | null>(null);
    const [categories, setCategories] = useState<string[]>(['all']);
    const [sizes, setSizes] = useState<string[]>([]);
    const [mounted, setMounted] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState('');
    const [globalSearch, setGlobalSearch] = useState(false);
    const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
    const [showInStock, setShowInStock] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [searchHistory, setSearchHistory] = useState<string[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [priceStats, setPriceStats] = useState<{ min_price: number; max_price: number } | null>(null);

    const { addItem, getTotalItems } = useCartStore();

    // Modal state for yomber/custom products info
    const [showYomberModal, setShowYomberModal] = useState(false);
    const [selectedYomberProduct, setSelectedYomberProduct] = useState<Product | null>(null);

    // Prevent hydration mismatch by only showing cart count after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    // Check if product is a yomber (requires custom measurements - presencial)
    const isYomberProduct = (product: Product): boolean => {
        const name = product.name.toLowerCase();
        return name.includes('yomber');
    };

    // Handle yomber product click - show info modal
    const handleYomberClick = (product: Product) => {
        setSelectedYomberProduct(product);
        setShowYomberModal(true);
    };

    useEffect(() => {
        loadAllProducts();
    }, [schoolSlug]);

    // Load search history from localStorage on mount
    useEffect(() => {
        const history = localStorage.getItem(`search_history_${schoolSlug}`);
        if (history) {
            try {
                setSearchHistory(JSON.parse(history));
            } catch (e) {
                console.error('Failed to load search history:', e);
            }
        }
    }, [schoolSlug]);

    // Load price stats when school is loaded
    useEffect(() => {
        if (school) {
            productsApi.getStats(school.id)
                .then(stats => {
                    setPriceStats(stats);
                    setPriceRange([stats.min_price, stats.max_price]);
                })
                .catch(err => console.error('Failed to load price stats:', err));
        }
    }, [school]);

    // Debounced search effect
    useEffect(() => {
        if (!school) return;

        const timer = setTimeout(async () => {
            if (searchQuery.trim().length > 0) {
                setIsSearching(true);
                try {
                    const results = await productsApi.search(school.id, {
                        query: searchQuery,
                        category: filter !== 'all' ? filter : undefined,
                        size: sizeFilter !== 'all' ? sizeFilter : undefined,
                        min_price: priceRange[0],
                        max_price: priceRange[1],
                        in_stock: showInStock || undefined,
                        global_search: globalSearch
                    });

                    // Update products with search results
                    setProducts(results);
                    setGlobalProducts([]); // Clear global products when searching

                    // Save to search history
                    const newHistory = [searchQuery, ...searchHistory.filter(q => q !== searchQuery)].slice(0, 10);
                    setSearchHistory(newHistory);
                    localStorage.setItem(`search_history_${schoolSlug}`, JSON.stringify(newHistory));
                } catch (error) {
                    console.error('Search error:', error);
                } finally {
                    setIsSearching(false);
                }
            } else if (searchQuery.length === 0) {
                // Clear search - reload all products
                loadAllProducts();
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, filter, sizeFilter, priceRange, showInStock, globalSearch, school]);

    const loadAllProducts = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get school by slug first
            const schoolResponse = await schoolsApi.getBySlug(schoolSlug);
            const schoolData = schoolResponse.data;
            setSchool(schoolData);

            // Load both school products and global products in parallel
            const [schoolProductsResponse, globalProductsResponse] = await Promise.allSettled([
                productsApi.list(schoolData.id),
                productsApi.listGlobal({ with_inventory: true, limit: 500 })
            ]);

            // Extract school products
            const schoolProductsData = schoolProductsResponse.status === 'fulfilled'
                ? schoolProductsResponse.value.data
                : [];

            // Extract global products (optional, don't fail if error)
            const globalProductsData = globalProductsResponse.status === 'fulfilled'
                ? globalProductsResponse.value.data
                : [];

            if (globalProductsResponse.status === 'rejected') {
                console.error('Error loading global products:', globalProductsResponse.reason);
            }

            // Update state
            setProducts(schoolProductsData);
            setGlobalProducts(globalProductsData);

            // Update categories and sizes with BOTH loaded
            updateCategoriesAndSizes(schoolProductsData, globalProductsData);

        } catch (error: any) {
            console.error('Error loading products:', error);
            setError(error.response?.data?.detail || 'Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const loadProducts = async () => {
        // Reload just in case (for retry button)
        await loadAllProducts();
    };

    const updateCategoriesAndSizes = (schoolProds: Product[], globalProds: Product[]) => {
        // Combine both product lists for categorization
        const allProducts = [...schoolProds, ...globalProds];

        // Extract unique categories from products
        const uniqueCategories = new Set<string>();
        const uniqueSizes = new Set<string>();

        // Categorize ONLY school products (not global)
        schoolProds.forEach(p => {
            const name = p.name.toLowerCase();

            // Categorize products
            if (name.includes('camisa') || name.includes('blusa') || name.includes('camiseta')) {
                uniqueCategories.add('Camisas');
            } else if (name.includes('chompa')) {
                uniqueCategories.add('Chompas');
            } else if (name.includes('pantalon') || name.includes('falda')) {
                uniqueCategories.add('Pantalones');
            } else if (name.includes('sudadera') || name.includes('buzo') || name.includes('chaqueta')) {
                uniqueCategories.add('Sudaderas');
            } else if (name.includes('yomber')) {
                uniqueCategories.add('Yomber');
            } else if (name.includes('zapato') || name.includes('tennis') || name.includes('media') || name.includes('jean')) {
                uniqueCategories.add('Calzado');
            }
        });

        // Add "Otros" category if there are global products
        if (globalProds.length > 0) {
            uniqueCategories.add('Otros');
        }

        // Extract sizes from ALL products (school + global)
        allProducts.forEach(p => {
            if (p.size && p.size !== 'Única') {
                uniqueSizes.add(p.size);
            }
        });

        setCategories(['all', ...Array.from(uniqueCategories).sort()]);

        // Sort sizes: numbers first, then letters
        const sortedSizes = Array.from(uniqueSizes).sort((a, b) => {
            const aIsNum = /^\d+$/.test(a);
            const bIsNum = /^\d+$/.test(b);
            if (aIsNum && bIsNum) return parseInt(a) - parseInt(b);
            if (aIsNum) return -1;
            if (bIsNum) return 1;
            return a.localeCompare(b);
        });
        setSizes(sortedSizes);
    };

    // Combine school products and global products
    const allProducts = [...products, ...globalProducts];

    const filteredProducts = allProducts.filter(p => {
        const name = p.name.toLowerCase();
        const filterLower = filter.toLowerCase();

        // Check if product is global (exists in globalProducts array)
        const isGlobalProduct = globalProducts.some(gp => gp.id === p.id);

        // Filter by category
        let categoryMatch = true;
        if (filter !== 'all') {
            if (filterLower === 'otros') {
                // "Otros" category shows ONLY global products
                categoryMatch = isGlobalProduct;
            } else {
                // For other categories, exclude global products and match by name
                categoryMatch = !isGlobalProduct && (
                    (filterLower === 'camisas' && (name.includes('camisa') || name.includes('blusa') || name.includes('camiseta'))) ||
                    (filterLower === 'chompas' && name.includes('chompa')) ||
                    (filterLower === 'pantalones' && (name.includes('pantalon') || name.includes('falda'))) ||
                    (filterLower === 'sudaderas' && (name.includes('sudadera') || name.includes('buzo') || name.includes('chaqueta'))) ||
                    (filterLower === 'yomber' && name.includes('yomber')) ||
                    (filterLower === 'calzado' && (name.includes('zapato') || name.includes('tennis') || name.includes('media') || name.includes('jean')))
                );
            }
        }

        // Filter by size
        const sizeMatch = sizeFilter === 'all' || p.size === sizeFilter;

        return categoryMatch && sizeMatch;
    });

    const handleAddToCart = (product: Product, isOrder: boolean = false) => {
        if (school) {
            addItem(product, school, isOrder);
        }
    };

    // Helper para obtener el stock del producto
    const getProductStock = (product: Product): number => {
        return product.stock ?? product.stock_quantity ?? product.inventory_quantity ?? 0;
    };

    return (
        <div className="min-h-screen bg-surface-50">
            {/* Header */}
            <header className="bg-white border-b border-surface-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => router.push('/')}
                            className="flex items-center text-slate-600 hover:text-primary transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Volver
                        </button>
                        <div className="text-center">
                            <h1 className="text-2xl font-bold text-primary font-display">
                                {school ? school.name : 'Catálogo de Uniformes'}
                            </h1>
                            <p className="text-sm text-slate-500">
                                Catálogo de Uniformes
                            </p>
                        </div>
                        <button
                            onClick={() => router.push(`/${schoolSlug}/cart`)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors relative"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {mounted && getTotalItems() > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {getTotalItems()}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Search Bar Section */}
            <div className="bg-white border-b border-surface-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="mb-4 space-y-4">
                        {/* Main Search Input */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Buscar productos por nombre, descripción..."
                                className="w-full pl-12 pr-12 py-3 text-base border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-transparent shadow-sm"
                            />
                            {isSearching && (
                                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                    <div className="animate-spin w-5 h-5 border-2 border-brand-500 border-t-transparent rounded-full" />
                                </div>
                            )}
                            {searchQuery && !isSearching && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Search Options Row */}
                        <div className="flex items-center gap-3 flex-wrap">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                <SlidersHorizontal className="w-4 h-4" />
                                <span className="text-sm font-medium">Filtros Avanzados</span>
                                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>

                            <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={globalSearch}
                                    onChange={(e) => setGlobalSearch(e.target.checked)}
                                    className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                />
                                <Globe className="w-4 h-4 text-gray-600" />
                                <span className="text-sm font-medium">Buscar en todos los colegios</span>
                            </label>

                            {searchQuery && (
                                <div className="text-sm text-gray-600">
                                    {allProducts.length} resultado{allProducts.length !== 1 ? 's' : ''}
                                </div>
                            )}
                        </div>

                        {/* Search History */}
                        {!searchQuery && searchHistory.length > 0 && (
                            <div className="flex items-center gap-2 flex-wrap">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="text-xs text-gray-500">Búsquedas recientes:</span>
                                {searchHistory.slice(0, 5).map((query, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setSearchQuery(query)}
                                        className="text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
                                    >
                                        {query}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Advanced Filters Panel */}
                    {showFilters && priceStats && (
                        <div className="mb-4 p-6 border border-gray-200 rounded-xl bg-gray-50 space-y-6">
                            {/* Price Range Slider */}
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Rango de Precio
                                </label>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                                        <span>${priceRange[0].toLocaleString()}</span>
                                        <span>${priceRange[1].toLocaleString()}</span>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Precio Mínimo</label>
                                            <input
                                                type="range"
                                                min={priceStats.min_price}
                                                max={priceStats.max_price}
                                                value={priceRange[0]}
                                                onChange={(e) => setPriceRange([Number(e.target.value), priceRange[1]])}
                                                className="w-full"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-600 mb-1">Precio Máximo</label>
                                            <input
                                                type="range"
                                                min={priceStats.min_price}
                                                max={priceStats.max_price}
                                                value={priceRange[1]}
                                                onChange={(e) => setPriceRange([priceRange[0], Number(e.target.value)])}
                                                className="w-full"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Stock Filter */}
                            <div>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showInStock}
                                        onChange={(e) => setShowInStock(e.target.checked)}
                                        className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500"
                                    />
                                    <Package className="w-4 h-4 text-gray-600" />
                                    <span className="text-sm font-medium text-gray-700">Solo productos en stock</span>
                                </label>
                            </div>

                            {/* Clear Filters Button */}
                            <button
                                onClick={() => {
                                    if (priceStats) {
                                        setPriceRange([priceStats.min_price, priceStats.max_price]);
                                    }
                                    setShowInStock(false);
                                    setSearchQuery('');
                                    setFilter('all');
                                    setSizeFilter('all');
                                    setGlobalSearch(false);
                                }}
                                className="w-full px-4 py-2 text-sm font-medium text-brand-600 border border-brand-600 rounded-lg hover:bg-brand-50 transition-colors"
                            >
                                Limpiar todos los filtros
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Category Filters */}
            {categories.length > 1 && (
                <div className="bg-white border-b border-surface-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-4 overflow-x-auto pb-2">
                            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-slate-600 flex-shrink-0">Categoría:</span>
                            {categories.map((category) => (
                                <button
                                    key={category}
                                    onClick={() => setFilter(category)}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${filter === category
                                            ? 'bg-brand-600 text-white shadow-lg'
                                            : 'bg-surface-100 text-slate-600 hover:bg-surface-200'
                                        }`}
                                >
                                    {category === 'all' ? 'Todos' : category}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Size Filters */}
            {sizes.length > 0 && (
                <div className="bg-white border-b border-surface-200">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center gap-4 overflow-x-auto pb-2">
                            <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
                            <span className="text-sm font-semibold text-slate-600 flex-shrink-0">Talla:</span>
                            <button
                                onClick={() => setSizeFilter('all')}
                                className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${sizeFilter === 'all'
                                        ? 'bg-brand-600 text-white shadow-lg'
                                        : 'bg-surface-100 text-slate-600 hover:bg-surface-200'
                                    }`}
                            >
                                Todas
                            </button>
                            {sizes.map((size) => (
                                <button
                                    key={size}
                                    onClick={() => setSizeFilter(size)}
                                    className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${sizeFilter === size
                                            ? 'bg-brand-600 text-white shadow-lg'
                                            : 'bg-surface-100 text-slate-600 hover:bg-surface-200'
                                        }`}
                                >
                                    {/^\d+$/.test(size) ? `Talla ${size}` : size}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Products Grid */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error ? (
                    <div className="text-center py-12 bg-red-50 rounded-xl border border-red-200">
                        <p className="text-red-600 font-semibold mb-2">Error al cargar el catálogo</p>
                        <p className="text-sm text-red-500">{error}</p>
                        <button
                            onClick={loadProducts}
                            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Reintentar
                        </button>
                    </div>
                ) : loading ? (
                    <div className="text-center py-12">
                        <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600"></div>
                        <p className="mt-4 text-slate-600">Cargando productos...</p>
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
                        {searchQuery ? (
                            <>
                                <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    No se encontraron productos
                                </h3>
                                <p className="text-gray-500 mb-4">
                                    No hay resultados para "{searchQuery}"
                                    {globalSearch && ' en ningún colegio'}
                                </p>
                                <button
                                    onClick={() => {
                                        setSearchQuery('');
                                        setGlobalSearch(false);
                                    }}
                                    className="text-brand-600 hover:text-brand-700 font-medium"
                                >
                                    Limpiar búsqueda
                                </button>
                            </>
                        ) : (
                            <>
                                <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                                    No hay productos disponibles
                                </h3>
                                <p className="text-gray-500">
                                    {filter !== 'all' || sizeFilter !== 'all'
                                        ? 'Intenta cambiar los filtros para ver más productos'
                                        : 'No hay productos en el catálogo actualmente'}
                                </p>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => {
                            const stock = getProductStock(product);
                            const isYomber = isYomberProduct(product);

                            return (
                                <div
                                    key={product.id}
                                    className={`bg-white rounded-xl border overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300 ${
                                        isYomber ? 'border-purple-200' : 'border-surface-200'
                                    }`}
                                >
                                    {/* Yomber Badge */}
                                    {isYomber && (
                                        <div className="bg-purple-600 text-white text-xs font-semibold px-3 py-1 text-center">
                                            ✂️ Confección Personalizada
                                        </div>
                                    )}

                                    <div className="aspect-square bg-gradient-to-br from-brand-50 to-surface-100 flex items-center justify-center">
                                        <span className="text-6xl">{getProductImage(product.name)}</span>
                                    </div>
                                    <div className="p-4">
                                        <h3 className="font-semibold text-primary font-display mb-1">
                                            {product.name}
                                        </h3>
                                        <div className="flex items-center gap-2 mb-3">
                                            <p className="text-sm text-slate-600">
                                                {product.size
                                                    ? (/^\d+$/.test(product.size) ? `Talla ${product.size}` : product.size)
                                                    : 'Talla única'}
                                            </p>
                                            {product.color && (
                                                <>
                                                    <span className="text-slate-300">•</span>
                                                    <p className="text-sm text-slate-600">
                                                        {product.color}
                                                    </p>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-2xl font-bold text-brand-600 font-display">
                                                ${formatNumber(product.price)}
                                            </span>

                                            {/* Yomber: Show contact button */}
                                            {isYomber ? (
                                                <button
                                                    onClick={() => handleYomberClick(product)}
                                                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                                                >
                                                    Consultar
                                                </button>
                                            ) : stock > 0 ? (
                                                /* Has stock: Add to cart */
                                                <button
                                                    onClick={() => handleAddToCart(product, false)}
                                                    className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                                                >
                                                    Agregar
                                                </button>
                                            ) : (
                                                /* No stock: Add as order */
                                                <button
                                                    onClick={() => handleAddToCart(product, true)}
                                                    className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium flex items-center gap-1"
                                                >
                                                    <Package className="w-4 h-4" />
                                                    Encargar
                                                </button>
                                            )}
                                        </div>

                                        {/* Stock status */}
                                        {isYomber ? (
                                            <p className="text-xs text-purple-600 mt-2">
                                                <span className="font-semibold">Requiere medidas personalizadas</span>
                                            </p>
                                        ) : (
                                            <p className={`text-xs mt-2 ${stock > 0 ? 'text-green-600' : 'text-orange-500'}`}>
                                                {stock > 0 ? (
                                                    <>
                                                        <span className="font-semibold">Disponible</span>
                                                        <span className="text-slate-400 ml-1">({stock} unidades)</span>
                                                    </>
                                                ) : (
                                                    <span className="font-semibold">📦 Disponible por encargo</span>
                                                )}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>

            {/* Yomber Info Modal */}
            {showYomberModal && selectedYomberProduct && (
                <div className="fixed inset-0 z-50 overflow-y-auto">
                    <div
                        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                        onClick={() => setShowYomberModal(false)}
                    />
                    <div className="flex min-h-screen items-center justify-center p-4">
                        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
                            {/* Close button */}
                            <button
                                onClick={() => setShowYomberModal(false)}
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-6 h-6" />
                            </button>

                            {/* Header */}
                            <div className="text-center mb-6">
                                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-3xl">✂️</span>
                                </div>
                                <h3 className="text-xl font-bold text-primary font-display">
                                    {selectedYomberProduct.name}
                                </h3>
                                <p className="text-2xl font-bold text-purple-600 mt-2">
                                    Desde ${formatNumber(selectedYomberProduct.price)}
                                </p>
                            </div>

                            {/* Info */}
                            <div className="bg-purple-50 rounded-xl p-4 mb-6">
                                <h4 className="font-semibold text-purple-900 mb-2">
                                    Confección Personalizada
                                </h4>
                                <p className="text-sm text-purple-700 mb-3">
                                    Los yombers se confeccionan a medida para garantizar el mejor ajuste.
                                    Para este producto necesitamos tomar las siguientes medidas:
                                </p>
                                <ul className="text-sm text-purple-700 space-y-1 ml-4">
                                    <li>• Talle delantero</li>
                                    <li>• Talle trasero</li>
                                    <li>• Cintura</li>
                                    <li>• Largo</li>
                                </ul>
                            </div>

                            {/* Contact options */}
                            <div className="space-y-3">
                                <p className="text-sm text-slate-600 text-center mb-4">
                                    Contáctanos para agendar tu cita de medidas:
                                </p>

                                <a
                                    href="https://wa.me/573105997451?text=Hola, estoy interesado en un yomber personalizado"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold"
                                >
                                    <MessageCircle className="w-5 h-5" />
                                    WhatsApp
                                </a>

                                <a
                                    href="tel:+573105997451"
                                    className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold"
                                >
                                    <Phone className="w-5 h-5" />
                                    Llamar
                                </a>

                                <button
                                    onClick={() => router.push('/soporte')}
                                    className="w-full py-3 text-slate-600 hover:text-slate-800 transition-colors text-sm"
                                >
                                    Ver más opciones de contacto
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
