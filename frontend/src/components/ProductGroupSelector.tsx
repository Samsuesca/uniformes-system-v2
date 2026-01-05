/**
 * ProductGroupSelector - Modal for selecting products grouped by garment type
 *
 * Replaces the old ProductSelectorModal with a cleaner UI that groups products
 * Similar to the web portal's product selection experience
 */

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Loader2, Package, Filter } from 'lucide-react';
import { productService } from '../services/productService';
import type { Product, GarmentType } from '../types/api';
import { groupProductsByGarmentType, type ProductVariant, type ProductGroup } from '../utils/productGrouping';
import ProductGroupCard from './ProductGroupCard';

interface ProductGroupSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (product: Product, quantity: number) => void;
  schoolId: string;

  // Filtering options
  filterByStock?: 'with_stock' | 'without_stock' | 'all';
  allowGlobalProducts?: boolean;
  excludeProductIds?: string[];
  excludeGarmentTypeIds?: string[];

  // UI customization
  title?: string;
  emptyMessage?: string;
}

export default function ProductGroupSelector({
  isOpen,
  onClose,
  onSelect,
  schoolId,
  filterByStock = 'all',
  allowGlobalProducts = false,
  excludeProductIds = [],
  excludeGarmentTypeIds = [],
  title = 'Seleccionar Producto',
  emptyMessage = 'No se encontraron productos',
}: ProductGroupSelectorProps) {
  // Data state
  const [products, setProducts] = useState<Product[]>([]);
  const [garmentTypes, setGarmentTypes] = useState<GarmentType[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

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

      const [productsData, garmentTypesData] = await Promise.all([
        productService.getProducts(schoolId, true), // with inventory
        productService.getGarmentTypes(schoolId),
      ]);

      setProducts(productsData || []);
      setGarmentTypes(garmentTypesData || []);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  // Group products by garment type
  const productGroups = useMemo(() => {
    // Filter garment types first
    const filteredGarmentTypes = garmentTypes.filter(gt =>
      !excludeGarmentTypeIds.includes(gt.id)
    );

    // Filter products by excluded garment types
    const filteredProducts = products.filter(p =>
      !excludeGarmentTypeIds.includes(p.garment_type_id)
    );

    return groupProductsByGarmentType(filteredProducts, filteredGarmentTypes);
  }, [products, garmentTypes, excludeGarmentTypeIds]);

  // Apply search and category filters
  const filteredGroups = useMemo(() => {
    let filtered = productGroups;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(group =>
        group.garmentTypeName.toLowerCase().includes(query) ||
        group.variants.some(v =>
          v.productCode.toLowerCase().includes(query) ||
          (v.color && v.color.toLowerCase().includes(query))
        )
      );
    }

    // Category filter
    if (categoryFilter) {
      filtered = filtered.filter(group => group.garmentTypeId === categoryFilter);
    }

    // Stock filter - remove groups with no matching variants
    if (filterByStock === 'with_stock') {
      filtered = filtered.filter(group =>
        group.variants.some(v => v.stock > 0 && !excludeProductIds.includes(v.productId))
      );
    } else if (filterByStock === 'without_stock') {
      filtered = filtered.filter(group =>
        group.variants.some(v => v.stock === 0 && !excludeProductIds.includes(v.productId))
      );
    }

    return filtered;
  }, [productGroups, searchQuery, categoryFilter, filterByStock, excludeProductIds]);

  // Handle variant selection
  const handleVariantSelect = (variant: ProductVariant, quantity: number) => {
    // Find the full product object
    const product = products.find(p => p.id === variant.productId);
    if (product) {
      onSelect(product, quantity);
    }
  };

  const handleClose = () => {
    setSearchQuery('');
    setCategoryFilter('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-200 flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Package className="w-6 h-6 mr-2 text-blue-600" />
              {title}
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition p-1 hover:bg-gray-100 rounded-lg"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Search & Filters */}
          <div className="p-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
            <div className="flex gap-3">
              {/* Search */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por nombre, codigo, color..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                />
              </div>

              {/* Category Filter */}
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="pl-9 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white min-w-[180px]"
                >
                  <option value="">Todas las categorias</option>
                  {garmentTypes
                    .filter(gt => !excludeGarmentTypeIds.includes(gt.id))
                    .map(gt => (
                      <option key={gt.id} value={gt.id}>
                        {gt.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
                <p className="text-gray-600">Cargando productos...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="bg-red-100 text-red-700 px-6 py-4 rounded-lg">
                  <p className="font-medium">{error}</p>
                  <button
                    onClick={loadData}
                    className="mt-3 text-sm underline hover:no-underline"
                  >
                    Reintentar
                  </button>
                </div>
              </div>
            ) : filteredGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Package className="w-16 h-16 text-gray-300 mb-4" />
                <p className="text-gray-600 font-medium text-lg">{emptyMessage}</p>
                {(searchQuery || categoryFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setCategoryFilter('');
                    }}
                    className="mt-4 px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredGroups.map(group => (
                  <ProductGroupCard
                    key={group.garmentTypeId}
                    group={group}
                    onSelect={handleVariantSelect}
                    excludeProductIds={excludeProductIds}
                    filterByStock={filterByStock}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-gray-200 bg-gray-50 text-center text-sm text-gray-500 flex-shrink-0">
            {filteredGroups.length} tipo{filteredGroups.length !== 1 && 's'} de producto
            {searchQuery || categoryFilter ? ' (filtrado)' : ''}
          </div>
        </div>
      </div>
    </div>
  );
}
