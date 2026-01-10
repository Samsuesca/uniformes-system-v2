'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  School,
  Users,
  Package,
  CreditCard,
  Truck,
  TrendingUp,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react';
import schoolService from '@/lib/services/schoolService';
import userService from '@/lib/services/userService';

interface Stats {
  totalSchools: number;
  activeSchools: number;
  totalUsers: number;
  superusers: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats>({
    totalSchools: 0,
    activeSchools: 0,
    totalUsers: 0,
    superusers: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const [schools, users] = await Promise.all([
        schoolService.list({ include_inactive: true }),
        userService.list({ include_inactive: true }),
      ]);

      setStats({
        totalSchools: schools.length,
        activeSchools: schools.filter((s) => s.is_active).length,
        totalUsers: users.length,
        superusers: users.filter((u) => u.is_superuser).length,
      });
    } catch (err: any) {
      setError(err.message || 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const statCards = [
    {
      label: 'Colegios Activos',
      value: stats.activeSchools,
      total: stats.totalSchools,
      icon: School,
      color: 'bg-blue-500',
      href: '/schools',
    },
    {
      label: 'Usuarios',
      value: stats.totalUsers,
      subtitle: `${stats.superusers} superusuarios`,
      icon: Users,
      color: 'bg-green-500',
      href: '/users',
    },
  ];

  const quickLinks = [
    { label: 'Colegios', icon: School, href: '/schools', color: 'text-blue-600 bg-blue-100' },
    { label: 'Usuarios', icon: Users, href: '/users', color: 'text-green-600 bg-green-100' },
    { label: 'Cuentas de Pago', icon: CreditCard, href: '/payment-accounts', color: 'text-purple-600 bg-purple-100' },
    { label: 'Zonas de Entrega', icon: Truck, href: '/delivery-zones', color: 'text-orange-600 bg-orange-100' },
    { label: 'Productos', icon: Package, href: '/products', color: 'text-pink-600 bg-pink-100' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 font-display">
            Dashboard
          </h1>
          <p className="text-slate-600 mt-1">
            Bienvenido al panel de administración
          </p>
        </div>
        <button
          onClick={loadStats}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Actualizar
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.label}
              href={card.href}
              className="bg-white rounded-xl border border-slate-200 p-6 hover:shadow-lg hover:border-slate-300 transition-all"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-slate-600">{card.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {loading ? '...' : card.value}
                  </p>
                  {card.total && !loading && (
                    <p className="text-sm text-slate-500 mt-1">
                      de {card.total} totales
                    </p>
                  )}
                  {card.subtitle && !loading && (
                    <p className="text-sm text-slate-500 mt-1">{card.subtitle}</p>
                  )}
                </div>
                <div className={`p-3 rounded-lg ${card.color}`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Quick Links */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Accesos Rápidos
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Link
                key={link.href}
                href={link.href}
                className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-slate-50 transition-colors group"
              >
                <div className={`p-4 rounded-xl ${link.color} group-hover:scale-110 transition-transform`}>
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-sm font-medium text-slate-700">
                  {link.label}
                </span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Recent Activity Placeholder */}
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700">API Backend</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">Conectado</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-slate-700">Portal Web</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">uniformesconsuelorios.com</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span className="text-sm font-medium text-slate-700">Admin Portal</span>
            </div>
            <p className="text-xs text-slate-500 mt-2">v1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  );
}
