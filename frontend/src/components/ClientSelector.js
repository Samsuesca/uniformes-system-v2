import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
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
import { Search, UserPlus, UserX, X, Loader2, User, Phone, Mail, GraduationCap, Check } from 'lucide-react';
import { clientService } from '../services/clientService';
// =============================================================================
// Fuzzy Search Utilities
// =============================================================================
/**
 * Normalize text for comparison:
 * - Remove accents (María -> Maria)
 * - Lowercase
 * - Handle common letter substitutions (v/b, s/c/z, etc.)
 */
function normalizeText(text) {
    return text
        .toLowerCase()
        // Remove accents
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        // Common Spanish substitutions
        .replace(/v/g, 'b') // v -> b (berta = verta)
        .replace(/z/g, 's') // z -> s (gonzalez = gonsales)
        .replace(/c(?=[ei])/g, 's') // ce, ci -> se, si (cecilia = sesilia)
        .replace(/qu/g, 'k') // qu -> k
        .replace(/ll/g, 'y') // ll -> y
        .replace(/ñ/g, 'n') // ñ -> n (already handled by NFD but just in case)
        .replace(/[^a-z0-9\s]/g, '') // Remove special chars
        .trim();
}
/**
 * Calculate Levenshtein distance between two strings
 * Returns the minimum number of edits needed to transform s1 into s2
 */
function levenshteinDistance(s1, s2) {
    const m = s1.length;
    const n = s2.length;
    // Create matrix
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
    // Initialize first row and column
    for (let i = 0; i <= m; i++)
        dp[i][0] = i;
    for (let j = 0; j <= n; j++)
        dp[0][j] = j;
    // Fill matrix
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            }
            else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], // deletion
                dp[i][j - 1], // insertion
                dp[i - 1][j - 1] // substitution
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
function calculateSimilarity(query, text) {
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
// Special value for "No Client" option
export const NO_CLIENT_ID = '__NO_CLIENT__';
export default function ClientSelector({ value, onChange, schoolId, allowNoClient = true, placeholder = 'Buscar cliente...', className = '', disabled = false, error, }) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [clients, setClients] = useState([]);
    const [filteredClients, setFilteredClients] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedClient, setSelectedClient] = useState(null);
    // Quick client creation
    const [showQuickCreate, setShowQuickCreate] = useState(false);
    const [quickCreateLoading, setQuickCreateLoading] = useState(false);
    const [quickCreateError, setQuickCreateError] = useState(null);
    const [quickClientData, setQuickClientData] = useState({
        name: '',
        phone: '',
        email: '',
        student_name: '',
    });
    const containerRef = useRef(null);
    const inputRef = useRef(null);
    const searchTimeoutRef = useRef(null);
    // Load all clients on mount
    useEffect(() => {
        loadClients();
    }, [schoolId]);
    // Find selected client when value changes
    useEffect(() => {
        if (value && value !== NO_CLIENT_ID) {
            const client = clients.find(c => c.id === value);
            setSelectedClient(client || null);
        }
        else {
            setSelectedClient(null);
        }
    }, [value, clients]);
    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
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
                const scored = clients.map(client => {
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
            }
            else {
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
        }
        catch (err) {
            console.error('Error loading clients:', err);
        }
        finally {
            setLoading(false);
        }
    };
    const handleSelectClient = (client) => {
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
        }
        catch (err) {
            console.error('Error creating client:', err);
            setQuickCreateError(err.response?.data?.detail || 'Error al crear cliente');
        }
        finally {
            setQuickCreateLoading(false);
        }
    };
    return (_jsxs("div", { ref: containerRef, className: `relative ${className}`, children: [_jsx("div", { className: "relative", children: !isOpen && (value || selectedClient) ? (
                // Show selected client
                _jsxs("div", { onClick: () => !disabled && setIsOpen(true), className: `
              w-full px-3 py-2 border rounded-lg flex items-center justify-between
              ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white cursor-pointer hover:border-blue-400'}
              ${error ? 'border-red-300' : 'border-gray-300'}
            `, children: [_jsx("div", { className: "flex items-center gap-2 min-w-0", children: value === NO_CLIENT_ID ? (_jsxs(_Fragment, { children: [_jsx(UserX, { className: "w-4 h-4 text-gray-400 flex-shrink-0" }), _jsx("span", { className: "text-gray-500", children: "Sin cliente" })] })) : selectedClient ? (_jsxs(_Fragment, { children: [_jsx(User, { className: "w-4 h-4 text-blue-500 flex-shrink-0" }), _jsxs("div", { className: "min-w-0", children: [_jsx("span", { className: "font-medium text-gray-900 truncate block", children: selectedClient.name }), selectedClient.phone && (_jsx("span", { className: "text-xs text-gray-500 truncate block", children: selectedClient.phone }))] })] })) : null }), !disabled && (_jsx("button", { type: "button", onClick: (e) => { e.stopPropagation(); handleClear(); }, className: "p-1 hover:bg-gray-100 rounded", children: _jsx(X, { className: "w-4 h-4 text-gray-400" }) }))] })) : (
                // Search input
                _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { ref: inputRef, type: "text", value: searchQuery, onChange: (e) => setSearchQuery(e.target.value), onFocus: () => setIsOpen(true), placeholder: placeholder, disabled: disabled, className: `
                w-full pl-9 pr-3 py-2 border rounded-lg
                focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
                ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
                ${error ? 'border-red-300' : 'border-gray-300'}
              ` }), loading && (_jsx(Loader2, { className: "absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" }))] })) }), error && (_jsx("p", { className: "mt-1 text-sm text-red-600", children: error })), isOpen && !disabled && (_jsxs("div", { className: "absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-hidden", children: [_jsxs("div", { className: "p-2 border-b border-gray-100 flex gap-2", children: [allowNoClient && (_jsxs("button", { type: "button", onClick: handleSelectNoClient, className: "flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition", children: [_jsx(UserX, { className: "w-4 h-4" }), "Sin cliente"] })), _jsxs("button", { type: "button", onClick: () => setShowQuickCreate(true), className: "flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition", children: [_jsx(UserPlus, { className: "w-4 h-4" }), "Nuevo cliente"] })] }), showQuickCreate ? (_jsxs("div", { className: "p-3 border-b border-gray-100 bg-blue-50", children: [_jsxs("h4", { className: "font-medium text-sm text-blue-800 mb-3 flex items-center gap-2", children: [_jsx(UserPlus, { className: "w-4 h-4" }), "Crear cliente r\u00E1pido"] }), quickCreateError && (_jsx("div", { className: "mb-3 p-2 bg-red-100 text-red-700 text-sm rounded", children: quickCreateError })), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "relative", children: [_jsx(User, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", value: quickClientData.name, onChange: (e) => setQuickClientData({ ...quickClientData, name: e.target.value }), placeholder: "Nombre del cliente *", className: "w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", autoFocus: true })] }), _jsxs("div", { className: "relative", children: [_jsx(Phone, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "tel", value: quickClientData.phone, onChange: (e) => setQuickClientData({ ...quickClientData, phone: e.target.value }), placeholder: "Tel\u00E9fono (opcional)", className: "w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { className: "relative", children: [_jsx(Mail, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "email", value: quickClientData.email, onChange: (e) => setQuickClientData({ ...quickClientData, email: e.target.value }), placeholder: "Email (opcional - para portal web)", className: "w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { className: "relative", children: [_jsx(GraduationCap, { className: "absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" }), _jsx("input", { type: "text", value: quickClientData.student_name, onChange: (e) => setQuickClientData({ ...quickClientData, student_name: e.target.value }), placeholder: "Nombre estudiante (opcional)", className: "w-full pl-8 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] })] }), _jsxs("div", { className: "mt-3 flex justify-end gap-2", children: [_jsx("button", { type: "button", onClick: () => {
                                            setShowQuickCreate(false);
                                            setQuickClientData({ name: '', phone: '', email: '', student_name: '' });
                                            setQuickCreateError(null);
                                        }, className: "px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition", children: "Cancelar" }), _jsxs("button", { type: "button", onClick: handleQuickCreate, disabled: quickCreateLoading || !quickClientData.name.trim(), className: "px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1", children: [quickCreateLoading ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : (_jsx(Check, { className: "w-4 h-4" })), "Crear"] })] })] })) : (
                    /* Client list */
                    _jsx("div", { className: "max-h-56 overflow-y-auto", children: filteredClients.length === 0 ? (_jsx("div", { className: "p-4 text-center text-gray-500 text-sm", children: searchQuery ? (_jsxs(_Fragment, { children: ["No se encontraron clientes con \"", searchQuery, "\"", _jsx("button", { type: "button", onClick: () => setShowQuickCreate(true), className: "block mx-auto mt-2 text-blue-600 hover:underline", children: "Crear nuevo cliente" })] })) : ('No hay clientes registrados') })) : (filteredClients.map((client) => (_jsxs("button", { type: "button", onClick: () => handleSelectClient(client), className: `
                      w-full px-3 py-2.5 flex items-start gap-3 hover:bg-gray-50 transition text-left
                      ${client.id === value ? 'bg-blue-50' : ''}
                    `, children: [_jsx(User, { className: `w-5 h-5 mt-0.5 flex-shrink-0 ${client.id === value ? 'text-blue-600' : 'text-gray-400'}` }), _jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("p", { className: `font-medium truncate ${client.id === value ? 'text-blue-900' : 'text-gray-900'}`, children: client.name }), _jsxs("div", { className: "flex items-center gap-3 text-xs text-gray-500 mt-0.5", children: [client.phone && (_jsxs("span", { className: "flex items-center gap-1", children: [_jsx(Phone, { className: "w-3 h-3" }), client.phone] })), client.student_name && (_jsxs("span", { className: "flex items-center gap-1 truncate", children: [_jsx(GraduationCap, { className: "w-3 h-3" }), client.student_name] }))] })] }), client.id === value && (_jsx(Check, { className: "w-4 h-4 text-blue-600 flex-shrink-0 mt-1" }))] }, client.id)))) })), !showQuickCreate && filteredClients.length > 0 && (_jsx("div", { className: "px-3 py-2 border-t border-gray-100 text-xs text-gray-500 text-center", children: searchQuery ? (`${filteredClients.length} resultado${filteredClients.length !== 1 ? 's' : ''}`) : (`Mostrando ${filteredClients.length} de ${clients.length} clientes`) }))] }))] }));
}
