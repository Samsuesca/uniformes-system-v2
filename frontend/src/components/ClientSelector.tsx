/**
 * ClientSelector - Searchable client selector with quick creation
 *
 * Features:
 * - Real-time search as you type
 * - Fuzzy search with typo tolerance (María = Maria = maria)
 * - Quick client creation inline
 * - Option for "No client" sales
 * - Shows client info (name, phone, student)
 */
import { useState, useEffect, useRef } from 'react';
import { Search, UserPlus, UserX, X, Loader2, User, Phone, Mail, GraduationCap, Check, Pencil, MapPin, Save, ChevronDown, ChevronUp } from 'lucide-react';
import { clientService } from '../services/clientService';
import type { Client } from '../types/api';

// =============================================================================
// Fuzzy Search Utilities
// =============================================================================

/**
 * Normalize text for comparison:
 * - Remove accents (María -> Maria)
 * - Lowercase
 * - Handle common letter substitutions (v/b, s/c/z, etc.)
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    // Remove accents
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    // Common Spanish substitutions
    .replace(/v/g, 'b')  // v -> b (berta = verta)
    .replace(/z/g, 's')  // z -> s (gonzalez = gonsales)
    .replace(/c(?=[ei])/g, 's')  // ce, ci -> se, si (cecilia = sesilia)
    .replace(/qu/g, 'k')  // qu -> k
    .replace(/ll/g, 'y')  // ll -> y
    .replace(/ñ/g, 'n')  // ñ -> n (already handled by NFD but just in case)
    .replace(/[^a-z0-9\s]/g, '') // Remove special chars
    .trim();
}

/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform s1 into s2
 */
function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;

  // Create matrix
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  // Initialize first row and column
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  // Fill matrix
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(
          dp[i - 1][j],     // deletion
          dp[i][j - 1],     // insertion
          dp[i - 1][j - 1]  // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Calculate similarity score between query and text (0-1)
 * Higher is better match
 */
function calculateSimilarity(query: string, text: string): number {
  const normalizedQuery = normalizeText(query);
  const normalizedText = normalizeText(text);

  // Exact match after normalization
  if (normalizedText.includes(normalizedQuery)) {
    return 1;
  }

  // Check if any word starts with query
  const words = normalizedText.split(/\s+/);
  for (const word of words) {
    if (word.startsWith(normalizedQuery)) {
      return 0.95;
    }
  }

  // Calculate Levenshtein-based similarity for each word
  let bestScore = 0;
  for (const word of words) {
    // Only compare if lengths are somewhat similar (avoid comparing "a" with "alejandro")
    if (Math.abs(word.length - normalizedQuery.length) <= Math.max(3, normalizedQuery.length * 0.5)) {
      const distance = levenshteinDistance(normalizedQuery, word);
      const maxLen = Math.max(normalizedQuery.length, word.length);
      const similarity = 1 - (distance / maxLen);

      // Only accept if similarity is above threshold
      if (similarity > 0.6) {
        bestScore = Math.max(bestScore, similarity * 0.9); // Cap at 0.9 for fuzzy matches
      }
    }
  }

  // Also check against full text (for multi-word queries)
  if (normalizedQuery.length >= 3) {
    const fullDistance = levenshteinDistance(normalizedQuery, normalizedText.substring(0, normalizedQuery.length + 3));
    const similarity = 1 - (fullDistance / Math.max(normalizedQuery.length, normalizedText.length));
    if (similarity > 0.7) {
      bestScore = Math.max(bestScore, similarity * 0.85);
    }
  }

  return bestScore;
}

interface ClientWithScore extends Client {
  _searchScore: number;
}

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
  /** If true, email is required when creating a new client (for orders that need email verification) */
  requireEmail?: boolean;
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
  requireEmail = false,
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
    email: '',
    student_name: '',
  });

  // Edit client state
  const [showEditForm, setShowEditForm] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editClientData, setEditClientData] = useState({
    name: '',
    phone: '',
    email: '',
    student_name: '',
    student_grade: '',
    address: '',
    notes: '',
  });

  // Expanded info view
  const [showExpandedInfo, setShowExpandedInfo] = useState(false);

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

  // Filter clients when search query changes (with fuzzy matching)
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    searchTimeoutRef.current = setTimeout(() => {
      if (searchQuery.trim()) {
        const query = searchQuery.trim();

        // Calculate similarity scores for each client
        const scored: ClientWithScore[] = clients.map(client => {
          // Check phone first (exact match only for phone)
          if (client.phone?.includes(query)) {
            return { ...client, _searchScore: 1 };
          }

          // Calculate fuzzy similarity for name and student_name
          const nameScore = calculateSimilarity(query, client.name);
          const studentScore = client.student_name
            ? calculateSimilarity(query, client.student_name)
            : 0;

          return {
            ...client,
            _searchScore: Math.max(nameScore, studentScore)
          };
        });

        // Filter by minimum score threshold and sort by score
        const filtered = scored
          .filter(c => c._searchScore >= 0.5) // Minimum 50% similarity
          .sort((a, b) => b._searchScore - a._searchScore)
          .slice(0, 50);

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
    setShowExpandedInfo(false);
    setShowEditForm(false);
  };

  // Initialize edit form with selected client data
  const handleStartEdit = () => {
    if (selectedClient) {
      setEditClientData({
        name: selectedClient.name || '',
        phone: selectedClient.phone || '',
        email: selectedClient.email || '',
        student_name: selectedClient.student_name || '',
        student_grade: selectedClient.student_grade || '',
        address: selectedClient.address || '',
        notes: selectedClient.notes || '',
      });
      setShowEditForm(true);
      setEditError(null);
    }
  };

  // Save edited client
  const handleSaveEdit = async () => {
    if (!selectedClient || !editClientData.name.trim()) {
      setEditError('El nombre es requerido');
      return;
    }

    // Validate email format if provided
    if (editClientData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editClientData.email.trim())) {
        setEditError('El formato del email no es válido');
        return;
      }
    }

    setEditLoading(true);
    setEditError(null);

    try {
      const updatedClient = await clientService.updateClient(selectedClient.id, {
        name: editClientData.name.trim(),
        phone: editClientData.phone.trim() || null,
        email: editClientData.email.trim() || null,
        student_name: editClientData.student_name.trim() || null,
        student_grade: editClientData.student_grade.trim() || null,
        address: editClientData.address.trim() || null,
        notes: editClientData.notes.trim() || null,
      });

      // Update local state
      setSelectedClient(updatedClient);
      setClients(clients.map(c => c.id === updatedClient.id ? updatedClient : c));
      onChange(updatedClient.id, updatedClient);

      setShowEditForm(false);
    } catch (err: any) {
      console.error('Error updating client:', err);
      setEditError(err.response?.data?.detail || err.message || 'Error al actualizar cliente');
    } finally {
      setEditLoading(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!quickClientData.name.trim()) {
      setQuickCreateError('El nombre es requerido');
      return;
    }

    if (requireEmail && !quickClientData.email.trim()) {
      setQuickCreateError('El email es requerido para recibir notificaciones del encargo');
      return;
    }

    // Validate email format if provided
    if (quickClientData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(quickClientData.email.trim())) {
        setQuickCreateError('El formato del email no es válido');
        return;
      }
    }

    setQuickCreateLoading(true);
    setQuickCreateError(null);

    try {
      const newClient = await clientService.createClient(schoolId, {
        name: quickClientData.name.trim(),
        phone: quickClientData.phone.trim() || undefined,
        email: quickClientData.email.trim() || undefined,
        student_name: quickClientData.student_name.trim() || undefined,
      });

      // Add to clients list and select
      setClients([newClient, ...clients]);
      setSelectedClient(newClient);
      onChange(newClient.id, newClient);

      // Reset form
      setShowQuickCreate(false);
      setQuickClientData({ name: '', phone: '', email: '', student_name: '' });
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
          // Show selected client - expandable card
          <div
            className={`
              w-full border rounded-lg overflow-hidden
              ${disabled ? 'bg-gray-100' : 'bg-white'}
              ${error ? 'border-red-300' : 'border-gray-300'}
            `}
          >
            {/* Main row - clickable to open search */}
            <div
              onClick={() => !disabled && !showEditForm && setIsOpen(true)}
              className={`
                px-3 py-2 flex items-center justify-between
                ${disabled || showEditForm ? 'cursor-default' : 'cursor-pointer hover:bg-gray-50'}
              `}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {value === NO_CLIENT_ID ? (
                  <>
                    <UserX className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <span className="text-gray-500">Sin cliente</span>
                  </>
                ) : selectedClient ? (
                  <>
                    <User className="w-5 h-5 text-blue-500 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{selectedClient.name}</span>
                        {selectedClient.code && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                            #{selectedClient.code}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                        {selectedClient.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {selectedClient.phone}
                          </span>
                        )}
                        {selectedClient.email && (
                          <span className="flex items-center gap-1 truncate">
                            <Mail className="w-3 h-3" />
                            {selectedClient.email}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Action buttons */}
              {!disabled && selectedClient && value !== NO_CLIENT_ID && (
                <div className="flex items-center gap-1 ml-2">
                  {/* Toggle expanded info */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowExpandedInfo(!showExpandedInfo); setShowEditForm(false); }}
                    className="p-1.5 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                    title={showExpandedInfo ? 'Ocultar detalles' : 'Ver detalles'}
                  >
                    {showExpandedInfo ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {/* Edit button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleStartEdit(); setShowExpandedInfo(true); }}
                    className="p-1.5 hover:bg-blue-50 rounded text-gray-400 hover:text-blue-600"
                    title="Editar cliente"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  {/* Clear button */}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleClear(); }}
                    className="p-1.5 hover:bg-red-50 rounded text-gray-400 hover:text-red-500"
                    title="Quitar cliente"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Clear for NO_CLIENT */}
              {!disabled && value === NO_CLIENT_ID && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleClear(); }}
                  className="p-1 hover:bg-gray-100 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              )}
            </div>

            {/* Expanded info section */}
            {showExpandedInfo && selectedClient && !showEditForm && (
              <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-sm">
                <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                  {selectedClient.student_name && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <GraduationCap className="w-4 h-4 text-gray-400" />
                      <span>{selectedClient.student_name}</span>
                      {selectedClient.student_grade && (
                        <span className="text-gray-400">({selectedClient.student_grade})</span>
                      )}
                    </div>
                  )}
                  {selectedClient.address && (
                    <div className="flex items-center gap-2 text-gray-600 col-span-2">
                      <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{selectedClient.address}</span>
                    </div>
                  )}
                  {selectedClient.notes && (
                    <div className="col-span-2 text-gray-500 italic text-xs mt-1 border-t border-gray-200 pt-2">
                      {selectedClient.notes}
                    </div>
                  )}
                  {!selectedClient.student_name && !selectedClient.address && !selectedClient.notes && (
                    <div className="col-span-2 text-gray-400 text-xs">
                      No hay información adicional
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Edit form */}
            {showEditForm && selectedClient && (
              <div className="px-3 py-3 bg-blue-50 border-t border-blue-200">
                <h4 className="font-medium text-sm text-blue-800 mb-3 flex items-center gap-2">
                  <Pencil className="w-4 h-4" />
                  Editar cliente
                </h4>

                {editError && (
                  <div className="mb-3 p-2 bg-red-100 text-red-700 text-sm rounded">
                    {editError}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {/* Name */}
                  <div className="relative col-span-2">
                    <User className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editClientData.name}
                      onChange={(e) => setEditClientData({...editClientData, name: e.target.value})}
                      placeholder="Nombre *"
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Phone */}
                  <div className="relative">
                    <Phone className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="tel"
                      value={editClientData.phone}
                      onChange={(e) => setEditClientData({...editClientData, phone: e.target.value})}
                      placeholder="Teléfono"
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Email */}
                  <div className="relative">
                    <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="email"
                      value={editClientData.email}
                      onChange={(e) => setEditClientData({...editClientData, email: e.target.value})}
                      placeholder="Email"
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Student name */}
                  <div className="relative">
                    <GraduationCap className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editClientData.student_name}
                      onChange={(e) => setEditClientData({...editClientData, student_name: e.target.value})}
                      placeholder="Nombre estudiante"
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Student grade */}
                  <div className="relative">
                    <input
                      type="text"
                      value={editClientData.student_grade}
                      onChange={(e) => setEditClientData({...editClientData, student_grade: e.target.value})}
                      placeholder="Grado (ej: 5A)"
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Address */}
                  <div className="relative col-span-2">
                    <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={editClientData.address}
                      onChange={(e) => setEditClientData({...editClientData, address: e.target.value})}
                      placeholder="Dirección"
                      className="w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <textarea
                      value={editClientData.notes}
                      onChange={(e) => setEditClientData({...editClientData, notes: e.target.value})}
                      placeholder="Notas adicionales..."
                      rows={2}
                      className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    />
                  </div>
                </div>

                <div className="mt-3 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowEditForm(false)}
                    className="px-3 py-1.5 text-sm text-gray-600 hover:bg-white rounded-lg transition"
                    disabled={editLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEdit}
                    disabled={editLoading || !editClientData.name.trim()}
                    className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {editLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Guardar
                  </button>
                </div>
              </div>
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
                  <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={quickClientData.email}
                    onChange={(e) => setQuickClientData({...quickClientData, email: e.target.value})}
                    placeholder={requireEmail ? "Email del cliente *" : "Email (opcional - para portal web)"}
                    className={`w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                      requireEmail ? 'border-blue-300 bg-blue-50' : ''
                    }`}
                  />
                </div>
                {requireEmail && (
                  <p className="text-xs text-blue-600 -mt-1 ml-1">
                    El cliente recibirá notificaciones del encargo
                  </p>
                )}

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
                    setQuickClientData({ name: '', phone: '', email: '', student_name: '' });
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
