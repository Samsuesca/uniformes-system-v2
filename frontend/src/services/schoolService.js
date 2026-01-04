/**
 * School Service - API calls for schools
 */
import apiClient from '../utils/api-client';
export const schoolService = {
    /**
     * Get all active schools
     */
    async getSchools(activeOnly = true) {
        const response = await apiClient.get('/schools', {
            params: { active_only: activeOnly }
        });
        return response.data;
    },
    /**
     * Get a specific school by ID
     */
    async getSchool(schoolId) {
        const response = await apiClient.get(`/schools/${schoolId}`);
        return response.data;
    },
    /**
     * Get school summary with statistics
     */
    async getSchoolSummary(schoolId) {
        const response = await apiClient.get(`/schools/${schoolId}/summary`);
        return response.data;
    },
    /**
     * Search schools by name
     */
    async searchSchools(name, limit = 10) {
        const response = await apiClient.get('/schools/search/by-name', {
            params: { name, limit }
        });
        return response.data;
    },
    // ==========================================
    // CRUD Operations (Superuser only)
    // ==========================================
    /**
     * Create new school (superuser only)
     */
    async createSchool(data) {
        const response = await apiClient.post('/schools', data);
        return response.data;
    },
    /**
     * Update school (superuser only)
     */
    async updateSchool(schoolId, data) {
        const response = await apiClient.put(`/schools/${schoolId}`, data);
        return response.data;
    },
    /**
     * Deactivate school (soft delete, superuser only)
     */
    async deleteSchool(schoolId) {
        await apiClient.delete(`/schools/${schoolId}`);
    },
    /**
     * Activate school (superuser only)
     */
    async activateSchool(schoolId) {
        const response = await apiClient.post(`/schools/${schoolId}/activate`);
        return response.data;
    },
};
