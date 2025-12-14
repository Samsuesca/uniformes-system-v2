/**
 * ClientSelector - Searchable client selector with quick creation
 *
 * Features:
 * - Real-time search as you type
 * - Quick client creation inline
 * - Option for "No client" sales
 * - Shows client info (name, phone, student)
 */
import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, UserX, X, Loader2, User, Phone, GraduationCap, Check } from 'lucide-react';
import { clientService } from '../services/clientService';
import type { Client } from '../types/api';

// Special value for "No Client" option
export const NO_CLIENT_ID = '__NO_CLIENT__';

interface ClientSelectorProps {
  value: string; // client_id or NO_CLIENT_ID or empty
  onChange: (clientId: string, client?: Client) => void;
  schoolId: string;
  allowNoClient?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  error?: string;
}

export default function ClientSelector({
  value,
  onChange,
  schoolId,
  allowNoClient = true,
  placeholder = 'Buscar cliente...',
  className = '',
  disabled = false,
  error,
}: ClientSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [clients, setClients] = useState<Client[]>([]);
  const [filteredClients, setFilteredClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Quick client creation
  const [showQuickCreate, setShowQuickCreate] = useState(false);
  const [quickCreateLoading, setQuickCreateLoading] = useState(false);
  const [quickCreateError, setQuickCreateError] = useState<string | null>(null);
  const [quickClientData, setQuickClientData] = useState({
    name: '',
    phone: '',
    student_name: '',
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load all clients on mount
  useEffect(() => {
    loadClients();
  }, [schoolId]);

  // Find selected client when value changes
  useEffect(() => {
    if (value && value !== NO_CLIENT_ID) {
      const client = clients.find(c => c.id === value);
      setSelectedClient(client || null);
    } else {
      setSelectedClient(null);
    }
  }, [value, clients]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowQuickCreate(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients when search query changes
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const filtered = clients.filter(client =>
          client.name.toLowerCase().includes(query) ||
          client.phone?.toLowerCase().includes(query) ||
          client.student_name?.toLowerCase().includes(query)
        );
        setFilteredClients(filtered);
      } else {
        setFilteredClients(clients.slice(0, 50)); // Show first 50 by default
      }
    }, 150);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, clients]);

  const loadClients = async () => {
    try {
      setLoading(true);
      const data = await clientService.getClients(schoolId, { limit: 500 });
      setClients(data);
      setFilteredClients(data.slice(0, 50));
    } catch (err) {
      console.error('Error loading clients:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClient(client);
    onChange(client.id, client);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleSelectNoClient = () => {
    setSelectedClient(null);
    onChange(NO_CLIENT_ID);
    setIsOpen(false);
    setSearchQuery('');
  };

  const handleClear = () => {
    setSelectedClient(null);
    onChange('');
    setSearchQuery('');
  };

  const handleQuickCreate = async () => {
    if (!quickClientData.name.trim()) {
      setQuickCreateError('El nombre es requerido');
      return;
    }

    setQuickCreateLoading(true);
    setQuickCreateError(null);

    try {
      const newClient = await clientService.createClient(schoolId, {
        name: quickClientData.name.trim(),
        phone: quickClientData.phone.trim() || undefined,
        student_name: quickClientData.student_name.trim() || undefined,
      });

      // Add to clients list and select
      setClients([newClient, ...clients]);
      setSelectedClient(newClient);
      onChange(newClient.id, newClient);

      // Reset form
      setShowQuickCreate(false);
      setQuickClientData({ name: '', phone: '', student_name: '' });
      setIsOpen(false);
    } catch (err: any) {
      console.error('Error creating client:', err);
      setQuickCreateError(err.response?.data?.detail || 'Error al crear cliente');
    } finally {
      setQuickCreateLoading(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Selected value display / Search input */}
      <div className="relative">
        {!isOpen && (value || selectedClient) ? (
          // Show selected client
          <div
            onClick={() => !disabled && setIsOpen(true)}
            className={`
              w-full px-3 py-2 border rounded-lg flex items-center justify-between
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:border-blue-400'}
              ${error ? 'border-red-300' : 'border-gray-300'}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              {value === NO_CLIENT_ID ? (
                <>
                  <UserX className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-gray-500">Sin cliente</span>
                </>
              ) : selectedClient ? (
                <>
                  <User className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <span className="font-medium text-gray-900 truncate block">{selectedClient.name}</span>
                    {selectedClient.phone && (
                      <span className="text-xs text-gray-500 truncate block">{selectedClient.phone}</span>
                    )}
                  </div>
                </>
              ) : null}
            </div>
            {!disabled && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); handleClear(); }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
        ) : (
          // Search input
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsOpen(true)}
              placeholder={placeholder}
              disabled={disabled}
              className={`
                w-full pl-9 pr-3 py-2 border rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                ${error ? 'border-red-300' : 'border-gray-300'}
              `}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden">
          {/* Quick actions */}
          <div className="p-2 border-b border-gray-100 flex gap-2">
            {allowNoClient && (
              <button
                type="button"
                onClick={handleSelectNoClient}
                className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
              >
                <UserX className="w-4 h-4" />
                Sin cliente
              </button>
            )}
            <button
              type="button"
              onClick={() => setShowQuickCreate(true)}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              <UserPlus className="w-4 h-4" />
              Nuevo cliente
            </button>
          </div>

          {/* Quick create form */}
          {showQuickCreate ? (
            <div className="p-3 border-b border-gray-100 bg-blue-50">
              <h4 className="font-medium text-sm text-blue-800 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4" />
                Crear cliente rápido
              </h4>

              {quickCreateError && (
                <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
                  {quickCreateError}
                </div>
              )}

              <div className="space-y-2">
                <div className="relative">
                  <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={quickClientData.name}
                    onChange={(e) => setQuickClientData({...quickClientData, name: e.target.value})}
                    placeholder="Nombre del cliente *"
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>

                <div className="relative">
                  <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={quickClientData.phone}
                    onChange={(e) => setQuickClientData({...quickClientData, phone: e.target.value})}
                    placeholder="Teléfono (opcional)"
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="relative">
                  <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={quickClientData.student_name}
                    onChange={(e) => setQuickClientData({...quickClientData, student_name: e.target.value})}
                    placeholder="Nombre estudiante (opcional)"
                    className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowQuickCreate(false);
                    setQuickClientData({ name: '', phone: '', student_name: '' });
                    setQuickCreateError(null);
                  }}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleQuickCreate}
                  disabled={quickCreateLoading || !quickClientData.name.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {quickCreateLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4" />
                  )}
                  Crear
                </button>
              </div>
            </div>
          ) : (
            /* Client list */
            <div className="max-h-56 overflow-y-auto">
              {filteredClients.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  {searchQuery ? (
                    <>
                      No se encontraron clientes con "{searchQuery}"
                      <button
                        type="button"
                        onClick={() => setShowQuickCreate(true)}
                        className="block mx-auto mt-2 text-blue-600 hover:underline"
                      >
                        Crear nuevo cliente
                      </button>
                    </>
                  ) : (
                    'No hay clientes registrados'
                  )}
                </div>
              ) : (
                filteredClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClient(client)}
                    className={`
                      w-full px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50 transition text-left
                      ${client.id === value ? 'bg-blue-50' : ''}
                    `}
                  >
                    <User className={`w-5 h-5 mt-0.5 flex-shrink-0 ${client.id === value ? 'text-blue-600' : 'text-gray-400'}`} />
                    <div className="min-w-0 flex-1">
                      <p className={`font-medium truncate ${client.id === value ? 'text-blue-900' : 'text-gray-900'}`}>
                        {client.name}
                      </p>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.student_name && (
                          <span className="flex items-center gap-1 truncate">
                            <GraduationCap className="w-3 h-3" />
                            {client.student_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {client.id === value && (
                      <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-1" />
                    )}
                  </button>
                ))
              )}
            </div>
          )}

          {/* Results count */}
          {!showQuickCreate && filteredClients.length > 0 && (
            <div className="px-3 py-2 border-t border-gray-100 text-xs text-gray-500 text-center">
              {searchQuery ? (
                `${filteredClients.length} resultado${filteredClients.length !== 1 ? 's' : ''}`
              ) : (
                `Mostrando ${filteredClients.length} de ${clients.length} clientes`
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
