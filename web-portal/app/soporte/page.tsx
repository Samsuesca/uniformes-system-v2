'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, AlertCircle, HelpCircle, MessageCircle, Clock, Wrench } from 'lucide-react';

export default function SoportePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'consulta',
    subject: '',
    message: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    // Simular envío (TODO: integrar con backend o servicio de email)
    await new Promise(resolve => setTimeout(resolve, 1500));

    setSuccess(true);
    setSubmitting(false);

    setTimeout(() => {
      setFormData({
        name: '',
        email: '',
        phone: '',
        type: 'consulta',
        subject: '',
        message: '',
      });
      setSuccess(false);
    }, 3000);
  };

  const pqrsTypes = [
    { value: 'consulta', label: 'Consulta', icon: HelpCircle, color: 'blue' },
    { value: 'peticion', label: 'Petición', icon: MessageSquare, color: 'green' },
    { value: 'queja', label: 'Queja', icon: AlertCircle, color: 'yellow' },
    { value: 'reclamo', label: 'Reclamo', icon: AlertCircle, color: 'red' },
    { value: 'sugerencia', label: 'Sugerencia', icon: MessageSquare, color: 'purple' },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Header */}
      <header className="bg-white border-b border-surface-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-slate-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver al Inicio
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary font-display mb-4">
            Centro de Soporte
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Estamos aquí para ayudarte. Contáctanos por cualquier consulta sobre uniformes, pedidos o soporte técnico.
          </p>
        </div>

        {/* Quick Contact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* Business Support */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-7 h-7 text-brand-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary mb-1">Atención al Cliente</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Consultas sobre uniformes, pedidos, encargos personalizados y medidas.
                </p>
                <div className="space-y-2">
                  <a
                    href="https://wa.me/573105997451?text=Hola, necesito información sobre uniformes"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp: +57 310 599 7451
                  </a>
                  <a
                    href="tel:+573105997451"
                    className="flex items-center gap-2 text-brand-600 hover:text-brand-700 font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Llamar: +57 310 599 7451
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Technical Support */}
          <div className="bg-white rounded-2xl border border-surface-200 p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Wrench className="w-7 h-7 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-primary mb-1">Soporte Técnico</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Problemas con la página web, tu cuenta o el proceso de compra.
                </p>
                <div className="space-y-2">
                  <a
                    href="https://wa.me/573015687810?text=Hola, necesito soporte técnico"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-green-600 hover:text-green-700 font-medium"
                  >
                    <MessageCircle className="w-4 h-4" />
                    WhatsApp: +57 301 568 7810
                  </a>
                  <a
                    href="tel:+573015687810"
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    <Phone className="w-4 h-4" />
                    Llamar: +57 301 568 7810
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información de Contacto */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-xl font-bold text-primary font-display mb-4">
                Información General
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-1">Email</h3>
                    <a href="mailto:uniformesconsuelo@gmail.com" className="text-brand-600 hover:underline text-sm">
                      uniformesconsuelo@gmail.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-1">Ubicación</h3>
                    <p className="text-slate-600 text-sm">
                      Bogotá, Colombia
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-brand-50 rounded-xl border border-brand-200 p-6">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-5 h-5 text-brand-600" />
                <h3 className="font-bold text-brand-900">Horario de Atención</h3>
              </div>
              <div className="text-sm text-brand-800 space-y-1">
                <p><span className="font-medium">Lunes a Viernes:</span> 8:00 AM - 6:00 PM</p>
                <p><span className="font-medium">Sábados:</span> 9:00 AM - 2:00 PM</p>
                <p><span className="font-medium">Domingos:</span> Cerrado</p>
              </div>
            </div>

            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h3 className="font-bold text-green-900 mb-2">Respuesta Rápida</h3>
              <p className="text-sm text-green-800">
                Para una respuesta más rápida, contáctanos por WhatsApp.
                Normalmente respondemos en menos de 2 horas durante horario de atención.
              </p>
            </div>
          </div>

          {/* Formulario PQRS */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-surface-200 p-8">
              <h2 className="text-2xl font-bold text-primary font-display mb-2">
                Formulario PQRS
              </h2>
              <p className="text-slate-600 mb-6">
                Peticiones, Quejas, Reclamos y Sugerencias
              </p>

              {success && (
                <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 text-green-800">
                    <Send className="w-5 h-5" />
                    <span className="font-semibold">¡Mensaje enviado exitosamente!</span>
                  </div>
                  <p className="text-sm text-green-700 mt-1">
                    Nos pondremos en contacto contigo pronto.
                  </p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de PQRS */}
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-3">
                    Tipo de Solicitud *
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    {pqrsTypes.map((type) => {
                      const Icon = type.icon;
                      const isSelected = formData.type === type.value;
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            isSelected
                              ? 'border-brand-500 bg-brand-50'
                              : 'border-surface-200 hover:border-surface-300'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`} />
                          <span className={`text-xs font-medium ${isSelected ? 'text-brand-700' : 'text-slate-600'}`}>
                            {type.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Información Personal */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Asunto *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Mensaje *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all resize-none"
                    placeholder="Describe tu consulta, petición, queja, reclamo o sugerencia..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      Enviar Mensaje
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-surface-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-slate-600 text-sm">
            <p>© {new Date().getFullYear()} Uniformes Consuelo Rios. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
