/**
 * Sale Change Service - API calls for sale changes/returns
 */
import apiClient from '../utils/api-client';
export const saleChangeService = {
    /**
     * Create a new sale change request
     */
    async createChange(schoolId, saleId, data) {
        const response = await apiClient.post(`/schools/${schoolId}/sales/${saleId}/changes`, data);
        return response.data;
    },
    /**
     * Get all changes for a specific sale
     */
    async getSaleChanges(schoolId, saleId) {
        const response = await apiClient.get(`/schools/${schoolId}/sales/${saleId}/changes`);
        return response.data;
    },
    /**
     * Approve a sale change request (ADMIN only)
     * @param paymentMethod - Payment method for refunds/additional payments (cash, nequi, transfer, card)
     */
    async approveChange(schoolId, saleId, changeId, paymentMethod) {
        const data = paymentMethod ? { payment_method: paymentMethod } : undefined;
        const response = await apiClient.patch(`/schools/${schoolId}/sales/${saleId}/changes/${changeId}/approve`, data);
        return response.data;
    },
    /**
     * Reject a sale change request (ADMIN only)
     */
    async rejectChange(schoolId, saleId, changeId, rejectionReason) {
        const response = await apiClient.patch(`/schools/${schoolId}/sales/${saleId}/changes/${changeId}/reject`, { rejection_reason: rejectionReason });
        return response.data;
    },
};
