'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle, School as SchoolIcon, Package, Eye, EyeOff, Mail, AlertCircle, Loader2, User, X, CreditCard, Upload } from 'lucide-react';
import { useCartStore } from '@/lib/store';
import { clientsApi, ordersApi } from '@/lib/api';
import { useClientAuth } from '@/lib/clientAuth';
import { formatNumber } from '@/lib/utils';
import UploadPaymentProofModal from '@/components/UploadPaymentProofModal';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type CheckoutStep = 'email' | 'verify' | 'details';

export default function CheckoutPage() {
  const params = useParams();
  const router = useRouter();
  const schoolSlug = params.school_slug as string;
  const { items, getTotalPrice, clearCart, getItemsBySchool, hasOrderItems } = useCartStore();
  const { client: authClient, isAuthenticated, login } = useClientAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [orderCode, setOrderCode] = useState('');
  const [firstOrderId, setFirstOrderId] = useState(''); // Store first order ID for upload
  // Multi-school order results
  const [orderResults, setOrderResults] = useState<{schoolName: string; orderCode: string; total: number}[]>([]);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Step management for new users
  const [step, setStep] = useState<CheckoutStep>('email');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [emailVerified, setEmailVerified] = useState(false);

  const [formData, setFormData] = useState({
    client_name: '',
    client_phone: '',
    client_email: '',
    client_password: '',
    client_password_confirm: '',
    student_name: '',
    grade: '',
    notes: '',
  });
  const [showFormPassword, setShowFormPassword] = useState(false);

  // Login modal state
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Pre-fill form if user is logged in
  useEffect(() => {
    if (mounted && isAuthenticated && authClient) {
      setFormData(prev => ({
        ...prev,
        client_name: authClient.name || prev.client_name,
        client_email: authClient.email || prev.client_email,
        client_phone: authClient.phone || prev.client_phone,
      }));
      // Skip verification for authenticated users
      setStep('details');
      setEmailVerified(true);
    }
  }, [mounted, isAuthenticated, authClient]);

  // Countdown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Helper para obtener el stock del producto
  const getProductStock = (product: any): number => {
    return product.stock ?? product.stock_quantity ?? product.inventory_quantity ?? 0;
  };

  const validateEmail = (email: string) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleSendCode = async () => {
    if (!formData.client_email || !validateEmail(formData.client_email)) {
      setError('Ingresa un correo electrónico válido');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/portal/clients/verify-email/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.client_email,
          name: formData.client_name || undefined
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Error al enviar código');
      }

      setStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Error al enviar el código');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Ingresa el código de 6 dígitos');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/portal/clients/verify-email/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.client_email,
          code: verificationCode
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Código inválido');
      }

      setEmailVerified(true);
      setStep('details');
    } catch (err: any) {
      setError(err.message || 'Código inválido o expirado');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Validar que haya items en el carrito
      if (items.length === 0) {
        setError('El carrito está vacío');
        setLoading(false);
        return;
      }

      // Validar stock disponible solo para items que NO son encargos
      // Los encargos (isOrder=true) no requieren stock - se ordenarán/fabricarán
      for (const item of items) {
        if (!item.isOrder) {
          const availableStock = getProductStock(item.product);
          if (item.quantity > availableStock) {
            setError(`Stock insuficiente para ${item.product.name}. Disponible: ${availableStock}, Solicitado: ${item.quantity}`);
            setLoading(false);
            return;
          }
        }
      }

      // Get first school_id for client registration (students can be from multiple schools)
      const firstSchoolId = items[0].school.id;

      let clientId: string;

      // Check if already authenticated
      if (isAuthenticated && authClient) {
        clientId = authClient.id;
      } else {
        // Validar contraseña para nuevos usuarios
        if (!formData.client_password || formData.client_password.length < 8) {
          setError('La contraseña debe tener al menos 8 caracteres');
          setLoading(false);
          return;
        }
        if (formData.client_password !== formData.client_password_confirm) {
          setError('Las contraseñas no coinciden');
          setLoading(false);
          return;
        }

        // Step 1: Register client (web portal endpoint)
        // Register student with first school, client is global
        const clientResponse = await clientsApi.register({
          name: formData.client_name,
          email: formData.client_email,
          password: formData.client_password,
          phone: formData.client_phone || undefined,
          students: [{
            school_id: firstSchoolId,
            student_name: formData.student_name || formData.client_name,
            student_grade: formData.grade || undefined,
          }]
        });

        const client = clientResponse.data;
        clientId = client.id;

        // Auto-login the client
        await login(formData.client_email, formData.client_password);
      }

      // Step 2: Create orders with client_id (using public web endpoint)
      // Multi-school: Create separate orders for each school
      const itemsBySchool = getItemsBySchool();
      const results: {schoolName: string; orderCode: string; total: number}[] = [];

      for (const [schoolId, schoolItems] of itemsBySchool.entries()) {
        const schoolTotal = schoolItems.reduce(
          (sum, item) => sum + (item.product.price * item.quantity), 0
        );

        const orderResponse = await ordersApi.createWeb({
          school_id: schoolId,
          client_id: clientId,
          items: schoolItems.map(item => ({
            garment_type_id: item.product.garment_type_id,
            quantity: item.quantity,
            unit_price: item.product.price,
            size: item.product.size,
            gender: item.product.gender,
          })),
          notes: formData.notes || undefined,
        });

        results.push({
          schoolName: schoolItems[0].school.name,
          orderCode: orderResponse.data.code || '',
          total: schoolTotal,
        });

        // Store first order ID for payment proof upload
        if (results.length === 1) {
          setFirstOrderId(orderResponse.data.id);
        }
      }

      // Store results and show success
      setOrderResults(results);
      // For backwards compatibility, set orderCode to first result
      setOrderCode(results.length > 0 ? results[0].orderCode : '');
      setSuccess(true);
      clearCart();
    } catch (error: any) {
      console.error('Error creating order:', error);
      let errorMessage = error.message || error.response?.data?.detail || 'Error al crear el pedido. Por favor intenta de nuevo.';

      if (errorMessage.includes('already registered')) {
        errorMessage = 'Este email ya está registrado. Por favor inicia sesión o usa un email diferente.';
      } else if (errorMessage.includes('Stock insuficiente') || errorMessage.includes('insufficient')) {
        errorMessage = 'Lo sentimos, algunos productos no tienen stock suficiente. Por favor contáctanos en la página de Soporte para verificar disponibilidad.';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const hasMultipleOrders = orderResults.length > 1;
    const totalAmount = orderResults.reduce((sum, r) => sum + r.total, 0);

    return (
      <>
        <div className="min-h-screen bg-surface-50 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white rounded-2xl border border-surface-200 p-8">
            {/* Success Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-primary font-display mb-2">
                {hasMultipleOrders ? '¡Pedidos Confirmados!' : '¡Pedido Confirmado!'}
              </h2>
            </div>

            {/* Single order display */}
            {!hasMultipleOrders && orderCode && (
              <div className="text-center mb-6">
                <p className="text-sm text-slate-600 mb-1">Código de pedido</p>
                <p className="text-2xl font-bold text-brand-600 mb-2">
                  {orderCode}
                </p>
                <p className="text-3xl font-bold text-green-600">
                  ${formatNumber(totalAmount)}
                </p>
              </div>
            )}

            {/* Multiple orders display */}
            {hasMultipleOrders && (
              <div className="space-y-3 mb-6">
                {orderResults.map((result, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center gap-2 text-sm text-brand-600 mb-2">
                      <SchoolIcon className="w-4 h-4" />
                      {result.schoolName}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-primary text-lg">
                        {result.orderCode}
                      </span>
                      <span className="font-semibold text-green-600 text-lg">
                        ${formatNumber(result.total)}
                      </span>
                    </div>
                  </div>
                ))}
                <div className="border-t-2 border-gray-300 pt-3 flex justify-between items-center">
                  <span className="font-bold text-gray-700 text-lg">Total:</span>
                  <span className="text-2xl font-bold text-brand-600">
                    ${formatNumber(totalAmount)}
                  </span>
                </div>
              </div>
            )}

            {/* Next Steps */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
              <h3 className="font-bold text-blue-900 text-lg mb-3 flex items-center gap-2">
                <span>📋</span> Próximos pasos
              </h3>
              <ol className="space-y-2 text-blue-800">
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">1.</span>
                  <span>Realiza el pago por transferencia bancaria o Nequi</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">2.</span>
                  <span>Sube el comprobante de pago usando el botón de abajo</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="font-bold mt-0.5">3.</span>
                  <span>Espera la confirmación y procesaremos tu pedido</span>
                </li>
              </ol>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              <button
                onClick={() => window.open('/pago', '_blank')}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-semibold"
              >
                <CreditCard className="w-5 h-5" />
                Ver Métodos de Pago
              </button>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center justify-center gap-2 py-3 px-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold"
              >
                <Upload className="w-5 h-5" />
                Subir Comprobante
              </button>
            </div>

            {/* Account created info */}
            {!isAuthenticated && (
              <div className="bg-green-50 rounded-xl p-4 mb-6 border border-green-200">
                <p className="text-sm font-semibold text-green-800 mb-1">
                  ✓ Tu cuenta ha sido creada
                </p>
                <p className="text-xs text-green-700">
                  Ya puedes iniciar sesión con tu email y contraseña para ver el estado de tus pedidos.
                </p>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => router.push('/mi-cuenta')}
                className="w-full py-3 border-2 border-brand-600 text-brand-600 rounded-xl hover:bg-brand-50 transition-colors font-semibold"
              >
                Ver Mis Pedidos
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full py-3 text-slate-600 hover:text-slate-800 transition-colors"
              >
                Volver al Inicio
              </button>
            </div>
          </div>
        </div>

        {/* Upload Payment Proof Modal */}
        {firstOrderId && (
          <UploadPaymentProofModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            orderId={firstOrderId}
            onUploadSuccess={() => {
              // Could show additional success message or redirect
              console.log('Payment proof uploaded successfully');
            }}
          />
        )}
      </>
    );
  }

  // Order Summary Component
  const OrderSummary = () => (
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
                <div key={item.product.id} className={`flex items-start gap-2 text-sm p-2 rounded-lg ${item.isOrder ? 'bg-orange-50' : ''}`}>
                  <Package className={`w-4 h-4 flex-shrink-0 mt-0.5 ${item.isOrder ? 'text-orange-500' : 'text-slate-400'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <p className={`font-medium truncate ${item.isOrder ? 'text-orange-700' : 'text-slate-700'}`}>
                        {item.product.name}
                      </p>
                      {item.isOrder && (
                        <span className="inline-flex items-center px-1.5 py-0.5 bg-orange-500 text-white text-[10px] font-medium rounded">
                          Encargo
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      {item.product.size || 'Talla única'} × {item.quantity}
                    </p>
                  </div>
                  <span className={`font-semibold whitespace-nowrap ${item.isOrder ? 'text-orange-600' : 'text-primary'}`}>
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

      {/* Order items notice */}
      {hasOrderItems() && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 mt-4">
          <p className="text-xs text-orange-700">
            <span className="font-semibold">Nota:</span> Tu pedido incluye productos por encargo.
            El tiempo de entrega puede variar según disponibilidad.
          </p>
        </div>
      )}

      {/* Info */}
      <div className="bg-brand-50 rounded-lg p-3 mt-4">
        <p className="text-xs text-brand-800 leading-relaxed">
          <span className="font-semibold">Información importante:</span><br />
          • Los uniformes se entregarán directamente en el colegio<br />
          • Te contactaremos para confirmar tallas y coordinar la entrega<br />
          • El pago se realiza contra entrega
        </p>
      </div>
    </div>
  );

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

        {/* Logged in banner */}
        {mounted && isAuthenticated && authClient && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div>
              <p className="text-green-800 font-semibold">
                Sesión iniciada como {authClient.name}
              </p>
              <p className="text-green-700 text-sm">
                Tu pedido se asociará a tu cuenta automáticamente
              </p>
            </div>
          </div>
        )}

        {/* Step indicator for non-authenticated users */}
        {mounted && !isAuthenticated && (
          <div className="flex items-center justify-center gap-2 mb-8">
            {['email', 'verify', 'details'].map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                  step === s
                    ? 'bg-brand-600 text-white'
                    : ['email', 'verify', 'details'].indexOf(step) > i
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {['email', 'verify', 'details'].indexOf(step) > i ? '✓' : i + 1}
                </div>
                {i < 2 && <div className={`w-8 h-1 ${
                  ['email', 'verify', 'details'].indexOf(step) > i ? 'bg-green-500' : 'bg-gray-200'
                }`} />}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <div className="lg:col-span-2">
            {/* Step 1: Email for non-authenticated */}
            {!isAuthenticated && step === 'email' && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-8 h-8 text-brand-600" />
                  </div>
                  <h2 className="text-xl font-bold text-primary mb-2">
                    Verifica tu correo
                  </h2>
                  <p className="text-slate-600">
                    Te enviaremos un código de verificación para crear tu cuenta
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Nombre completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client_name}
                      onChange={(e) => {
                        setFormData({ ...formData, client_name: e.target.value });
                        setError('');
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                      placeholder="Tu nombre completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Correo electrónico *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.client_email}
                      onChange={(e) => {
                        setFormData({ ...formData, client_email: e.target.value });
                        setError('');
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                      placeholder="tu@email.com"
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleSendCode}
                    disabled={loading || !formData.client_email || !formData.client_name}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      'Enviar código de verificación'
                    )}
                  </button>

                  <div className="text-center pt-4 border-t border-surface-200">
                    <p className="text-sm text-slate-600">
                      ¿Ya tienes cuenta?{' '}
                      <button
                        onClick={() => setShowLoginModal(true)}
                        className="text-brand-600 hover:text-brand-700 font-semibold"
                      >
                        Inicia sesión
                      </button>
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Verify Code */}
            {!isAuthenticated && step === 'verify' && (
              <div className="bg-white rounded-xl border border-surface-200 p-6">
                <div className="text-center mb-6">
                  <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-8 h-8 text-brand-600" />
                  </div>
                  <h2 className="text-xl font-bold text-primary mb-2">
                    Ingresa el código
                  </h2>
                  <p className="text-slate-600">
                    Enviamos un código de 6 dígitos a <span className="font-semibold">{formData.client_email}</span>
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">
                      Código de verificación
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value.replace(/\D/g, ''));
                        setError('');
                      }}
                      className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all text-center text-2xl tracking-widest"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <button
                    onClick={handleVerifyCode}
                    disabled={loading || verificationCode.length !== 6}
                    className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Verificando...
                      </>
                    ) : (
                      'Verificar código'
                    )}
                  </button>

                  <div className="text-center">
                    {resendCooldown > 0 ? (
                      <p className="text-sm text-slate-500">
                        Reenviar código en {resendCooldown}s
                      </p>
                    ) : (
                      <button
                        onClick={handleSendCode}
                        className="text-sm text-brand-600 hover:text-brand-700"
                      >
                        Reenviar código
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setStep('email');
                      setVerificationCode('');
                      setError('');
                    }}
                    className="w-full text-sm text-slate-600 hover:text-slate-800"
                  >
                    Cambiar correo electrónico
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Details form (or single step for authenticated) */}
            {(isAuthenticated || step === 'details') && (
              <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-surface-200 p-6 space-y-6">
                {/* Email verified badge for new users */}
                {!isAuthenticated && emailVerified && (
                  <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
                    <CheckCircle className="w-4 h-4 flex-shrink-0" />
                    <span>Email verificado: <strong>{formData.client_email}</strong></span>
                  </div>
                )}

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
                        disabled={isAuthenticated && !!authClient}
                        className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all disabled:bg-gray-100 disabled:text-gray-500"
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

                    {/* Email field - disabled for verified users */}
                    {!isAuthenticated && (
                      <div>
                        <label className="block text-sm font-semibold text-slate-700 mb-2">
                          Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.client_email}
                          disabled
                          className="w-full px-4 py-3 rounded-xl border border-surface-200 bg-gray-100 text-gray-500 outline-none"
                        />
                      </div>
                    )}

                    {/* Password fields for new users */}
                    {!isAuthenticated && (
                      <>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Contraseña *
                          </label>
                          <div className="relative">
                            <input
                              type={showFormPassword ? 'text' : 'password'}
                              required
                              minLength={8}
                              value={formData.client_password}
                              onChange={(e) => setFormData({ ...formData, client_password: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all pr-12"
                              placeholder="Mínimo 8 caracteres"
                            />
                            <button
                              type="button"
                              onClick={() => setShowFormPassword(!showFormPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showFormPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">
                            Esta será tu contraseña para acceder a tu cuenta
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-semibold text-slate-700 mb-2">
                            Confirmar contraseña *
                          </label>
                          <input
                            type={showFormPassword ? 'text' : 'password'}
                            required
                            minLength={8}
                            value={formData.client_password_confirm}
                            onChange={(e) => setFormData({ ...formData, client_password_confirm: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                            placeholder="Repite tu contraseña"
                          />
                        </div>
                      </>
                    )}
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

                {error && (
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-bold shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    'Confirmar Pedido'
                  )}
                </button>
              </form>
            )}
          </div>

          {/* Summary */}
          <div className="lg:col-span-1">
            <OrderSummary />
          </div>
        </div>
      </main>

      {/* Login Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              onClick={() => {
                setShowLoginModal(false);
                setLoginError('');
                setLoginForm({ email: '', password: '' });
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-brand-600" />
              </div>
              <h2 className="text-2xl font-bold text-primary font-display">
                Iniciar Sesión
              </h2>
              <p className="text-slate-600 mt-2">
                Continúa con tu compra usando tu cuenta
              </p>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                setLoginLoading(true);
                setLoginError('');
                try {
                  const success = await login(loginForm.email, loginForm.password);
                  if (success) {
                    setShowLoginModal(false);
                    setLoginForm({ email: '', password: '' });
                  } else {
                    setLoginError('Credenciales inválidas');
                  }
                } catch {
                  setLoginError('Error al iniciar sesión');
                } finally {
                  setLoginLoading(false);
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Correo electrónico
                </label>
                <input
                  type="email"
                  required
                  value={loginForm.email}
                  onChange={(e) => {
                    setLoginForm({ ...loginForm, email: e.target.value });
                    setLoginError('');
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all"
                  placeholder="tu@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    value={loginForm.password}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, password: e.target.value });
                      setLoginError('');
                    }}
                    className="w-full px-4 py-3 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all pr-12"
                    placeholder="Tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-3 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-colors font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Iniciando...
                  </>
                ) : (
                  'Iniciar Sesión'
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowLoginModal(false);
                  router.push('/recuperar-password');
                }}
                className="w-full text-sm text-brand-600 hover:text-brand-700"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-surface-200 text-center">
              <p className="text-sm text-slate-600">
                ¿No tienes cuenta? Continúa arriba para crear una.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
