'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Phone, MapPin, Send, MessageSquare, AlertCircle, HelpCircle } from 'lucide-react';

export default function SoportePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'consulta', // consulta, peticion, queja, reclamo, sugerencia
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

    // Limpiar formulario después de 3 segundos
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
            onClick={() => router.back()}
            className="flex items-center text-slate-600 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary font-display mb-4">
            Soporte y PQRS
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            ¿Tienes alguna pregunta, sugerencia o necesitas ayuda? Estamos aquí para asistirte.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Información de Contacto */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-xl border border-surface-200 p-6">
              <h2 className="text-xl font-bold text-primary font-display mb-4">
                Información de Contacto
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Mail className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-1">Email</h3>
                    <a href="mailto:contacto@uniformes.com" className="text-brand-600 hover:underline">
                      contacto@uniformes.com
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Phone className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-1">Teléfono</h3>
                    <a href="tel:+573001234567" className="text-brand-600 hover:underline">
                      +57 300 123 4567
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-1">Dirección</h3>
                    <p className="text-slate-600 text-sm">
                      Calle 123 #45-67<br />
                      Bogotá, Colombia
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 rounded-xl border border-blue-200 p-6">
              <h3 className="font-bold text-blue-900 mb-2">Horario de Atención</h3>
              <p className="text-sm text-blue-800">
                Lunes a Viernes: 8:00 AM - 6:00 PM<br />
                Sábados: 9:00 AM - 2:00 PM
              </p>
            </div>
          </div>

          {/* Formulario PQRS */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl border border-surface-200 p-8">
              <h2 className="text-2xl font-bold text-primary font-display mb-6">
                Formulario de Contacto
              </h2>

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
                      return (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, type: type.value })}
                          className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                            formData.type === type.value
                              ? `border-${type.color}-500 bg-${type.color}-50`
                              : 'border-surface-200 hover:border-surface-300'
                          }`}
                        >
                          <Icon className={`w-6 h-6 ${formData.type === type.value ? `text-${type.color}-600` : 'text-slate-400'}`} />
                          <span className={`text-xs font-medium ${formData.type === type.value ? `text-${type.color}-700` : 'text-slate-600'}`}>
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
    </div>
  );
}
