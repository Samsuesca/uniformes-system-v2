/**
 * Sale Service - API calls for sales
 *
 * Two types of endpoints:
 * - Multi-school: /sales - Lists from ALL schools user has access to
 * - School-specific: /schools/{school_id}/sales - Original endpoints
 */
import apiClient from '../utils/api-client';
export const saleService = {
    /**
     * Get all sales from ALL schools user has access to (multi-school)
     */
    async getAllSales(filters) {
        const params = new URLSearchParams();
        if (filters?.school_id)
            params.append('school_id', filters.school_id);
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.source)
            params.append('source', filters.source);
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.skip)
            params.append('skip', String(filters.skip));
        if (filters?.limit)
            params.append('limit', String(filters.limit));
        const queryString = params.toString();
        const url = queryString ? `/sales?${queryString}` : '/sales';
        const response = await apiClient.get(url);
        return response.data;
    },
    /**
     * Get all sales for a specific school (backwards compatible)
     * Uses multi-school endpoint with school filter
     */
    async getSales(schoolId) {
        if (schoolId) {
            return this.getAllSales({ school_id: schoolId });
        }
        return this.getAllSales();
    },
    /**
     * Get a single sale by ID (from any accessible school)
     */
    async getSaleById(saleId) {
        const response = await apiClient.get(`/sales/${saleId}`);
        return response.data;
    },
    /**
     * Get a single sale by ID (school-specific)
     */
    async getSale(schoolId, saleId) {
        const response = await apiClient.get(`/schools/${schoolId}/sales/${saleId}`);
        return response.data;
    },
    /**
     * Get a sale with its items (school-specific)
     */
    async getSaleWithItems(schoolId, saleId) {
        const response = await apiClient.get(`/schools/${schoolId}/sales/${saleId}/items`);
        return response.data;
    },
    /**
     * Create a new sale (school-specific)
     */
    async createSale(schoolId, data) {
        const response = await apiClient.post(`/schools/${schoolId}/sales`, data);
        return response.data;
    },
};
