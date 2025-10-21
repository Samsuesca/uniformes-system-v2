/**
 * Sale Detail Page - View complete sale information
 */
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { ArrowLeft, Calendar, User, CreditCard, Package, Printer, AlertCircle, Loader2 } from 'lucide-react';
import { saleService } from '../services/saleService';
import { clientService } from '../services/clientService';
import { productService } from '../services/productService';
import type { Sale, SaleItem, Client, Product } from '../types/api';
import { DEMO_SCHOOL_ID } from '../config/constants';
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
  const { saleId } = useParams<{ saleId: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<Sale | null>(null);
  const [items, setItems] = useState<SaleItem[]>([]);
  const [client, setClient] = useState<Client | null>(null);
  const [products, setProducts] = useState<Map<string, Product>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const schoolId = DEMO_SCHOOL_ID;

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
        const productsMap = new Map<string, Product>();
        allProducts.forEach(p => productsMap.set(p.id, p));
        setProducts(productsMap);
      }
    } catch (err: any) {
      console.error('Error loading sale detail:', err);
      setError(err.response?.data?.detail || 'Error al cargar los detalles de la venta');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };


  const getStatusColor = (status: string) => {
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

  const getStatusText = (status: string) => {
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

  const getPaymentMethodText = (method: string | null) => {
    if (!method) return 'No especificado';
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

  const getProductName = (productId: string) => {
    const product = products.get(productId);
    if (!product) return 'Producto no encontrado';
    return `${product.name || product.code} - ${product.size}`;
  };

  const getProductCode = (productId: string) => {
    const product = products.get(productId);
    return product?.code || productId;
  };

  const handlePrint = async () => {
    console.log('🖨️ Print button clicked - INICIO');
    alert('Botón presionado - iniciando guardado de recibo...');

    try {
      console.log('🖨️ Calling handleSaveReceipt...');
      await handleSaveReceipt();
      console.log('🖨️ handleSaveReceipt completed');
    } catch (error) {
      console.error('❌ Error in handlePrint:', error);
      alert(`Error al intentar guardar: ${error}`);
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
      } else {
        console.log('💾 User cancelled save dialog');
      }
    } catch (error) {
      console.error('❌ Error saving receipt:', error);
      alert(`Error al guardar el recibo: ${error}`);
    }
  };

  const generateReceiptHTML = (): string => {
    if (!sale) return '';

    const subtotal = items.reduce((sum, item) => sum + Number(item.subtotal), 0);

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
          <td>${getProductCode(item.product_id)}</td>
          <td>${getProductName(item.product_id)}</td>
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
    return (
      <Layout>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <span className="ml-3 text-gray-600">Cargando detalles de la venta...</span>
        </div>
      </Layout>
    );
  }

  if (error || !sale) {
    return (
      <Layout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-start">
            <AlertCircle className="w-6 h-6 text-red-600 mr-3 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-medium text-red-800">Error al cargar la venta</h3>
              <p className="mt-1 text-sm text-red-700">{error || 'Venta no encontrada'}</p>
              <button
                onClick={() => navigate('/sales')}
                className="mt-3 text-sm text-red-700 hover:text-red-800 underline"
              >
                Volver a ventas
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <style>{printStyles}</style>

      <div className="mb-6 print-hidden">
        <button
          onClick={() => navigate('/sales')}
          className="flex items-center text-gray-600 hover:text-gray-800 mb-4 transition"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Volver a ventas
        </button>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Detalle de Venta</h1>
            <p className="text-gray-600 mt-1">{sale.code}</p>
          </div>
          <button
            onClick={handlePrint}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition"
          >
            <Printer className="w-5 h-5 mr-2" />
            Imprimir Recibo
          </button>
        </div>
      </div>

      <div className="printable-wrapper">
      <div id="printable-section">

      {/* Print Header - Only visible when printing */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-gray-300 pb-4">
        <h1 className="text-3xl font-bold text-gray-900">Sistema de Uniformes</h1>
        <p className="text-gray-600 mt-1">Recibo de Venta</p>
        <p className="text-sm text-gray-500 mt-2">Venta #{sale.code}</p>
        <p className="text-sm text-gray-500">{formatDate(sale.sale_date)}</p>
      </div>

      {/* Sale Information */}
      <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Información de la Venta</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Date */}
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <Calendar className="w-4 h-4 mr-2" />
              Fecha
            </div>
            <p className="font-medium text-gray-900">{formatDate(sale.sale_date)}</p>
          </div>

          {/* Client */}
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <User className="w-4 h-4 mr-2" />
              Cliente
            </div>
            <p className="font-medium text-gray-900">
              {client ? `${client.name} (${client.code})` : 'Cargando...'}
            </p>
            {client?.student_name && (
              <p className="text-sm text-gray-600">Estudiante: {client.student_name}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <div className="flex items-center text-sm text-gray-500 mb-1">
              <CreditCard className="w-4 h-4 mr-2" />
              Método de Pago
            </div>
            <p className="font-medium text-gray-900">{getPaymentMethodText(sale.payment_method)}</p>
          </div>

          {/* Status */}
          <div>
            <div className="text-sm text-gray-500 mb-1">Estado</div>
            <span className={`px-3 py-1 inline-flex text-sm font-semibold rounded-full ${getStatusColor(sale.status)}`}>
              {getStatusText(sale.status)}
            </span>
          </div>
        </div>

        {/* Notes */}
        {sale.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500 mb-1">Notas</p>
            <p className="text-gray-900">{sale.notes}</p>
          </div>
        )}
      </div>

      {/* Sale Items */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Productos
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Código
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Producto
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Precio Unitario
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Subtotal
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getProductCode(item.product_id)}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getProductName(item.product_id)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    {item.quantity}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                    ${Number(item.unit_price).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">
                    ${Number(item.subtotal).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="bg-gray-50 px-6 py-4">
          <div className="max-w-xs ml-auto">
            <div className="flex justify-between text-xl font-bold pt-2">
              <span className="text-gray-900">Total:</span>
              <span className="text-blue-600">${Number(sale.total).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      </div> {/* End printable-section */}
      </div> {/* End printable-wrapper */}
    </Layout>
  );
}
