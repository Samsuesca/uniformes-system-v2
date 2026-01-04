import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Sale Detail Page - View complete sale information
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import SaleChangeModal from '../components/SaleChangeModal';
import { ArrowLeft, Calendar, User, CreditCard, Package, Printer, AlertCircle, Loader2, RefreshCw, CheckCircle, XCircle, Clock, History } from 'lucide-react';
import { formatDateTimeSpanish } from '../components/DatePicker';
import { saleService } from '../services/saleService';
import { saleChangeService } from '../services/saleChangeService';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import { useSchoolStore } from '../stores/schoolStore';
import { save } from '@tauri-apps/plugin-dialog';
import { writeTextFile } from '@tauri-apps/plugin-fs';
// Print styles
const printStyles = `
  @media print {
    @page {
      margin: 1cm;
      size: letter;
    }

    body {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }

    .print-hidden {
      display: none !important;
    }

    .hidden.print\\:block {
      display: block !important;
    }

    /* Remove shadows and rounded corners for print */
    .rounded-lg, .shadow-sm {
      border-radius: 0 !important;
      box-shadow: none !important;
    }

    /* Clean up table styles for print */
    table {
      page-break-inside: auto;
    }

    tr {
      page-break-inside: avoid;
      page-break-after: auto;
    }

    /* Ensure proper spacing */
    #printable-section {
      padding: 0 !important;
    }
  }
`;
export default function SaleDetail() {
    const { saleId } = useParams();
    const navigate = useNavigate();
    const { currentSchool } = useSchoolStore();
    const [sale, setSale] = useState(null);
    const [items, setItems] = useState([]);
    const [client, setClient] = useState(null);
    const [products, setProducts] = useState(new Map());
    const [changes, setChanges] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isChangeModalOpen, setIsChangeModalOpen] = useState(false);
    const schoolId = currentSchool?.id || '';
    useEffect(() => {
        if (saleId) {
            loadSaleDetail();
        }
    }, [saleId]);
    const loadSaleDetail = async () => {
        try {
            setLoading(true);
            setError(null);
            if (!saleId) {
                setError('ID de venta no válido');
                return;
            }
            // Load sale with items
            const saleData = await saleService.getSaleWithItems(schoolId, saleId);
            setSale(saleData);
            setItems(saleData.items || []);
            // Load client info
            if (saleData.client_id) {
                const clientData = await clientService.getClient(schoolId, saleData.client_id);
                setClient(clientData);
            }
            // Load all products info
            if (saleData.items && saleData.items.length > 0) {
                const allProducts = await productService.getProducts(schoolId);
                const productsMap = new Map();
                allProducts.forEach(p => productsMap.set(p.id, p));
                setProducts(productsMap);
            }
            // Load sale changes
            await loadChanges();
        }
        catch (err) {
            console.error('Error loading sale detail:', err);
            setError(err.response?.data?.detail || 'Error al cargar los detalles de la venta');
        }
        finally {
            setLoading(false);
        }
    };
    const loadChanges = async () => {
        try {
            if (!saleId)
                return;
            const changesData = await saleChangeService.getSaleChanges(schoolId, saleId);
            setChanges(changesData);
        }
        catch (err) {
            console.error('Error loading changes:', err);
            // Don't set error state, just log it - changes are optional
        }
    };
    const formatDate = (dateString) => {
        return formatDateTimeSpanish(dateString);
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };
    const getStatusText = (status) => {
        switch (status) {
            case 'completed':
                return 'Completada';
            case 'pending':
                return 'Pendiente';
            case 'cancelled':
                return 'Cancelada';
            default:
                return status;
        }
    };
    const getPaymentMethodText = (method) => {
        if (!method)
            return 'No especificado';
        switch (method) {
            case 'cash':
                return 'Efectivo';
            case 'card':
                return 'Tarjeta';
            case 'transfer':
                return 'Transferencia';
            case 'credit':
                return 'Crédito';
            default:
                return method;
        }
    };
    const getProductNameFromItem = (item) => {
        // Check if it's a global product
        if (item.is_global_product && item.global_product_name) {
            return `${item.global_product_name} - ${item.global_product_size || ''}`;
        }
        // School product - use item data if available
        if (item.product_name) {
            return `${item.product_name} - ${item.product_size || ''}`;
        }
        // Fallback to products map (legacy) - only if product_id exists
        if (item.product_id) {
            const product = products.get(item.product_id);
            if (product)
                return `${product.name || product.code} - ${product.size}`;
        }
        return 'Producto no encontrado';
    };
    const getProductCodeFromItem = (item) => {
        // Check if it's a global product
        if (item.is_global_product && item.global_product_code) {
            return item.global_product_code;
        }
        // School product - use item data if available
        if (item.product_code) {
            return item.product_code;
        }
        // Fallback to products map (legacy) - only if product_id exists
        if (item.product_id) {
            const product = products.get(item.product_id);
            if (product)
                return product.code;
            return item.product_id;
        }
        return item.global_product_id || 'N/A';
    };
    const getChangeTypeLabel = (type) => {
        switch (type) {
            case 'size_change': return 'Cambio de Talla';
            case 'product_change': return 'Cambio de Producto';
            case 'return': return 'Devolución';
            case 'defect': return 'Producto Defectuoso';
            default: return type;
        }
    };
    const getChangeStatusColor = (status) => {
        switch (status) {
            case 'APPROVED': return 'bg-green-100 text-green-800';
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'REJECTED': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };
    const getChangeStatusIcon = (status) => {
        switch (status) {
            case 'APPROVED': return _jsx(CheckCircle, { className: "w-4 h-4" });
            case 'PENDING': return _jsx(Clock, { className: "w-4 h-4" });
            case 'REJECTED': return _jsx(XCircle, { className: "w-4 h-4" });
            default: return null;
        }
    };
    const handleChangeSuccess = () => {
        loadChanges();
    };
    const handlePrint = async () => {
        console.log('🖨️ Print button clicked - INICIO');
        try {
            console.log('🖨️ Calling handleSaveReceipt...');
            await handleSaveReceipt();
            console.log('🖨️ handleSaveReceipt completed');
        }
        catch (error) {
            console.error('❌ Error in handlePrint:', error);
            console.error('❌ Error stack:', error);
            alert(`Error al guardar el recibo:\n\n${error instanceof Error ? error.message : String(error)}`);
        }
    };
    const handleSaveReceipt = async () => {
        console.log('💾 handleSaveReceipt - INICIO');
        if (!sale) {
            alert('No hay información de venta disponible');
            return;
        }
        try {
            // Generate HTML receipt
            console.log('💾 Generating HTML...');
            const receiptHtml = generateReceiptHTML();
            console.log('💾 HTML generated, length:', receiptHtml.length);
            // Open save dialog
            console.log('💾 Opening save dialog...');
            const filePath = await save({
                defaultPath: `Recibo_${sale.code}.html`,
                filters: [{
                        name: 'HTML',
                        extensions: ['html']
                    }]
            });
            console.log('💾 Dialog closed, filePath:', filePath);
            if (filePath) {
                console.log('💾 Writing file to:', filePath);
                await writeTextFile(filePath, receiptHtml);
                console.log('💾 File written successfully');
                alert(`Recibo guardado en: ${filePath}\n\nPuedes abrirlo en tu navegador e imprimirlo desde ahí.`);
            }
            else {
                console.log('💾 User cancelled save dialog');
            }
        }
        catch (error) {
            console.error('❌ Error saving receipt:', error);
            alert(`Error al guardar el recibo: ${error}`);
        }
    };
    const generateReceiptHTML = () => {
        if (!sale)
            return '';
        return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recibo - ${sale.code}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 20px auto;
      padding: 20px;
      color: #333;
    }
    .header {
      text-align: center;
      border-bottom: 2px solid #333;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .header h1 {
      margin: 0;
      font-size: 32px;
    }
    .info-section {
      margin-bottom: 30px;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin-bottom: 20px;
    }
    .info-item {
      padding: 10px;
      background: #f5f5f5;
      border-radius: 5px;
    }
    .info-label {
      font-size: 12px;
      color: #666;
      margin-bottom: 5px;
    }
    .info-value {
      font-size: 16px;
      font-weight: bold;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 30px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f5f5f5;
      font-weight: bold;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 10px 0;
      font-size: 20px;
      font-weight: bold;
      border-top: 2px solid #333;
    }
    @media print {
      body {
        margin: 0;
        padding: 10px;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Sistema de Uniformes</h1>
    <p>Recibo de Venta</p>
    <h2>${sale.code}</h2>
    <p>${formatDate(sale.sale_date)}</p>
  </div>

  <div class="info-section">
    <div class="info-grid">
      <div class="info-item">
        <div class="info-label">Cliente</div>
        <div class="info-value">${client?.name || 'Sin cliente'}</div>
        ${client?.student_name ? `<div style="font-size: 14px; color: #666;">Estudiante: ${client.student_name}</div>` : ''}
      </div>
      <div class="info-item">
        <div class="info-label">Método de Pago</div>
        <div class="info-value">${getPaymentMethodText(sale.payment_method)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Estado</div>
        <div class="info-value">${getStatusText(sale.status)}</div>
      </div>
      <div class="info-item">
        <div class="info-label">Fecha</div>
        <div class="info-value">${formatDate(sale.sale_date)}</div>
      </div>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Producto</th>
        <th class="text-right">Cantidad</th>
        <th class="text-right">Precio Unit.</th>
        <th class="text-right">Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${getProductCodeFromItem(item)}${item.is_global_product ? ' <span style="background:#f3e8ff;color:#7c3aed;padding:2px 6px;border-radius:4px;font-size:10px;">Global</span>' : ''}</td>
          <td>${getProductNameFromItem(item)}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">$${Number(item.unit_price).toLocaleString()}</td>
          <td class="text-right">$${Number(item.subtotal).toLocaleString()}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="total-row">
      <span>Total:</span>
      <span>$${Number(sale.total).toLocaleString()}</span>
    </div>
  </div>

  ${sale.notes ? `
  <div style="margin-top: 30px; padding: 15px; background: #f5f5f5; border-radius: 5px;">
    <strong>Notas:</strong> ${sale.notes}
  </div>
  ` : ''}
</body>
</html>
    `.trim();
    };
    if (loading) {
        return (_jsx(Layout, { children: _jsxs("div", { className: "flex items-center justify-center py-12", children: [_jsx(Loader2, { className: "w-8 h-8 animate-spin text-blue-600" }), _jsx("span", { className: "ml-3 text-gray-600", children: "Cargando detalles de la venta..." })] }) }));
    }
    if (error || !sale) {
        return (_jsx(Layout, { children: _jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-6", children: _jsxs("div", { className: "flex items-start", children: [_jsx(AlertCircle, { className: "w-6 h-6 text-red-600 mr-3 flex-shrink-0" }), _jsxs("div", { children: [_jsx("h3", { className: "text-sm font-medium text-red-800", children: "Error al cargar la venta" }), _jsx("p", { className: "mt-1 text-sm text-red-700", children: error || 'Venta no encontrada' }), _jsx("button", { onClick: () => navigate('/sales'), className: "mt-3 text-sm text-red-700 hover:text-red-800 underline", children: "Volver a ventas" })] })] }) }) }));
    }
    return (_jsxs(Layout, { children: [_jsx("style", { children: printStyles }), _jsxs("div", { className: "mb-6 print-hidden", children: [_jsxs("button", { onClick: () => navigate('/sales'), className: "flex items-center text-gray-600 hover:text-gray-800 mb-4 transition", children: [_jsx(ArrowLeft, { className: "w-5 h-5 mr-2" }), "Volver a ventas"] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-2xl font-bold text-gray-800", children: "Detalle de Venta" }), _jsx("p", { className: "text-gray-600 mt-1", children: sale.code })] }), _jsxs("div", { className: "flex gap-3", children: [_jsxs("button", { onClick: () => setIsChangeModalOpen(true), className: "bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(RefreshCw, { className: "w-5 h-5 mr-2" }), "Cambio/Devoluci\u00F3n"] }), _jsxs("button", { onClick: handlePrint, className: "bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition", children: [_jsx(Printer, { className: "w-5 h-5 mr-2" }), "Imprimir Recibo"] })] })] })] }), _jsxs("div", { className: "printable-wrapper", children: [_jsxs("div", { id: "printable-section", children: [_jsxs("div", { className: "hidden print:block mb-6 text-center border-b-2 border-gray-300 pb-4", children: [_jsx("h1", { className: "text-3xl font-bold text-gray-900", children: "Sistema de Uniformes" }), _jsx("p", { className: "text-gray-600 mt-1", children: "Recibo de Venta" }), _jsxs("p", { className: "text-sm text-gray-500 mt-2", children: ["Venta #", sale.code] }), _jsx("p", { className: "text-sm text-gray-500", children: formatDate(sale.sale_date) })] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm p-6 mb-6", children: [_jsx("h2", { className: "text-lg font-semibold text-gray-800 mb-4", children: "Informaci\u00F3n de la Venta" }), _jsxs("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [_jsxs("div", { children: [_jsxs("div", { className: "flex items-center text-sm text-gray-500 mb-1", children: [_jsx(Calendar, { className: "w-4 h-4 mr-2" }), "Fecha"] }), _jsx("p", { className: "font-medium text-gray-900", children: formatDate(sale.sale_date) })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center text-sm text-gray-500 mb-1", children: [_jsx(User, { className: "w-4 h-4 mr-2" }), "Cliente"] }), _jsx("p", { className: "font-medium text-gray-900", children: client ? `${client.name} (${client.code})` : 'Cargando...' }), client?.student_name && (_jsxs("p", { className: "text-sm text-gray-600", children: ["Estudiante: ", client.student_name] }))] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center text-sm text-gray-500 mb-1", children: [_jsx(CreditCard, { className: "w-4 h-4 mr-2" }), "M\u00E9todo de Pago"] }), _jsx("p", { className: "font-medium text-gray-900", children: getPaymentMethodText(sale.payment_method) })] }), _jsxs("div", { children: [_jsx("div", { className: "text-sm text-gray-500 mb-1", children: "Estado" }), _jsxs("div", { className: "flex flex-wrap gap-2", children: [_jsx("span", { className: `px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(sale.status)}`, children: getStatusText(sale.status) }), sale.is_historical && (_jsxs("span", { className: "px-3 py-1 inline-flex items-center gap-1 text-sm font-semibold rounded-full bg-amber-100 text-amber-800", children: [_jsx(History, { className: "w-4 h-4" }), "Hist\u00F3rica"] }))] })] })] }), sale.is_historical && (_jsx("div", { className: "mt-4 bg-amber-50 border border-amber-200 rounded-lg p-3", children: _jsxs("div", { className: "flex items-center gap-2 text-amber-800", children: [_jsx(History, { className: "w-5 h-5 flex-shrink-0" }), _jsxs("div", { children: [_jsx("p", { className: "font-medium", children: "Venta Hist\u00F3rica (Migraci\u00F3n)" }), _jsx("p", { className: "text-sm text-amber-700", children: "Esta venta fue registrada como dato hist\u00F3rico y no afect\u00F3 el inventario actual." })] })] }) })), sale.notes && (_jsxs("div", { className: "mt-6 pt-6 border-t border-gray-200", children: [_jsx("p", { className: "text-sm text-gray-500 mb-1", children: "Notas" }), _jsx("p", { className: "text-gray-900", children: sale.notes })] }))] }), _jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden mb-6", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(Package, { className: "w-5 h-5 mr-2" }), "Productos"] }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "C\u00F3digo" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Producto" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cantidad" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Precio Unitario" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Subtotal" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: items.map((item) => (_jsxs("tr", { children: [_jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: [getProductCodeFromItem(item), item.is_global_product && (_jsx("span", { className: "ml-2 px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700", children: "Global" }))] }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-900", children: getProductNameFromItem(item) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: item.quantity }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: ["$", Number(item.unit_price).toLocaleString()] }), _jsxs("td", { className: "px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right", children: ["$", Number(item.subtotal).toLocaleString()] })] }, item.id))) })] }) }), _jsx("div", { className: "bg-gray-50 px-6 py-4", children: _jsx("div", { className: "max-w-xs ml-auto", children: _jsxs("div", { className: "flex justify-between text-xl font-bold pt-2", children: [_jsx("span", { className: "text-gray-900", children: "Total:" }), _jsxs("span", { className: "text-blue-600", children: ["$", Number(sale.total).toLocaleString()] })] }) }) })] })] }), " "] }), " ", changes.length > 0 && (_jsxs("div", { className: "bg-white rounded-lg shadow-sm overflow-hidden mt-6 print-hidden", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("h2", { className: "text-lg font-semibold text-gray-800 flex items-center", children: [_jsx(RefreshCw, { className: "w-5 h-5 mr-2" }), "Historial de Cambios y Devoluciones"] }) }), _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "min-w-full divide-y divide-gray-200", children: [_jsx("thead", { className: "bg-gray-50", children: _jsxs("tr", { children: [_jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Fecha" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Tipo" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cant. Devuelta" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Cant. Nueva" }), _jsx("th", { className: "px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Ajuste Precio" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Estado" }), _jsx("th", { className: "px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider", children: "Motivo" })] }) }), _jsx("tbody", { className: "bg-white divide-y divide-gray-200", children: changes.map((change) => (_jsxs("tr", { children: [_jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: formatDate(change.change_date) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900", children: getChangeTypeLabel(change.change_type) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: change.returned_quantity }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: change.new_quantity }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right", children: _jsxs("span", { className: change.price_adjustment >= 0 ? 'text-green-600' : 'text-red-600', children: ["$", Number(change.price_adjustment).toLocaleString()] }) }), _jsx("td", { className: "px-6 py-4 whitespace-nowrap", children: _jsxs("span", { className: `px-2 py-1 inline-flex items-center gap-1 text-xs font-semibold rounded-full ${getChangeStatusColor(change.status)}`, children: [getChangeStatusIcon(change.status), change.status] }) }), _jsx("td", { className: "px-6 py-4 text-sm text-gray-600", children: change.reason || '-' })] }, change.id))) })] }) })] })), _jsx(SaleChangeModal, { isOpen: isChangeModalOpen, onClose: () => setIsChangeModalOpen(false), onSuccess: handleChangeSuccess, schoolId: schoolId, saleId: saleId, saleItems: items })] }));
}
