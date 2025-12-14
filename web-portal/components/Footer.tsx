'use client';

import Link from 'next/link';
import { Phone, Mail, MessageCircle, HelpCircle, MapPin, Clock, ExternalLink } from 'lucide-react';

// Puntos de venta - fácil de expandir en el futuro
const STORE_LOCATIONS = [
  {
    name: 'Sede Principal - Boston',
    address: 'Calle 56 D #26 BE 04',
    neighborhood: 'Villas de San José, Boston - Barrio Sucre',
    city: 'Medellín, Antioquia',
    googleMapsUrl: 'https://www.google.com/maps/search/?api=1&query=Calle+56D+26BE+04+Villas+de+San+Jose+Boston+Medellin',
    hours: 'Lun-Vie: 8AM-6PM | Sáb: 9AM-2PM'
  }
];

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-white border-t border-surface-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <div>
            <h3 className="text-lg font-bold text-primary font-display mb-3">
              Uniformes Consuelo Rios
            </h3>
            <p className="text-sm text-slate-600">
              Uniformes escolares de calidad, confeccionados con los mejores materiales.
            </p>
          </div>

          {/* Store Locations */}
          <div>
            <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-brand-600" />
              Puntos de Venta
            </h4>
            <div className="space-y-4">
              {STORE_LOCATIONS.map((location, index) => (
                <div key={index} className="text-sm">
                  <p className="font-medium text-slate-700">{location.name}</p>
                  <p className="text-slate-600">{location.address}</p>
                  <p className="text-slate-600">{location.neighborhood}</p>
                  <p className="text-slate-500 text-xs">{location.city}</p>
                  <div className="flex items-center gap-1 text-xs text-slate-500 mt-1">
                    <Clock className="w-3 h-3" />
                    {location.hours}
                  </div>
                  <a
                    href={location.googleMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 mt-2 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver en Google Maps
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-slate-700 mb-3">Contacto</h4>
            <div className="space-y-2 text-sm">
              <a
                href="https://wa.me/573105997451"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-slate-600 hover:text-green-600 transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                +57 310 599 7451
              </a>
              <a
                href="tel:+573105997451"
                className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                Llamar
              </a>
              <a
                href="mailto:uniformesconsuelo@gmail.com"
                className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-colors"
              >
                <Mail className="w-4 h-4" />
                uniformesconsuelo@gmail.com
              </a>
            </div>
          </div>

          {/* Help */}
          <div>
            <h4 className="font-semibold text-slate-700 mb-3">Ayuda</h4>
            <div className="space-y-2 text-sm">
              <Link
                href="/soporte"
                className="flex items-center gap-2 text-slate-600 hover:text-brand-600 transition-colors"
              >
                <HelpCircle className="w-4 h-4" />
                Centro de Soporte
              </Link>
              <p className="text-slate-500 text-xs mt-2">
                Lun - Vie: 8:00 AM - 6:00 PM<br />
                Sábados: 9:00 AM - 2:00 PM
              </p>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-surface-200 pt-6 text-center">
          <p className="text-slate-500 text-sm">
            © {currentYear} Uniformes Consuelo Rios. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
