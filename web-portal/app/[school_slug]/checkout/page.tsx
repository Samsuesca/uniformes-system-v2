'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, School as SchoolIcon, Package } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { clientsApi, ordersApi } from '@/lib/api';
import { formatNumber } from '@/lib/utils';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.school_slug as string;
  const { items, getTotalPrice, clearCart, getItemsBySchool } = useCartStore();
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

  // Helper para obtener el stock del producto
  const getProductStock = (product: any): number => {
    return product.stock ?? product.stock_quantity ?? product.inventory_quantity ?? 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validar que haya items en el carrito
      if (items.length === 0) {
        alert('El carrito está vacío');
        setLoading(false);
        return;
      }

      // Validar stock disponible para todos los items
      for (const item of items) {
        const availableStock = getProductStock(item.product);
        if (item.quantity > availableStock) {
          alert(`Stock insuficiente para ${item.product.name}. Disponible: ${availableStock}, Solicitado: ${item.quantity}`);
          setLoading(false);
          return;
        }
      }

      // Obtener school_id del primer item (todos deben ser del mismo colegio)
      const schoolId = items[0].school.id;

      // Validar que se proporcione email (requerido para registro web)
      if (!formData.client_email) {
        alert('El email es requerido para completar el pedido');
        setLoading(false);
        return;
      }

      // Step 1: Register client (web portal endpoint)
      // Generar contraseña temporal basada en teléfono
      const tempPassword = `Temp${formData.client_phone.slice(-4)}!`;

      const clientResponse = await clientsApi.register({
        name: formData.client_name,
        email: formData.client_email,
        password: tempPassword,
        phone: formData.client_phone || undefined,
        students: [{
          school_id: schoolId,
          student_name: formData.student_name || formData.client_name,
          student_grade: formData.grade || undefined,
        }]
      });

      const client = clientResponse.data;

      // Step 2: Create order with client_id (using public web endpoint)
      await ordersApi.createWeb({
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
      let errorMessage = error.message || error.response?.data?.detail || 'Error al crear el pedido. Por favor intenta de nuevo.';

      // Mensajes más amigables dirigidos al negocio
      if (errorMessage.includes('already registered')) {
        errorMessage = 'Este email ya está registrado. Por favor usa un email diferente o contáctanos en la página de Soporte si necesitas ayuda.';
      } else if (errorMessage.includes('Stock insuficiente') || errorMessage.includes('insufficient')) {
        errorMessage = 'Lo sentimos, algunos productos no tienen stock suficiente. Por favor contáctanos en la página de Soporte para verificar disponibilidad.';
      } else {
        errorMessage = `Hubo un problema al procesar tu pedido. Por favor contáctanos en la página de Soporte. Error: ${errorMessage}`;
      }

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
                      Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.client_email}
                      onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Recibirás un correo con tu contraseña temporal para acceder a tu cuenta
                    </p>
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
            <div className="bg-white rounded-xl border border-surface-200 p-6 sticky top-4 space-y-4">
              <h2 className="text-lg font-bold text-primary font-display mb-4">
                Resumen del Pedido
              </h2>

              {/* Items grouped by school */}
              {Array.from(getItemsBySchool().entries()).map(([schoolId, schoolItems]) => {
                const school = schoolItems[0].school;
                const schoolTotal = schoolItems.reduce((sum, item) =>
                  sum + (item.product.price * item.quantity), 0
                );

                return (
                  <div key={schoolId} className="mb-4">
                    {/* School header */}
                    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-surface-200">
                      <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <SchoolIcon className="w-4 h-4 text-brand-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm text-primary truncate">
                          {school.name}
                        </h3>
                        <p className="text-xs text-slate-500">
                          {schoolItems.length} {schoolItems.length === 1 ? 'producto' : 'productos'}
                        </p>
                      </div>
                    </div>

                    {/* Products from this school */}
                    <div className="space-y-2 mb-3">
                      {schoolItems.map((item) => (
                        <div key={item.product.id} className="flex items-start gap-2 text-sm">
                          <Package className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-700 font-medium truncate">
                              {item.product.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {item.product.size || 'Talla única'} × {item.quantity}
                            </p>
                          </div>
                          <span className="font-semibold text-primary whitespace-nowrap">
                            ${formatNumber(item.product.price * item.quantity)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* School subtotal */}
                    <div className="flex justify-between items-center text-sm pt-2 border-t border-surface-100">
                      <span className="font-semibold text-slate-700">Subtotal:</span>
                      <span className="font-bold text-brand-600">
                        ${formatNumber(schoolTotal)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Total general */}
              <div className="border-t-2 border-surface-300 pt-4 flex justify-between items-center">
                <span className="font-bold text-lg text-primary">Total General:</span>
                <span className="text-2xl font-bold text-brand-600 font-display">
                  ${formatNumber(getTotalPrice())}
                </span>
              </div>

              {/* Info */}
              <div className="bg-blue-50 rounded-lg p-3 mt-4">
                <p className="text-xs text-blue-800 leading-relaxed">
                  <span className="font-semibold">Información importante:</span><br />
                  • Los uniformes se entregarán directamente en el colegio<br />
                  • Te contactaremos para confirmar tallas y coordinar la entrega<br />
                  • El pago se realiza contra entrega
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
