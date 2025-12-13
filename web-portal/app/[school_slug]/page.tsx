'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Filter } from 'lucide-react';
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

    const { addItem, getTotalItems } = useCartStore();

    // Prevent hydration mismatch by only showing cart count after mount
    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        loadAllProducts();
    }, [schoolSlug]);

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

    const handleAddToCart = (product: Product) => {
        if (school) {
            addItem(product, school);
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
                        <p className="text-slate-600">No hay productos disponibles</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.id}
                                className="bg-white rounded-xl border border-surface-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
                            >
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
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            disabled={getProductStock(product) <= 0}
                                            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {getProductStock(product) > 0 ? 'Agregar' : 'Agotado'}
                                        </button>
                                    </div>
                                    <p className={`text-xs mt-2 ${getProductStock(product) > 0 ? 'text-green-600' : 'text-red-500'}`}>
                                        {getProductStock(product) > 0 ? (
                                            <>
                                                <span className="font-semibold">Disponible</span>
                                                <span className="text-slate-400 ml-1">({getProductStock(product)} unidades)</span>
                                            </>
                                        ) : (
                                            <span className="font-semibold">Agotado</span>
                                        )}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
