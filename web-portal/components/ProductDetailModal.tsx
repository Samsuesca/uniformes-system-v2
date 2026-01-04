'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  ShoppingCart,
  Package,
  Ruler,
  Info,
  MessageCircle,
  Phone,
  Check
} from 'lucide-react';
import { type Product, type GarmentTypeImage, API_BASE_URL, getProductImage } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

interface ProductDetailModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, isOrder: boolean) => void;
  stock: number;
  isYomber?: boolean;
}

/**
 * Modal de detalle de producto estilo e-commerce
 * - Galería de imágenes con navegación
 * - Zoom en imágenes
 * - Información detallada del producto
 * - Espacio para guía de tallas (futuro)
 */
export default function ProductDetailModal({
  product,
  isOpen,
  onClose,
  onAddToCart,
  stock,
  isYomber = false
}: ProductDetailModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'sizes' | 'care'>('info');
  const [addedToCart, setAddedToCart] = useState(false);

  // Get sorted images
  const images = product.garment_type_images || [];
  const sortedImages = [...images].sort((a, b) => a.display_order - b.display_order);
  const hasImages = sortedImages.length > 0 || product.garment_type_primary_image_url;

  // Get full image URL
  const getFullImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) return imageUrl;
    return `${API_BASE_URL}${imageUrl}`;
  };

  // Get current image URL
  const getCurrentImageUrl = (): string | null => {
    if (sortedImages.length > 0) {
      return getFullImageUrl(sortedImages[currentImageIndex].image_url);
    }
    if (product.garment_type_primary_image_url) {
      return getFullImageUrl(product.garment_type_primary_image_url);
    }
    return null;
  };

  // Navigation handlers
  const handlePrevious = useCallback(() => {
    if (sortedImages.length > 1) {
      setCurrentImageIndex(prev => prev === 0 ? sortedImages.length - 1 : prev - 1);
    }
  }, [sortedImages.length]);

  const handleNext = useCallback(() => {
    if (sortedImages.length > 1) {
      setCurrentImageIndex(prev => prev === sortedImages.length - 1 ? 0 : prev + 1);
    }
  }, [sortedImages.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          if (isZoomed) {
            setIsZoomed(false);
          } else {
            onClose();
          }
          break;
        case 'ArrowLeft':
          handlePrevious();
          break;
        case 'ArrowRight':
          handleNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isZoomed, handlePrevious, handleNext, onClose]);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentImageIndex(0);
      setIsZoomed(false);
      setAddedToCart(false);
      // Find primary image index
      const primaryIdx = sortedImages.findIndex(img => img.is_primary);
      if (primaryIdx >= 0) {
        setCurrentImageIndex(primaryIdx);
      }
    }
  }, [isOpen, product.id]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Handle add to cart with feedback
  const handleAddToCart = (isOrder: boolean) => {
    onAddToCart(product, isOrder);
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 2000);
  };

  if (!isOpen) return null;

  const currentImageUrl = getCurrentImageUrl();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4">
          <div
            className="relative bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
              aria-label="Cerrar"
            >
              <X className="w-5 h-5 text-gray-700" />
            </button>

            <div className="flex flex-col lg:flex-row">
              {/* Left: Image Gallery */}
              <div className="lg:w-3/5 bg-gradient-to-br from-gray-50 to-gray-100">
                {/* Main Image */}
                <div className="relative aspect-square lg:aspect-[4/3]">
                  {currentImageUrl ? (
                    <div
                      className={`w-full h-full cursor-zoom-in ${isZoomed ? 'cursor-zoom-out' : ''}`}
                      onClick={() => setIsZoomed(!isZoomed)}
                    >
                      <img
                        src={currentImageUrl}
                        alt={product.name}
                        className={`w-full h-full transition-transform duration-300 ${
                          isZoomed
                            ? 'object-contain scale-150 cursor-move'
                            : 'object-contain'
                        }`}
                        draggable={false}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-9xl">{getProductImage(product.name)}</span>
                    </div>
                  )}

                  {/* Zoom indicator */}
                  {currentImageUrl && (
                    <button
                      onClick={() => setIsZoomed(!isZoomed)}
                      className="absolute bottom-4 right-4 w-10 h-10 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                      aria-label={isZoomed ? 'Reducir' : 'Ampliar'}
                    >
                      {isZoomed ? (
                        <ZoomOut className="w-5 h-5 text-gray-700" />
                      ) : (
                        <ZoomIn className="w-5 h-5 text-gray-700" />
                      )}
                    </button>
                  )}

                  {/* Navigation Arrows */}
                  {sortedImages.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePrevious(); }}
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                        aria-label="Imagen anterior"
                      >
                        <ChevronLeft className="w-6 h-6 text-gray-700" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleNext(); }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/90 hover:bg-white rounded-full shadow-lg flex items-center justify-center transition-colors"
                        aria-label="Siguiente imagen"
                      >
                        <ChevronRight className="w-6 h-6 text-gray-700" />
                      </button>
                    </>
                  )}

                  {/* Image Counter */}
                  {sortedImages.length > 1 && (
                    <div className="absolute top-4 left-4 bg-black/50 text-white text-sm px-3 py-1 rounded-full">
                      {currentImageIndex + 1} / {sortedImages.length}
                    </div>
                  )}
                </div>

                {/* Thumbnail Strip */}
                {sortedImages.length > 1 && (
                  <div className="p-4 border-t border-gray-200 bg-white">
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {sortedImages.map((img, idx) => (
                        <button
                          key={img.id}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentImageIndex
                              ? 'border-brand-600 ring-2 ring-brand-200'
                              : 'border-transparent hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={getFullImageUrl(img.image_url)}
                            alt={`${product.name} - Miniatura ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Product Info */}
              <div className="lg:w-2/5 p-6 lg:p-8 overflow-y-auto max-h-[50vh] lg:max-h-[90vh]">
                {/* Yomber Badge */}
                {isYomber && (
                  <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">
                    <span>✂️</span>
                    Confección Personalizada
                  </div>
                )}

                {/* Product Code */}
                <p className="text-sm text-gray-500 mb-1">
                  Código: {product.code}
                </p>

                {/* Product Name */}
                <h2 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">
                  {product.name}
                </h2>

                {/* Price */}
                <div className="mb-6">
                  <span className="text-3xl lg:text-4xl font-bold text-brand-600">
                    ${formatNumber(product.price)}
                  </span>
                </div>

                {/* Size & Color */}
                <div className="flex flex-wrap gap-3 mb-6">
                  {product.size && (
                    <div className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-sm text-gray-500">Talla</span>
                      <p className="font-semibold text-gray-900">
                        {/^\d+$/.test(product.size) ? `Talla ${product.size}` : product.size}
                      </p>
                    </div>
                  )}
                  {product.color && (
                    <div className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-sm text-gray-500">Color</span>
                      <p className="font-semibold text-gray-900">{product.color}</p>
                    </div>
                  )}
                  {product.gender && product.gender !== 'unisex' && (
                    <div className="px-4 py-2 bg-gray-100 rounded-lg">
                      <span className="text-sm text-gray-500">Género</span>
                      <p className="font-semibold text-gray-900 capitalize">{product.gender}</p>
                    </div>
                  )}
                </div>

                {/* Stock Status */}
                <div className="mb-6">
                  {isYomber ? (
                    <div className="flex items-center gap-2 text-purple-600">
                      <Ruler className="w-5 h-5" />
                      <span className="font-medium">Requiere medidas personalizadas</span>
                    </div>
                  ) : stock > 0 ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <Check className="w-5 h-5" />
                      <span className="font-medium">Disponible ({stock} unidades)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-orange-500">
                      <Package className="w-5 h-5" />
                      <span className="font-medium">Disponible por encargo</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="space-y-3 mb-8">
                  {isYomber ? (
                    <>
                      <a
                        href="https://wa.me/573105997451?text=Hola, estoy interesado en un yomber personalizado"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-green-500 text-white rounded-xl hover:bg-green-600 transition-colors font-semibold"
                      >
                        <MessageCircle className="w-5 h-5" />
                        Consultar por WhatsApp
                      </a>
                      <a
                        href="tel:+573105997451"
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-semibold"
                      >
                        <Phone className="w-5 h-5" />
                        Llamar para cita
                      </a>
                    </>
                  ) : stock > 0 ? (
                    <button
                      onClick={() => handleAddToCart(false)}
                      disabled={addedToCart}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all ${
                        addedToCart
                          ? 'bg-green-500 text-white'
                          : 'bg-brand-600 text-white hover:bg-brand-700'
                      }`}
                    >
                      {addedToCart ? (
                        <>
                          <Check className="w-5 h-5" />
                          ¡Agregado al carrito!
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-5 h-5" />
                          Agregar al carrito
                        </>
                      )}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAddToCart(true)}
                      disabled={addedToCart}
                      className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-lg transition-all ${
                        addedToCart
                          ? 'bg-green-500 text-white'
                          : 'bg-orange-500 text-white hover:bg-orange-600'
                      }`}
                    >
                      {addedToCart ? (
                        <>
                          <Check className="w-5 h-5" />
                          ¡Agregado como encargo!
                        </>
                      ) : (
                        <>
                          <Package className="w-5 h-5" />
                          Encargar producto
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Tabs for additional info */}
                <div className="border-t border-gray-200 pt-6">
                  <div className="flex gap-4 mb-4 border-b border-gray-200">
                    <button
                      onClick={() => setActiveTab('info')}
                      className={`pb-2 px-1 font-medium text-sm transition-colors ${
                        activeTab === 'info'
                          ? 'text-brand-600 border-b-2 border-brand-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Info className="w-4 h-4 inline mr-1" />
                      Información
                    </button>
                    <button
                      onClick={() => setActiveTab('sizes')}
                      className={`pb-2 px-1 font-medium text-sm transition-colors ${
                        activeTab === 'sizes'
                          ? 'text-brand-600 border-b-2 border-brand-600'
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Ruler className="w-4 h-4 inline mr-1" />
                      Guía de Tallas
                    </button>
                  </div>

                  {/* Tab Content */}
                  <div className="text-sm text-gray-600">
                    {activeTab === 'info' && (
                      <div className="space-y-3">
                        {product.description ? (
                          <p>{product.description}</p>
                        ) : (
                          <p>
                            Uniforme escolar de alta calidad, confeccionado con materiales
                            duraderos y cómodos para el uso diario.
                          </p>
                        )}
                        <ul className="space-y-2 mt-4">
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Confección nacional de calidad</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Materiales resistentes y duraderos</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span>Acabados de alta calidad</span>
                          </li>
                        </ul>
                      </div>
                    )}

                    {activeTab === 'sizes' && (
                      <div className="space-y-4">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                          <p className="text-blue-800 font-medium mb-2">
                            📏 Guía de Tallas
                          </p>
                          <p className="text-blue-700 text-sm">
                            Próximamente podrás ver la guía de tallas detallada para
                            este producto. Por ahora, te recomendamos contactarnos
                            para asesoría personalizada.
                          </p>
                        </div>

                        <div className="mt-4">
                          <p className="font-medium text-gray-700 mb-2">
                            Tallas disponibles:
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {['6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'].map(size => (
                              <span
                                key={size}
                                className={`px-3 py-1 rounded-full text-sm ${
                                  product.size === size
                                    ? 'bg-brand-600 text-white font-medium'
                                    : 'bg-gray-100 text-gray-600'
                                }`}
                              >
                                {size}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                          <p className="text-sm text-gray-600">
                            <span className="font-medium">¿Necesitas ayuda?</span>
                            <br />
                            Contáctanos por WhatsApp para recibir asesoría
                            personalizada sobre tallas.
                          </p>
                          <a
                            href="https://wa.me/573105997451?text=Hola, necesito ayuda con las tallas"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 mt-3 text-green-600 hover:text-green-700 font-medium"
                          >
                            <MessageCircle className="w-4 h-4" />
                            Consultar tallas
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
