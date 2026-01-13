/**
 * ReceiptModal - Professional receipt modal with PDF generation
 *
 * Features:
 * - Print and download PDF options
 * - Letter and thermal (80mm) format toggle
 * - Works for both Sales and Orders
 * - Uses jsPDF for reliable cross-platform PDF generation
 * - Uses Tauri plugins for native file save in desktop app
 */
import { useState } from 'react';
import { X, Printer, Download, Loader2, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { save } from '@tauri-apps/plugin-dialog';
import { writeFile } from '@tauri-apps/plugin-fs';
import type { SaleWithItems, OrderWithItems, Client, SaleItemWithProduct, OrderItem } from '../types/api';

type ReceiptFormat = 'letter' | 'thermal';
type ReceiptType = 'sale' | 'order';

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: ReceiptType;
  sale?: SaleWithItems | null;
  order?: OrderWithItems | null;
  client?: Client | null;
  schoolName?: string;
}

// Format number as Colombian Pesos
const formatCurrency = (amount: number): string => {
  return `$${Math.round(amount).toLocaleString('es-CO')}`;
};

// Format date in Spanish
const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

// Format date short (without time)
const formatDateShort = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-CO', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// Payment method labels
const getPaymentMethodText = (method: string | null | undefined): string => {
  if (!method) return 'No especificado';
  const methods: Record<string, string> = {
    cash: 'Efectivo',
    nequi: 'Nequi',
    transfer: 'Transferencia',
    card: 'Tarjeta',
    credit: 'Credito',
  };
  return methods[method.toLowerCase()] || method;
};

// Order status labels
const getOrderStatusText = (status: string): string => {
  const statuses: Record<string, string> = {
    pending: 'Pendiente',
    in_production: 'En Produccion',
    ready: 'Listo para Entrega',
    delivered: 'Entregado',
    cancelled: 'Cancelado',
  };
  return statuses[status] || status;
};

export default function ReceiptModal({
  isOpen,
  onClose,
  type,
  sale,
  order,
  client,
  schoolName = '',
}: ReceiptModalProps) {
  const [format, setFormat] = useState<ReceiptFormat>('letter');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  // Get receipt data based on type
  const isSale = type === 'sale';
  const receiptCode = isSale ? sale?.code : order?.code;
  const receiptDate = isSale ? sale?.sale_date : order?.created_at;
  const clientName = isSale ? (client?.name || sale?.client_name) : order?.client_name;
  const studentName = isSale ? client?.student_name : order?.student_name;
  const total = isSale ? Number(sale?.total || 0) : Number(order?.total || 0);
  const paidAmount = isSale ? Number(sale?.paid_amount || 0) : Number(order?.paid_amount || 0);
  const balance = total - paidAmount;

  // Get items
  const saleItems = sale?.items || [];
  const orderItems = order?.items || [];

  // Generate PDF using jsPDF (direct drawing, no html2canvas)
  const generatePDF = (): jsPDF => {
    const isThermal = format === 'thermal';
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: isThermal ? [80, 297] : 'letter', // 80mm width for thermal, letter for standard
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const margin = isThermal ? 3 : 15;
    const contentWidth = pageWidth - margin * 2;
    let y = isThermal ? 8 : 20;

    // Helper functions
    const addText = (text: string, x: number, yPos: number, options?: { align?: 'left' | 'center' | 'right'; maxWidth?: number }) => {
      const align = options?.align || 'left';
      const xPos = align === 'center' ? pageWidth / 2 : align === 'right' ? pageWidth - margin : x;
      if (options?.maxWidth) {
        const lines = pdf.splitTextToSize(text, options.maxWidth);
        pdf.text(lines, xPos, yPos, { align });
        return lines.length;
      }
      pdf.text(text, xPos, yPos, { align });
      return 1;
    };

    const drawLine = (yPos: number, style: 'solid' | 'dashed' = 'solid') => {
      if (style === 'dashed') {
        pdf.setLineDashPattern([1, 1], 0);
      }
      pdf.line(margin, yPos, pageWidth - margin, yPos);
      pdf.setLineDashPattern([], 0);
    };

    // ========== HEADER ==========
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isThermal ? 12 : 18);
    addText('CONSUELO RIOS', 0, y, { align: 'center' });
    y += isThermal ? 4 : 6;

    pdf.setFontSize(isThermal ? 8 : 11);
    pdf.setFont('helvetica', 'normal');
    addText('Confeccion y Venta de Uniformes', 0, y, { align: 'center' });
    y += isThermal ? 3 : 5;

    addText('Tel: 3105997451', 0, y, { align: 'center' });
    y += isThermal ? 3 : 5;

    addText('Bogota, Colombia', 0, y, { align: 'center' });
    y += isThermal ? 5 : 8;

    // Separator line
    pdf.setLineWidth(0.3);
    drawLine(y, 'dashed');
    y += isThermal ? 4 : 8;

    // ========== RECEIPT INFO ==========
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isThermal ? 10 : 14);
    const receiptTitle = isSale ? `RECIBO DE VENTA` : `ENCARGO`;
    addText(receiptTitle, 0, y, { align: 'center' });
    y += isThermal ? 4 : 6;

    pdf.setFontSize(isThermal ? 9 : 12);
    addText(`#${receiptCode || 'N/A'}`, 0, y, { align: 'center' });
    y += isThermal ? 5 : 8;

    // Date
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(isThermal ? 8 : 10);
    addText(`Fecha: ${receiptDate ? formatDate(receiptDate) : 'N/A'}`, margin, y);
    y += isThermal ? 4 : 6;

    // Client
    addText(`Cliente: ${clientName || 'Cliente General'}`, margin, y);
    y += isThermal ? 3 : 5;

    if (studentName) {
      addText(`Estudiante: ${studentName}`, margin, y);
      y += isThermal ? 3 : 5;
    }

    // School name if available
    if (schoolName) {
      addText(`Colegio: ${schoolName}`, margin, y);
      y += isThermal ? 3 : 5;
    }

    // Order-specific info
    if (!isSale && order) {
      const deliveryText = order.delivery_type === 'delivery' ? 'Domicilio' : 'Retiro en Tienda';
      addText(`Entrega: ${deliveryText}`, margin, y);
      y += isThermal ? 3 : 5;

      if (order.delivery_type === 'delivery' && order.delivery_address) {
        addText(`Direccion: ${order.delivery_address}`, margin, y);
        y += isThermal ? 3 : 5;
      }

      addText(`Estado: ${getOrderStatusText(order.status)}`, margin, y);
      y += isThermal ? 3 : 5;
    }

    y += isThermal ? 2 : 4;
    drawLine(y, 'dashed');
    y += isThermal ? 4 : 8;

    // ========== ITEMS TABLE ==========
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isThermal ? 8 : 10);

    if (isThermal) {
      // Thermal: compact format
      addText('PRODUCTO', margin, y);
      addText('TOTAL', 0, y, { align: 'right' });
      y += 3;
      drawLine(y);
      y += 3;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(7);

      if (isSale) {
        saleItems.forEach((item: SaleItemWithProduct) => {
          const productName = item.is_global_product
            ? `${item.global_product_name || 'Producto'} ${item.global_product_size || ''}`
            : `${item.product_name || 'Producto'} ${item.product_size || ''}`;
          const qty = item.quantity;
          const subtotal = formatCurrency(Number(item.subtotal));

          addText(`${qty}x ${productName}`, margin, y, { maxWidth: contentWidth * 0.65 });
          addText(subtotal, 0, y, { align: 'right' });
          y += 4;
        });
      } else {
        orderItems.forEach((item: OrderItem) => {
          const productName = `${item.garment_type_name || 'Prenda'} ${item.size || ''}`;
          const qty = item.quantity;
          const subtotal = formatCurrency(Number(item.subtotal));

          addText(`${qty}x ${productName}`, margin, y, { maxWidth: contentWidth * 0.65 });
          addText(subtotal, 0, y, { align: 'right' });
          y += 4;
        });
      }
    } else {
      // Letter: full table format
      const colWidths = [contentWidth * 0.45, contentWidth * 0.15, contentWidth * 0.20, contentWidth * 0.20];
      const colX = [margin, margin + colWidths[0], margin + colWidths[0] + colWidths[1], margin + colWidths[0] + colWidths[1] + colWidths[2]];

      // Table header
      pdf.setFillColor(240, 240, 240);
      pdf.rect(margin, y - 4, contentWidth, 7, 'F');
      pdf.setDrawColor(200, 200, 200);
      pdf.rect(margin, y - 4, contentWidth, 7, 'S');

      addText('Producto', colX[0] + 2, y);
      addText('Cant.', colX[1] + 2, y);
      addText('P. Unit.', colX[2] + 2, y);
      addText('Subtotal', colX[3] + 2, y);
      y += 6;

      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);

      if (isSale) {
        saleItems.forEach((item: SaleItemWithProduct, idx: number) => {
          const productName = item.is_global_product
            ? `${item.global_product_name || 'Producto'} ${item.global_product_size || ''}`
            : `${item.product_name || 'Producto'} ${item.product_size || ''}`;

          // Alternate row background
          if (idx % 2 === 1) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(margin, y - 3, contentWidth, 6, 'F');
          }

          addText(productName.substring(0, 30), colX[0] + 2, y);
          addText(String(item.quantity), colX[1] + 2, y);
          addText(formatCurrency(Number(item.unit_price)), colX[2] + 2, y);
          addText(formatCurrency(Number(item.subtotal)), colX[3] + 2, y);
          y += 6;
        });
      } else {
        orderItems.forEach((item: OrderItem, idx: number) => {
          const productName = `${item.garment_type_name || 'Prenda'} ${item.size || ''}`;

          if (idx % 2 === 1) {
            pdf.setFillColor(248, 248, 248);
            pdf.rect(margin, y - 3, contentWidth, 6, 'F');
          }

          addText(productName.substring(0, 30), colX[0] + 2, y);
          addText(String(item.quantity), colX[1] + 2, y);
          addText(formatCurrency(Number(item.unit_price)), colX[2] + 2, y);
          addText(formatCurrency(Number(item.subtotal)), colX[3] + 2, y);
          y += 6;
        });
      }
    }

    y += isThermal ? 2 : 4;
    drawLine(y, 'dashed');
    y += isThermal ? 4 : 8;

    // ========== TOTALS ==========
    const totalsX = isThermal ? margin : pageWidth - 80;
    const totalsWidth = isThermal ? contentWidth : 65;

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(isThermal ? 8 : 10);

    // Subtotal
    const subtotal = isSale ? Number(sale?.total || 0) : Number(order?.subtotal || 0);
    addText('Subtotal:', totalsX, y);
    addText(formatCurrency(subtotal), totalsX + totalsWidth, y, { align: 'right' });
    y += isThermal ? 4 : 5;

    // Discount (for sales)
    if (isSale && sale?.total && sale?.paid_amount !== undefined) {
      // No discount field in current schema, skip
    }

    // Delivery fee (for orders)
    if (!isSale && order?.delivery_fee && order.delivery_fee > 0) {
      addText('Envio:', totalsX, y);
      addText(formatCurrency(Number(order.delivery_fee)), totalsX + totalsWidth, y, { align: 'right' });
      y += isThermal ? 4 : 5;
    }

    // Total
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(isThermal ? 10 : 12);
    addText('TOTAL:', totalsX, y);
    addText(formatCurrency(total), totalsX + totalsWidth, y, { align: 'right' });
    y += isThermal ? 5 : 7;

    // Paid amount
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(isThermal ? 8 : 10);
    addText('Pagado:', totalsX, y);
    addText(formatCurrency(paidAmount), totalsX + totalsWidth, y, { align: 'right' });
    y += isThermal ? 4 : 5;

    // Balance
    if (balance > 0) {
      pdf.setFont('helvetica', 'bold');
      addText('Saldo:', totalsX, y);
      addText(formatCurrency(balance), totalsX + totalsWidth, y, { align: 'right' });
      y += isThermal ? 4 : 5;
    }

    // Payment method (for sales)
    if (isSale) {
      pdf.setFont('helvetica', 'normal');
      const paymentMethods: string[] = [];
      if (sale?.payment_method) {
        paymentMethods.push(getPaymentMethodText(sale.payment_method));
      } else if (sale?.payments && sale.payments.length > 0) {
        const uniqueMethods = [...new Set(sale.payments.map((p) => p.payment_method))];
        uniqueMethods.forEach((m) => paymentMethods.push(getPaymentMethodText(m)));
      }
      if (paymentMethods.length > 0) {
        addText(`Pago: ${paymentMethods.join(', ')}`, totalsX, y);
        y += isThermal ? 4 : 5;
      }
    }

    y += isThermal ? 3 : 6;
    drawLine(y, 'dashed');
    y += isThermal ? 4 : 8;

    // ========== FOOTER ==========
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(isThermal ? 7 : 9);
    pdf.setTextColor(100, 100, 100);

    if (isSale) {
      addText('Gracias por su compra!', 0, y, { align: 'center' });
      y += isThermal ? 3 : 4;
      addText('Cambios dentro de 8 dias con', 0, y, { align: 'center' });
      y += isThermal ? 3 : 4;
      addText('recibo y producto sin uso.', 0, y, { align: 'center' });
    } else {
      addText('Gracias por su preferencia!', 0, y, { align: 'center' });
      y += isThermal ? 3 : 4;
      addText('Le notificaremos cuando', 0, y, { align: 'center' });
      y += isThermal ? 3 : 4;
      addText('su encargo este listo.', 0, y, { align: 'center' });
    }

    y += isThermal ? 4 : 6;
    pdf.setTextColor(150, 150, 150);
    pdf.setFontSize(isThermal ? 6 : 8);
    addText('www.uniformesconsuelorios.com', 0, y, { align: 'center' });

    return pdf;
  };

  // Handle print - Opens PDF in iframe and triggers print dialog
  const handlePrint = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const pdf = generatePDF();
      // Get PDF as base64 data URL
      const pdfDataUri = pdf.output('datauristring');

      // Create a hidden iframe to load and print the PDF
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'fixed';
      printFrame.style.right = '0';
      printFrame.style.bottom = '0';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = '0';
      printFrame.src = pdfDataUri;

      document.body.appendChild(printFrame);

      // Wait for iframe to load, then print
      printFrame.onload = () => {
        setTimeout(() => {
          try {
            printFrame.contentWindow?.focus();
            printFrame.contentWindow?.print();
          } catch {
            // If print fails, fallback to download
            handleDownload();
          }
          // Clean up iframe after a delay
          setTimeout(() => {
            document.body.removeChild(printFrame);
          }, 1000);
        }, 500);
      };
    } catch (error) {
      console.error('Error printing receipt:', error);
      alert('Error al imprimir. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle download - Uses Tauri native file dialog
  const handleDownload = async () => {
    if (isGenerating) return;
    setIsGenerating(true);

    try {
      const pdf = generatePDF();
      const typePrefix = isSale ? 'Recibo' : 'Encargo';
      const defaultFileName = `${typePrefix}_${receiptCode || 'N-A'}.pdf`;

      // Use Tauri native save dialog
      const filePath = await save({
        defaultPath: defaultFileName,
        filters: [{ name: 'PDF', extensions: ['pdf'] }],
      });

      if (filePath) {
        // Get PDF as ArrayBuffer and write to file
        const pdfArrayBuffer = pdf.output('arraybuffer');
        await writeFile(filePath, new Uint8Array(pdfArrayBuffer));
        alert('PDF guardado exitosamente');
      }
    } catch (error) {
      console.error('Error downloading receipt:', error);
      // Check if user cancelled the dialog
      if (error instanceof Error && error.message?.includes('cancelled')) {
        // User cancelled, do nothing
      } else {
        alert('Error al descargar. Por favor intenta de nuevo.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Calculate items count
  const itemsCount = isSale ? saleItems.length : orderItems.length;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/60 z-50" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-xl z-50 flex flex-col overflow-hidden max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center gap-3 text-white">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">
                {isSale ? 'Recibo de Venta' : 'Recibo de Encargo'}
              </h2>
              <p className="text-sm text-blue-100">#{receiptCode || 'N/A'}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Preview */}
        <div className="flex-1 overflow-auto p-6 bg-gray-50">
          <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
            {/* Receipt preview header */}
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
              <h3 className="text-lg font-bold">CONSUELO RIOS</h3>
              <p className="text-sm text-gray-600">Confeccion y Venta de Uniformes</p>
              <p className="text-sm text-gray-500">Tel: 3105997451</p>
            </div>

            {/* Receipt info */}
            <div className="mb-4">
              <p className="font-bold text-center text-lg">
                {isSale ? 'RECIBO DE VENTA' : 'ENCARGO'} #{receiptCode}
              </p>
              <p className="text-sm text-gray-600 text-center">
                {receiptDate ? formatDateShort(receiptDate) : 'N/A'}
              </p>
            </div>

            {/* Client info */}
            <div className="text-sm mb-4 border-b border-gray-200 pb-3">
              <p><span className="text-gray-500">Cliente:</span> {clientName || 'Cliente General'}</p>
              {studentName && (
                <p><span className="text-gray-500">Estudiante:</span> {studentName}</p>
              )}
              {schoolName && (
                <p><span className="text-gray-500">Colegio:</span> {schoolName}</p>
              )}
              {!isSale && order && (
                <>
                  <p>
                    <span className="text-gray-500">Entrega:</span>{' '}
                    {order.delivery_type === 'delivery' ? 'Domicilio' : 'Retiro en Tienda'}
                  </p>
                  <p>
                    <span className="text-gray-500">Estado:</span>{' '}
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                      {getOrderStatusText(order.status)}
                    </span>
                  </p>
                </>
              )}
            </div>

            {/* Items summary */}
            <div className="mb-4">
              <p className="text-sm text-gray-500 mb-2">{itemsCount} producto(s)</p>
              <div className="space-y-1 max-h-32 overflow-auto">
                {isSale
                  ? saleItems.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="truncate flex-1">
                          {item.quantity}x{' '}
                          {item.is_global_product
                            ? item.global_product_name
                            : item.product_name}
                        </span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(Number(item.subtotal))}
                        </span>
                      </div>
                    ))
                  : orderItems.slice(0, 5).map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <span className="truncate flex-1">
                          {item.quantity}x {item.garment_type_name}
                        </span>
                        <span className="ml-2 font-medium">
                          {formatCurrency(Number(item.subtotal))}
                        </span>
                      </div>
                    ))}
                {itemsCount > 5 && (
                  <p className="text-xs text-gray-400">
                    ... y {itemsCount - 5} mas
                  </p>
                )}
              </div>
            </div>

            {/* Totals */}
            <div className="border-t-2 border-dashed border-gray-300 pt-3">
              <div className="flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(total)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Pagado:</span>
                <span>{formatCurrency(paidAmount)}</span>
              </div>
              {balance > 0 && (
                <div className="flex justify-between text-sm font-medium text-amber-600">
                  <span>Saldo:</span>
                  <span>{formatCurrency(balance)}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Actions */}
        <div className="px-6 py-4 border-t bg-white">
          {/* Format toggle */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-sm text-gray-600">Formato:</span>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setFormat('letter')}
                className={`px-4 py-2 text-sm font-medium transition-colors ${
                  format === 'letter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Carta
              </button>
              <button
                onClick={() => setFormat('thermal')}
                className={`px-4 py-2 text-sm font-medium transition-colors border-l ${
                  format === 'thermal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Termica 80mm
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleDownload}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Download className="w-5 h-5" />
              )}
              Descargar PDF
            </button>
            <button
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Printer className="w-5 h-5" />
              )}
              Imprimir
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
