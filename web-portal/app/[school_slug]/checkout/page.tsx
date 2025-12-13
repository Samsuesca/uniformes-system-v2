'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { clientsApi, ordersApi } from '@/lib/api';

export default function CheckoutPage() {
  const router = useRouter();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    student_name: '',
    grade: '',
    notes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const schoolId = 'demo-school-id'; // TODO: Get from context

      // Step 1: Create client first
      const clientResponse = await clientsApi.create(schoolId, {
        school_id: schoolId,
        name: formData.client_name,
        phone: formData.client_phone,
        email: formData.client_email || undefined,
        student_name: formData.student_name || undefined,
        student_grade: formData.grade || undefined,
      });

      const client = clientResponse.data;

      // Step 2: Create order with client_id
      await ordersApi.create(schoolId, {
        school_id: schoolId,
        client_id: client.id,
        items: items.map(item => ({
          garment_type_id: item.product.garment_type_id,
          quantity: item.quantity,
          unit_price: item.product.price,
          size: item.product.size,
          gender: item.product.gender,
        })),
        notes: formData.notes || undefined,
      });

      setSuccess(true);
      clearCart();

      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (error: any) {
      console.error('Error creating order:', error);
      const errorMessage = error.response?.data?.detail || 'Error al crear el pedido. Por favor intenta de nuevo.';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl border border-surface-200 p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-10 h-10 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-primary font-display mb-2">
            ¡Pedido Confirmado!
          </h2>
          <p className="text-slate-600 mb-6">
            Hemos recibido tu pedido. Te contactaremos pronto para coordinar la entrega.
          </p>
          <p className="text-sm text-slate-500">
            Redirigiendo al inicio...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-50">
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.back()}
            className="flex items-center text-slate-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al carrito
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-3xl font-bold text-primary font-display mb-8">
          Finalizar Pedido
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-primary font-display mb-4">
                  Información de Contacto
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Teléfono *
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.client_phone}
                      onChange={(e) => setFormData({ ...formData, client_phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-lg font-bold text-primary font-display mb-4">
                  Información del Estudiante
                </h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nombre del estudiante
                    </label>
                    <input
                      type="text"
                      value={formData.student_name}
                      onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Grado
                    </label>
                    <input
                      type="text"
                      value={formData.grade}
                      onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Notas adicionales
                    </label>
                    <textarea
                      rows={3}
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Procesando...' : 'Confirmar Pedido'}
              </button>
            </form>
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl border border-surface-200 p-6 sticky top-4">
              <h2 className="text-lg font-bold text-primary font-display mb-4">
                Resumen
              </h2>
              <div className="space-y-3 mb-6">
                {items.map((item) => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium">
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
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
