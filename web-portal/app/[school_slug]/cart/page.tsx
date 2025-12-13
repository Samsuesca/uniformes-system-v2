'use client';

import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { getProductImage } from '@/lib/api';

export default function CartPage() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.school_slug as string;

  const { items, removeItem, updateQuantity, getTotalPrice, getTotalItems } = useCartStore();

  const handleCheckout = () => {
    router.push(`/${schoolSlug}/checkout`);
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface-50">
        <header className="bg-white border-b border-surface-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <button
              onClick={() => router.push(`/${schoolSlug}`)}
              className="flex items-center text-slate-600 hover:text-primary transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Volver al catálogo
            </button>
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <div className="w-24 h-24 bg-surface-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShoppingBag className="w-12 h-12 text-slate-400" />
            </div>
            <h2 className="text-2xl font-bold text-primary font-display mb-2">
              Tu carrito está vacío
            </h2>
            <p className="text-slate-600 mb-8">
              Agrega productos desde el catálogo para continuar
            </p>
            <button
              onClick={() => router.push(`/${schoolSlug}`)}
              className="px-6 py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-medium"
            >
              Ver catálogo
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push(`/${schoolSlug}`)}
            className="flex items-center text-slate-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al catálogo
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-primary font-display mb-8">
          Carrito de Compras
          <span className="text-lg font-normal text-slate-500 ml-3">
            ({getTotalItems()} {getTotalItems() === 1 ? 'artículo' : 'artículos'})
          </span>
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Items List */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item) => (
              <div
                key={item.product.id}
                className="bg-white rounded-xl border border-surface-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center gap-6">
                  {/* Product Image */}
                  <div className="w-20 h-20 bg-gradient-to-br from-brand-50 to-surface-100 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-4xl">{getProductImage(item.product.name)}</span>
                  </div>

                  {/* Product Info */}
                  <div className="flex-1">
                    <h3 className="font-semibold text-primary font-display mb-1">
                      {item.product.name}
                    </h3>
                    <p className="text-sm text-slate-500 mb-2">
                      {item.product.size || 'Talla única'}
                    </p>
                    <p className="text-lg font-bold text-brand-600 font-display">
                      ${item.product.price.toLocaleString()}
                    </p>
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors"
                    >
                      <Minus className="w-4 h-4 text-slate-600" />
                    </button>
                    <span className="w-12 text-center font-semibold text-primary">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      disabled={item.quantity >= item.product.stock_quantity}
                      className="w-8 h-8 rounded-lg bg-surface-100 hover:bg-surface-200 flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4 text-slate-600" />
                    </button>
                  </div>

                  {/* Subtotal & Remove */}
                  <div className="flex flex-col items-end gap-2">
                    <p className="text-xl font-bold text-primary font-display">
                      ${(item.product.price * item.quantity).toLocaleString()}
                    </p>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-red-500 hover:text-red-600 transition-colors flex items-center gap-1 text-sm"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar
                    </button>
                  </div>
                </div>

                {/* Stock Warning */}
                {item.quantity >= item.product.stock_quantity && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      ⚠️ Stock máximo disponible: {item.product.stock_quantity} unidades
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-surface-200 p-6 sticky top-4">
              <h2 className="text-lg font-bold text-primary font-display mb-4">
                Resumen del Pedido
              </h2>

              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-primary">
                      ${(item.product.price * item.quantity).toLocaleString()}
                    </span>
                  </div>
                ))}

                <div className="border-t border-surface-200 pt-3 flex justify-between">
                  <span className="font-bold text-primary">Total</span>
                  <span className="text-2xl font-bold text-brand-600 font-display">
                    ${getTotalPrice().toLocaleString()}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                className="w-full py-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-bold shadow-lg hover:shadow-xl"
              >
                Continuar al Checkout
              </button>

              <p className="text-xs text-slate-500 text-center mt-4">
                Los pedidos son procesados manualmente. Te contactaremos pronto.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
