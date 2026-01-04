/**
 * Client Service - API calls for clients
 *
 * Clients are GLOBAL (not tied to a specific school).
 * Endpoints: /api/v1/clients
 */
import apiClient from '../utils/api-client';
export const clientService = {
    /**
     * Get all clients (global)
     * @deprecated schoolId parameter is no longer used - clients are global
     */
    async getClients(_schoolId, filters) {
        const params = new URLSearchParams();
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.client_type)
            params.append('client_type', filters.client_type);
        if (filters?.is_active !== undefined)
            params.append('is_active', String(filters.is_active));
        if (filters?.skip)
            params.append('skip', String(filters.skip));
        if (filters?.limit)
            params.append('limit', String(filters.limit));
        const queryString = params.toString();
        const url = queryString ? `/clients?${queryString}` : '/clients';
        const response = await apiClient.get(url);
        return response.data;
    },
    /**
     * Search clients by term
     */
    async searchClients(query, limit = 20) {
        const response = await apiClient.get(`/clients/search?q=${encodeURIComponent(query)}&limit=${limit}`);
        return response.data;
    },
    /**
     * Get a single client by ID
     * @deprecated schoolId parameter is no longer used - clients are global
     */
    async getClient(schoolIdOrClientId, clientId) {
        // Support both old signature (schoolId, clientId) and new (clientId)
        const id = clientId || schoolIdOrClientId;
        const response = await apiClient.get(`/clients/${id}`);
        return response.data;
    },
    /**
     * Get client summary with purchase stats
     */
    async getClientSummary(clientId) {
        const response = await apiClient.get(`/clients/${clientId}/summary`);
        return response.data;
    },
    /**
     * Create a new client (global)
     * @deprecated schoolId parameter is no longer used - clients are global
     */
    async createClient(schoolIdOrData, data) {
        // Support both old signature (schoolId, data) and new (data)
        const clientData = data || (typeof schoolIdOrData === 'object' ? schoolIdOrData : {});
        const response = await apiClient.post('/clients', clientData);
        return response.data;
    },
    /**
     * Update a client
     * @deprecated schoolId parameter is no longer used - clients are global
     */
    async updateClient(schoolIdOrClientId, clientIdOrData, data) {
        // Support both old signature (schoolId, clientId, data) and new (clientId, data)
        let clientId;
        let updateData;
        if (data) {
            // Old signature: (schoolId, clientId, data)
            clientId = clientIdOrData;
            updateData = data;
        }
        else {
            // New signature: (clientId, data)
            clientId = schoolIdOrClientId;
            updateData = clientIdOrData;
        }
        const response = await apiClient.patch(`/clients/${clientId}`, updateData);
        return response.data;
    },
    /**
     * Delete a client (soft delete) - requires admin
     * @deprecated schoolId parameter is no longer used - clients are global
     */
    async deleteClient(schoolIdOrClientId, clientId) {
        // Support both old signature (schoolId, clientId) and new (clientId)
        const id = clientId || schoolIdOrClientId;
        await apiClient.delete(`/clients/${id}`);
    },
    /**
     * Get top clients by total spent
     */
    async getTopClients(limit = 10) {
        const response = await apiClient.get(`/clients/top?limit=${limit}`);
        return response.data;
    },
    // ======================
    // Student Management
    // ======================
    /**
     * Add a student to a client
     */
    async addStudent(clientId, studentData) {
        const response = await apiClient.post(`/clients/${clientId}/students`, studentData);
        return response.data;
    },
    /**
     * Update a client's student
     */
    async updateStudent(clientId, studentId, studentData) {
        const response = await apiClient.patch(`/clients/${clientId}/students/${studentId}`, studentData);
        return response.data;
    },
    /**
     * Remove a student from a client
     */
    async removeStudent(clientId, studentId) {
        await apiClient.delete(`/clients/${clientId}/students/${studentId}`);
    },
};
