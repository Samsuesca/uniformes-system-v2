'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, ArrowLeft, Filter } from 'lucide-react';
import { productsApi, schoolsApi, type Product, getProductImage } from '@/lib/api';
import { useCartStore } from '@/lib/store';

export default function CatalogPage() {
    const params = useParams();
    const router = useRouter();
    const schoolSlug = params.school_slug as string;

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [error, setError] = useState<string | null>(null);

    const { addItem, getTotalItems } = useCartStore();

    useEffect(() => {
        loadProducts();
    }, [schoolSlug]);

    const loadProducts = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get school by slug first
            const schoolResponse = await schoolsApi.getBySlug(schoolSlug);
            const school = schoolResponse.data;

            // Then get products for that school
            const response = await productsApi.list(school.id);
            setProducts(response.data);
        } catch (error: any) {
            console.error('Error loading products:', error);
            setError(error.response?.data?.detail || 'Error al cargar productos');
        } finally {
            setLoading(false);
        }
    };

    const filteredProducts = filter === 'all'
        ? products
        : products.filter(p => p.name.toLowerCase().includes(filter.toLowerCase()));

    const handleAddToCart = (product: Product) => {
        addItem(product);
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
                        <h1 className="text-2xl font-bold text-primary font-display">
                            Catálogo de Uniformes
                        </h1>
                        <button
                            onClick={() => router.push(`/${schoolSlug}/cart`)}
                            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors relative"
                        >
                            <ShoppingCart className="w-5 h-5" />
                            {getTotalItems() > 0 && (
                                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-bold">
                                    {getTotalItems()}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Filters */}
            <div className="bg-white border-b border-surface-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center gap-4 overflow-x-auto">
                        <Filter className="w-5 h-5 text-slate-400 flex-shrink-0" />
                        {['all', 'camisa', 'pantalon', 'sudadera'].map((category) => (
                            <button
                                key={category}
                                onClick={() => setFilter(category)}
                                className={`px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap ${filter === category
                                        ? 'bg-brand-600 text-white shadow-lg'
                                        : 'bg-surface-100 text-slate-600 hover:bg-surface-200'
                                    }`}
                            >
                                {category === 'all' ? 'Todos' : category.charAt(0).toUpperCase() + category.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

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
                                    <p className="text-sm text-slate-500 mb-3">
                                        {product.size || 'Talla única'}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-2xl font-bold text-brand-600 font-display">
                                            ${product.price.toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => handleAddToCart(product)}
                                            className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors text-sm font-medium"
                                        >
                                            Agregar
                                        </button>
                                    </div>
                                    <p className="text-xs text-slate-400 mt-2">
                                        Stock: {product.stock_quantity}
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
