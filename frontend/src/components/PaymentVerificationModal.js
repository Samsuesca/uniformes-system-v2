import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Payment Verification Modal
 *
 * Admin modal to view payment proofs uploaded by customers
 * and approve or reject payments for orders.
 */
import { useState } from 'react';
import { X, XCircle, Image as ImageIcon, FileText, Loader2, AlertCircle, CheckCircle } from 'lucide-react';
export default function PaymentVerificationModal({ isOpen, onClose, order, onApprove, onReject }) {
    const [processing, setProcessing] = useState(false);
    const [error, setError] = useState(null);
    const [rejectionNotes, setRejectionNotes] = useState('');
    const [showRejectForm, setShowRejectForm] = useState(false);
    if (!isOpen)
        return null;
    const handleApprove = async () => {
        if (!confirm('¿Aprobar el pago de este pedido?')) {
            return;
        }
        try {
            setProcessing(true);
            setError(null);
            await onApprove(order.id);
            onClose();
        }
        catch (err) {
            console.error('Error approving payment:', err);
            setError(err.response?.data?.detail || 'Error al aprobar pago');
        }
        finally {
            setProcessing(false);
        }
    };
    const handleReject = async () => {
        if (!rejectionNotes.trim()) {
            setError('Debes proporcionar un motivo de rechazo');
            return;
        }
        if (!confirm('¿Rechazar el comprobante de pago?')) {
            return;
        }
        try {
            setProcessing(true);
            setError(null);
            await onReject(order.id, rejectionNotes);
            onClose();
        }
        catch (err) {
            console.error('Error rejecting payment:', err);
            setError(err.response?.data?.detail || 'Error al rechazar pago');
        }
        finally {
            setProcessing(false);
        }
    };
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount);
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4", children: _jsxs("div", { className: "bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col", children: [_jsxs("div", { className: "bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold", children: "Verificar Comprobante de Pago" }), _jsxs("p", { className: "text-blue-100 text-sm", children: ["Pedido #", order.code] })] }), _jsx("button", { onClick: onClose, className: "text-white hover:bg-blue-800 rounded-lg p-2 transition", children: _jsx(X, { className: "w-5 h-5" }) })] }), _jsxs("div", { className: "flex-1 overflow-y-auto p-6", children: [_jsx("div", { className: "bg-gray-50 rounded-lg p-4 mb-6", children: _jsxs("div", { className: "grid grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Cliente" }), _jsx("p", { className: "font-semibold text-gray-900", children: order.client_name })] }), _jsxs("div", { children: [_jsx("p", { className: "text-sm text-gray-500", children: "Monto Total" }), _jsx("p", { className: "font-semibold text-gray-900 text-lg text-green-600", children: formatCurrency(order.total_amount) })] })] }) }), order.payment_proof_url ? (_jsxs("div", { className: "mb-6", children: [_jsxs("h3", { className: "font-semibold text-gray-900 mb-3 flex items-center gap-2", children: [_jsx(ImageIcon, { className: "w-5 h-5" }), "Comprobante de Pago"] }), _jsx("div", { className: "border-2 border-gray-200 rounded-lg overflow-hidden", children: _jsx("img", { src: order.payment_proof_url, alt: "Comprobante de pago", className: "w-full max-h-96 object-contain bg-gray-100", onError: (e) => {
                                            e.currentTarget.style.display = 'none';
                                            const container = e.currentTarget.parentElement;
                                            if (container) {
                                                container.innerHTML = `
                        <div class="flex flex-col items-center justify-center p-12 bg-gray-50">
                          <p class="text-gray-500">No se pudo cargar la imagen</p>
                          <a href="${order.payment_proof_url}" target="_blank" class="text-blue-600 hover:underline mt-2">
                            Abrir en nueva pestaña
                          </a>
                        </div>
                      `;
                                            }
                                        } }) }), _jsx("a", { href: order.payment_proof_url, target: "_blank", rel: "noopener noreferrer", className: "text-sm text-blue-600 hover:text-blue-700 mt-2 inline-block", children: "Abrir imagen en tama\u00F1o completo \u2192" })] })) : (_jsxs("div", { className: "mb-6 text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300", children: [_jsx(FileText, { className: "w-12 h-12 mx-auto text-gray-300 mb-2" }), _jsx("p", { className: "text-gray-500", children: "No hay comprobante adjunto" })] })), order.payment_notes && (_jsxs("div", { className: "mb-6", children: [_jsx("h3", { className: "font-semibold text-gray-900 mb-2", children: "Notas del Cliente" }), _jsx("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-3", children: _jsx("p", { className: "text-gray-700", children: order.payment_notes }) })] })), error && (_jsxs("div", { className: "mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2", children: [_jsx(AlertCircle, { className: "w-5 h-5" }), error] })), showRejectForm && (_jsxs("div", { className: "mb-6 bg-red-50 border-2 border-red-200 rounded-lg p-4", children: [_jsx("h3", { className: "font-semibold text-red-900 mb-3", children: "Motivo del Rechazo" }), _jsx("textarea", { value: rejectionNotes, onChange: (e) => setRejectionNotes(e.target.value), rows: 4, placeholder: "Explica por qu\u00E9 se rechaza el comprobante...", className: "w-full px-3 py-2 border border-red-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500" }), _jsxs("div", { className: "flex gap-2 mt-3", children: [_jsx("button", { onClick: handleReject, disabled: processing || !rejectionNotes.trim(), className: "flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed", children: processing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Rechazando..."] })) : (_jsxs(_Fragment, { children: [_jsx(XCircle, { className: "w-4 h-4" }), "Confirmar Rechazo"] })) }), _jsx("button", { onClick: () => {
                                                setShowRejectForm(false);
                                                setRejectionNotes('');
                                                setError(null);
                                            }, disabled: processing, className: "px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition", children: "Cancelar" })] })] }))] }), !showRejectForm && (_jsxs("div", { className: "border-t border-gray-200 px-6 py-4 bg-gray-50 flex items-center justify-between", children: [_jsx("button", { onClick: onClose, disabled: processing, className: "px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium transition", children: "Cerrar" }), order.payment_proof_url && (_jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: () => setShowRejectForm(true), disabled: processing, className: "flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed", children: [_jsx(XCircle, { className: "w-4 h-4" }), "Rechazar"] }), _jsx("button", { onClick: handleApprove, disabled: processing, className: "flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed", children: processing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin" }), "Procesando..."] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { className: "w-4 h-4" }), "Aprobar Pago"] })) })] }))] }))] }) }));
}
