/**
 * Contact Service
 *
 * API client for PQRS (Peticiones, Quejas, Reclamos, Sugerencias) system.
 * Handles contact messages from web portal and admin responses.
 */
import apiClient from '../utils/api-client';
class ContactService {
    /**
     * Listar mensajes de contacto con paginación y filtros
     * Requiere autenticación (admin/superuser)
     */
    async getContacts(params = {}) {
        const response = await apiClient.get('/contacts', { params });
        return response.data;
    }
    /**
     * Obtener un mensaje de contacto por ID
     * Marca el mensaje como leído automáticamente
     * Requiere autenticación (admin/superuser)
     */
    async getContact(contactId) {
        const response = await apiClient.get(`/contacts/${contactId}`);
        return response.data;
    }
    /**
     * Actualizar mensaje de contacto (marcar leído, responder, cambiar estado)
     * Requiere autenticación (admin/superuser)
     */
    async updateContact(contactId, data) {
        const response = await apiClient.put(`/contacts/${contactId}`, data);
        return response.data;
    }
    /**
     * Obtener estadísticas de mensajes de contacto
     * Requiere autenticación (admin/superuser)
     */
    async getStats() {
        const response = await apiClient.get('/contacts/stats/summary');
        return response.data;
    }
}
export const contactService = new ContactService();
