/**
 * Reports Service - API calls for reports and analytics
 */
import apiClient from '../utils/api-client';
export const reportsService = {
    /**
     * Get dashboard summary (with optional date filters)
     */
    async getDashboardSummary(schoolId, filters) {
        const params = {};
        if (filters?.startDate)
            params.start_date = filters.startDate;
        if (filters?.endDate)
            params.end_date = filters.endDate;
        const response = await apiClient.get(`/schools/${schoolId}/reports/dashboard`, { params });
        return response.data;
    },
    /**
     * Get daily sales
     */
    async getDailySales(schoolId, date) {
        const params = date ? { target_date: date } : {};
        const response = await apiClient.get(`/schools/${schoolId}/reports/sales/daily`, { params });
        return response.data;
    },
    /**
     * Get sales summary for a period
     */
    async getSalesSummary(schoolId, filters) {
        const params = {};
        if (filters?.startDate)
            params.start_date = filters.startDate;
        if (filters?.endDate)
            params.end_date = filters.endDate;
        const response = await apiClient.get(`/schools/${schoolId}/reports/sales/summary`, { params });
        return response.data;
    },
    /**
     * Get top selling products (with optional date filters)
     */
    async getTopProducts(schoolId, limit = 10, filters) {
        const params = { limit };
        if (filters?.startDate)
            params.start_date = filters.startDate;
        if (filters?.endDate)
            params.end_date = filters.endDate;
        const response = await apiClient.get(`/schools/${schoolId}/reports/sales/top-products`, { params });
        return response.data;
    },
    /**
     * Get low stock products
     */
    async getLowStock(schoolId, threshold = 5) {
        const response = await apiClient.get(`/schools/${schoolId}/reports/inventory/low-stock`, {
            params: { threshold }
        });
        return response.data;
    },
    /**
     * Get inventory value
     */
    async getInventoryValue(schoolId) {
        const response = await apiClient.get(`/schools/${schoolId}/reports/inventory/value`);
        return response.data;
    },
    /**
     * Get pending orders
     */
    async getPendingOrders(schoolId) {
        const response = await apiClient.get(`/schools/${schoolId}/reports/orders/pending`);
        return response.data;
    },
    /**
     * Get top clients (with optional date filters)
     */
    async getTopClients(schoolId, limit = 10, filters) {
        const params = { limit };
        if (filters?.startDate)
            params.start_date = filters.startDate;
        if (filters?.endDate)
            params.end_date = filters.endDate;
        const response = await apiClient.get(`/schools/${schoolId}/reports/clients/top`, { params });
        return response.data;
    },
};
