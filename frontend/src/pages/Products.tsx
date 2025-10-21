/**
 * Products Page - List and manage products
 */
import { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import ProductModal from '../components/ProductModal';
import { Package, Plus, Search, AlertCircle, Loader2 } from 'lucide-react';
import { productService } from '../services/productService';
import type { Product } from '../types/api';
import { useAuthStore } from '../stores/authStore';
import { DEMO_SCHOOL_ID } from '../config/constants';

export default function Products() {
  const { user } = useAuthStore();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  // TODO: Get school_id from user context or user_school_roles
  const schoolId = DEMO_SCHOOL_ID;

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await productService.getProducts(schoolId);
      setProducts(data);
    } catch (err: any) {
      console.error('Error loading products:', err);
      setError(err.response?.data?.detail || 'Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (product?: Product) => {
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

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesSearch = searchTerm === '' ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.size.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesSize = sizeFilter === '' || product.size === sizeFilter;

    return matchesSearch && matchesSize;
  });

  // Get unique sizes for filter
  const uniqueSizes = Array.from(new Set(products.map(p => p.size))).sort();

  return (
    <Layout>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <p className="text-gray-600 mt-1">
            {loading ? 'Cargando...' : `${filteredProducts.length} productos encontrados`}
          </p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
        >
          <Plus className="w-5 h-5 mr-2" />
          Nuevo Producto
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar productos por código, nombre, talla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
          <select
            value={sizeFilter}
            onChange={(e) => setSizeFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">Todas las tallas</option>
            {uniqueSizes.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando productos...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar productos</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <button
                onClick={loadProducts}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Products Table */}
      {!loading && !error && filteredProducts.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Talla
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Color
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {product.code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.name || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.size}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {product.color || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${Number(product.price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      product.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filteredProducts.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-12 text-center">
          <Package className="w-16 h-16 text-blue-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-blue-900 mb-2">
            {searchTerm || sizeFilter ? 'No se encontraron productos' : 'No hay productos'}
          </h3>
          <p className="text-blue-700 mb-4">
            {searchTerm || sizeFilter
              ? 'Intenta ajustar los filtros de búsqueda'
              : 'Comienza agregando tu primer producto al catálogo'
            }
          </p>
          {!searchTerm && !sizeFilter && (
            <button
              onClick={() => handleOpenModal()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg inline-flex items-center"
            >
              <Plus className="w-5 h-5 mr-2" />
              Agregar Producto
            </button>
          )}
        </div>
      )}

      {/* Product Modal */}
      <ProductModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSuccess={handleSuccess}
        schoolId={schoolId}
        product={selectedProduct}
      />
    </Layout>
  );
}
