'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, School as SchoolIcon, ArrowRight } from 'lucide-react';
import { schoolsApi, type School } from '@/lib/api';

export default function Home() {
  const router = useRouter();
  const [schools, setSchools] = useState<School[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSchools();
  }, []);

  const loadSchools = async () => {
    try {
      const response = await schoolsApi.list();
      setSchools(response.data);
    } catch (error) {
      console.error('Error loading schools:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSchools = schools.filter(school =>
    school.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSchoolSelect = (slug: string) => {
    router.push(`/${slug}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-5xl md:text-6xl font-bold font-display mb-4">
            Uniformes Escolares
          </h1>
          <p className="text-xl md:text-2xl text-blue-100 mb-2">
            Encuentra todo lo necesario para ti
          </p>
          <p className="text-blue-200">
            Calidad y los mejores precios
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-800 font-display mb-3">
            Selecciona tu Colegio
          </h2>
          <p className="text-lg text-gray-600">
            Busca tu institución y explora nuestro catálogo completo
          </p>
        </div>

        {/* Search Bar */}
        <div className="mb-8">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar colegio..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl border border-surface-200 focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all bg-white shadow-sm text-primary placeholder-slate-400"
            />
          </div>
        </div>

        {/* Schools Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-brand-200 border-t-brand-600"></div>
            <p className="mt-4 text-slate-600">Cargando colegios...</p>
          </div>
        ) : filteredSchools.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-surface-200">
            <SchoolIcon className="w-16 h-16 text-slate-300 mx-auto mb-4" />
            <p className="text-slate-600">No se encontraron colegios</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSchools.map((school) => (
              <button
                key={school.id}
                onClick={() => handleSchoolSelect(school.slug)}
                className="group bg-white rounded-2xl border-2 border-gray-200 p-8 hover:shadow-2xl hover:border-blue-400 hover:-translate-y-2 transition-all duration-300 text-left"
              >
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center mx-auto mb-4 group-hover:from-blue-500 group-hover:to-indigo-500 transition-all">
                    <SchoolIcon className="w-10 h-10 text-blue-600 group-hover:text-white transition-colors" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 font-display mb-2">
                    {school.name}
                  </h3>
                  <div className="flex items-center justify-center gap-2 text-blue-600 font-semibold group-hover:gap-3 transition-all">
                    <span>Ver catálogo</span>
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Footer Info */}
        <div className="mt-16 text-center text-gray-500">
          <p className="text-sm">
            ¿No encuentras tu colegio? Contáctanos para más información
          </p>
        </div>
      </main>
    </div>
  );
}
