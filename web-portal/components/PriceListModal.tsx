'use client';

import { useRef } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { formatNumber } from '@/lib/utils';
import type { Product, School } from '@/lib/api';

interface PriceListModalProps {
  isOpen: boolean;
  onClose: () => void;
  school: School;
  products: Product[];
  globalProducts: Product[];
}

interface PriceTableData {
  name: string;
  prices: { size: string; price: number }[];
}

interface ConsolidatedTableData {
  baseType: string;
  variants: { color: string; prices: { size: string; price: number }[] }[];
}

/**
 * Modal de Lista de Precios imprimible
 * Organiza los productos por tipo de prenda con sus tallas y precios
 */
export default function PriceListModal({
  isOpen,
  onClose,
  school,
  products,
  globalProducts
}: PriceListModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  // Función para ordenar tallas
  const sortSizes = (a: { size: string; price: number }, b: { size: string; price: number }) => {
    const numA = parseInt(a.size);
    const numB = parseInt(b.size);
    if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
    const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL', '3XL'];
    const idxA = sizeOrder.indexOf(a.size.toUpperCase());
    const idxB = sizeOrder.indexOf(b.size.toUpperCase());
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.size.localeCompare(b.size);
  };

  // Detectar el tipo base de un producto (sin color)
  const getBaseType = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes('camiseta') || lower.includes('camisa')) return 'Camiseta';
    if (lower.includes('sudadera') || lower.includes('buzo')) return 'Sudadera';
    if (lower.includes('chompa')) return 'Chompa';
    if (lower.includes('yomber')) return 'Yomber';
    return name;
  };

  // Extraer color del nombre
  const getColor = (name: string): string => {
    const colorMatch = name.match(/\b(Azul|Gris|Amarillo|Morado|Fuxia|Rojo|Verde|Blanco|Negro)\b/i);
    return colorMatch ? colorMatch[1] : '';
  };

  // Agrupar productos por garment_type_id y extraer precios por talla
  const groupProducts = (prods: Product[]): PriceTableData[] => {
    const groups = new Map<string, { name: string; prices: Map<string, number> }>();

    prods.forEach(product => {
      const key = product.garment_type_id;
      const baseName = product.name
        .replace(/\s*-?\s*[Tt]alla\s*\d+\s*$/i, '')
        .replace(/\s*-?\s*T\d+(-T\d+)?\s*$/i, '')
        .replace(/\s+\d+\s*$/, '')
        .trim();

      if (!groups.has(key)) {
        groups.set(key, { name: baseName, prices: new Map() });
      }

      const group = groups.get(key)!;
      const size = product.size || 'Única';
      if (!group.prices.has(size) || group.prices.get(size)! > product.price) {
        group.prices.set(size, product.price);
      }
    });

    return Array.from(groups.values()).map(g => ({
      name: g.name,
      prices: Array.from(g.prices.entries())
        .map(([size, price]) => ({ size, price }))
        .sort(sortSizes)
    }));
  };

  // Agrupar productos consolidando colores del mismo tipo
  const groupProductsConsolidated = (prods: Product[]): ConsolidatedTableData[] => {
    const groups = new Map<string, Map<string, Map<string, number>>>();

    prods.forEach(product => {
      const baseName = product.name
        .replace(/\s*-?\s*[Tt]alla\s*\d+\s*$/i, '')
        .replace(/\s*-?\s*T\d+(-T\d+)?\s*$/i, '')
        .replace(/\s+\d+\s*$/, '')
        .trim();

      const baseType = getBaseType(baseName);
      const color = getColor(baseName) || 'default';
      const size = product.size || 'Única';

      if (!groups.has(baseType)) {
        groups.set(baseType, new Map());
      }
      const typeGroup = groups.get(baseType)!;

      if (!typeGroup.has(color)) {
        typeGroup.set(color, new Map());
      }
      const colorGroup = typeGroup.get(color)!;

      if (!colorGroup.has(size) || colorGroup.get(size)! > product.price) {
        colorGroup.set(size, product.price);
      }
    });

    const result: ConsolidatedTableData[] = [];
    groups.forEach((colorMap, baseType) => {
      const variants = Array.from(colorMap.entries()).map(([color, priceMap]) => ({
        color: color === 'default' ? '' : color,
        prices: Array.from(priceMap.entries())
          .map(([size, price]) => ({ size, price }))
          .sort(sortSizes)
      }));
      result.push({ baseType, variants });
    });

    return result;
  };

  // Separar productos del colegio y globales
  const schoolTables = groupProducts(products);
  const consolidatedTables = groupProductsConsolidated(products);
  const globalTables = groupProducts(globalProducts);

  // Determinar si usar tablas consolidadas (cuando hay múltiples colores del mismo tipo)
  const hasMultipleColors = consolidatedTables.some(t => t.variants.length > 1);

  // Categorizar las tablas del colegio
  const camisetas = schoolTables.filter(t =>
    t.name.toLowerCase().includes('camiseta') || t.name.toLowerCase().includes('camisa')
  );
  const sudaderas = schoolTables.filter(t =>
    t.name.toLowerCase().includes('sudadera') || t.name.toLowerCase().includes('buzo')
  );
  const chompas = schoolTables.filter(t =>
    t.name.toLowerCase().includes('chompa')
  );
  const yomber = schoolTables.filter(t =>
    t.name.toLowerCase().includes('yomber')
  );
  const otros = schoolTables.filter(t =>
    !t.name.toLowerCase().includes('camiseta') &&
    !t.name.toLowerCase().includes('camisa') &&
    !t.name.toLowerCase().includes('sudadera') &&
    !t.name.toLowerCase().includes('buzo') &&
    !t.name.toLowerCase().includes('chompa') &&
    !t.name.toLowerCase().includes('yomber')
  );

  // Tablas consolidadas por tipo
  const consolidatedCamisetas = consolidatedTables.filter(t =>
    t.baseType.toLowerCase().includes('camiseta') || t.baseType.toLowerCase().includes('camisa')
  );
  const consolidatedSudaderas = consolidatedTables.filter(t =>
    t.baseType.toLowerCase().includes('sudadera') || t.baseType.toLowerCase().includes('buzo')
  );
  const consolidatedChompas = consolidatedTables.filter(t =>
    t.baseType.toLowerCase().includes('chompa')
  );
  const consolidatedYomber = consolidatedTables.filter(t =>
    t.baseType.toLowerCase().includes('yomber')
  );
  const consolidatedOtros = consolidatedTables.filter(t =>
    !t.baseType.toLowerCase().includes('camiseta') &&
    !t.baseType.toLowerCase().includes('camisa') &&
    !t.baseType.toLowerCase().includes('sudadera') &&
    !t.baseType.toLowerCase().includes('buzo') &&
    !t.baseType.toLowerCase().includes('chompa') &&
    !t.baseType.toLowerCase().includes('yomber')
  );

  const handlePrint = () => {
    window.print();
  };

  // Componente de tabla de precios
  const PriceTable = ({ data, className = '' }: { data: PriceTableData; className?: string }) => (
    <div className={`border-2 border-gray-800 ${className}`}>
      <div className="bg-gray-100 border-b-2 border-gray-800 px-3 py-2">
        <h3 className="font-bold text-center text-sm uppercase tracking-wide">{data.name}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-400">
            <th className="px-3 py-1 text-left font-semibold">TALLA</th>
            <th className="px-3 py-1 text-right font-semibold">PRECIO</th>
          </tr>
        </thead>
        <tbody>
          {data.prices.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-3 py-1 border-t border-gray-200">{item.size}</td>
              <td className="px-3 py-1 border-t border-gray-200 text-right">
                $ {formatNumber(item.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Componente de tabla consolidada con múltiples colores
  const ConsolidatedTable = ({ data }: { data: ConsolidatedTableData }) => {
    // Si solo hay un color (o ninguno), mostrar tabla simple
    if (data.variants.length === 1 && !data.variants[0].color) {
      return (
        <PriceTable data={{ name: data.baseType, prices: data.variants[0].prices }} />
      );
    }

    // Obtener todas las tallas únicas ordenadas
    const allSizes = new Set<string>();
    data.variants.forEach(v => v.prices.forEach(p => allSizes.add(p.size)));
    const sortedSizes = Array.from(allSizes).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    // Crear mapa de precios por color y talla
    const priceMap = new Map<string, Map<string, number>>();
    data.variants.forEach(v => {
      const colorPrices = new Map<string, number>();
      v.prices.forEach(p => colorPrices.set(p.size, p.price));
      priceMap.set(v.color, colorPrices);
    });

    const colors = data.variants.map(v => v.color).filter(c => c);

    return (
      <div className="border-2 border-gray-800">
        <div className="bg-gray-100 border-b-2 border-gray-800 px-3 py-2">
          <h3 className="font-bold text-center text-sm uppercase tracking-wide">{data.baseType}</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-400 bg-gray-50">
              <th className="px-2 py-1 text-left font-semibold text-xs">TALLA</th>
              {colors.map(color => (
                <th key={color} className="px-2 py-1 text-right font-semibold text-xs">{color.toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedSizes.map((size, idx) => (
              <tr key={size} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                <td className="px-2 py-1 border-t border-gray-200 font-medium">{size}</td>
                {colors.map(color => {
                  const price = priceMap.get(color)?.get(size);
                  return (
                    <td key={color} className="px-2 py-1 border-t border-gray-200 text-right">
                      {price ? `$${formatNumber(price)}` : '-'}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Componente de tabla compacta para productos globales
  const CompactTable = ({ data }: { data: PriceTableData }) => (
    <div className="border-2 border-gray-800">
      <div className="bg-gray-100 border-b-2 border-gray-800 px-2 py-1">
        <h3 className="font-bold text-center text-xs uppercase">{data.name}</h3>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-400">
            <th className="px-2 py-1 text-left font-semibold">TALLA</th>
            <th className="px-2 py-1 text-right font-semibold">PRECIO</th>
          </tr>
        </thead>
        <tbody>
          {data.prices.map((item, idx) => (
            <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              <td className="px-2 py-0.5 border-t border-gray-200">{item.size}</td>
              <td className="px-2 py-0.5 border-t border-gray-200 text-right">
                $ {formatNumber(item.price)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-50 print:hidden"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-4 md:inset-8 lg:inset-12 bg-white rounded-xl z-50 flex flex-col overflow-hidden print:fixed print:inset-0 print:rounded-none">
        {/* Header - No se imprime */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-brand-600 to-brand-700 print:hidden">
          <div className="flex items-center gap-3 text-white">
            <FileText className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Lista de Precios</h2>
              <p className="text-sm text-brand-100">{school.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-white text-brand-700 rounded-lg font-medium hover:bg-brand-50 transition-colors"
            >
              <Printer className="w-5 h-5" />
              Imprimir
            </button>
            <button
              onClick={onClose}
              className="p-2 text-white hover:bg-white/20 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content - Área imprimible */}
        <div
          ref={printRef}
          className="flex-1 overflow-auto p-6 print:p-0 print:overflow-visible"
        >
          {/* Contenido imprimible */}
          <div className="max-w-4xl mx-auto print:max-w-none print:mx-0">
            {/* Encabezado de la lista */}
            <div className="text-center mb-6 pb-4 border-b-4 border-double border-gray-800 print:mb-4 print:pb-2">
              <h1 className="text-2xl font-black uppercase tracking-wide print:text-xl">
                CONSUELO RIOS
              </h1>
              <p className="text-lg font-semibold uppercase print:text-base">
                Confección y Venta de Uniformes
              </p>
              <p className="text-xl font-bold mt-1 print:text-lg">2025</p>
              <p className="text-lg font-semibold uppercase mt-2 print:text-base print:mt-1">
                {school.name}
              </p>
              <p className="text-base mt-1 print:text-sm">
                TELÉFONO: 3105997451
              </p>
            </div>

            {/* Productos del Colegio */}
            {hasMultipleColors ? (
              /* Vista consolidada para colegios con múltiples colores (ej: CONFAMA) */
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-2 print:mb-4">
                {consolidatedCamisetas.map((table, idx) => (
                  <ConsolidatedTable key={`cam-${idx}`} data={table} />
                ))}
                {consolidatedSudaderas.map((table, idx) => (
                  <ConsolidatedTable key={`sud-${idx}`} data={table} />
                ))}
                {consolidatedChompas.map((table, idx) => (
                  <ConsolidatedTable key={`cho-${idx}`} data={table} />
                ))}
                {consolidatedYomber.map((table, idx) => (
                  <ConsolidatedTable key={`yom-${idx}`} data={table} />
                ))}
                {consolidatedOtros.map((table, idx) => (
                  <ConsolidatedTable key={`otr-${idx}`} data={table} />
                ))}
              </div>
            ) : (
              /* Vista normal para colegios sin múltiples colores */
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-2 print:mb-4">
                  {/* Camisetas */}
                  {camisetas.length > 0 && camisetas.map((table, idx) => (
                    <PriceTable key={`cam-${idx}`} data={table} />
                  ))}

                  {/* Sudaderas */}
                  {sudaderas.length > 0 && sudaderas.map((table, idx) => (
                    <PriceTable key={`sud-${idx}`} data={table} />
                  ))}

                  {/* Chompas */}
                  {chompas.length > 0 && chompas.map((table, idx) => (
                    <PriceTable key={`cho-${idx}`} data={table} />
                  ))}
                </div>

                {/* Yomber y Otros productos del colegio */}
                {(yomber.length > 0 || otros.length > 0) && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 print:grid-cols-3 print:gap-2 print:mb-4">
                    {yomber.map((table, idx) => (
                      <PriceTable key={`yom-${idx}`} data={table} />
                    ))}
                    {otros.map((table, idx) => (
                      <PriceTable key={`otr-${idx}`} data={table} />
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Productos Globales */}
            {globalTables.length > 0 && (
              <>
                <div className="border-t-2 border-gray-300 pt-4 mt-4 print:pt-2 print:mt-2">
                  <h2 className="text-center font-bold text-sm uppercase mb-3 text-gray-600 print:text-xs print:mb-2">
                    Productos Adicionales (Disponibles para todos los colegios)
                  </h2>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 print:grid-cols-4 print:gap-2">
                  {globalTables.map((table, idx) => (
                    <CompactTable key={`glob-${idx}`} data={table} />
                  ))}
                </div>
              </>
            )}

            {/* Footer */}
            <div className="mt-6 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500 print:mt-4 print:pt-2">
              <p>* Precios sujetos a cambios sin previo aviso</p>
              <p className="mt-1">www.uniformesconsuelorios.com</p>
            </div>
          </div>
        </div>

        {/* Footer con tips - No se imprime */}
        <div className="px-6 py-3 border-t bg-blue-50 print:hidden">
          <div className="flex items-center gap-3 text-blue-700">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
            <p className="text-sm">
              <strong>Tip:</strong> Puedes agregar productos a tu carrito desde el catálogo y ver el total de tu cotización antes de hacer el pedido.
            </p>
          </div>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }

          .print\\:fixed,
          .print\\:fixed * {
            visibility: visible;
          }

          .print\\:hidden {
            display: none !important;
          }

          @page {
            size: letter;
            margin: 0.5in;
          }
        }
      `}</style>
    </>
  );
}
