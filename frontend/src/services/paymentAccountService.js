/**
 * Payment Account Service
 *
 * API client for managing payment accounts (bank accounts, Nequi, QR codes).
 * Admin configures these in desktop app, displayed to customers in web portal.
 */
import apiClient from '../utils/api-client';
class PaymentAccountService {
    /**
     * List all payment accounts (admin - includes inactive)
     */
    async getAll() {
        const response = await apiClient.get('/payment-accounts');
        return response.data;
    }
    /**
     * Get public payment accounts (active only - for web portal)
     */
    async getPublic() {
        const response = await apiClient.get('/payment-accounts/public');
        return response.data;
    }
    /**
     * Get payment account by ID
     */
    async getById(id) {
        const response = await apiClient.get(`/payment-accounts/${id}`);
        return response.data;
    }
    /**
     * Create new payment account
     */
    async create(data) {
        const response = await apiClient.post('/payment-accounts', data);
        return response.data;
    }
    /**
     * Update payment account
     */
    async update(id, data) {
        const response = await apiClient.put(`/payment-accounts/${id}`, data);
        return response.data;
    }
    /**
     * Delete payment account
     */
    async delete(id) {
        await apiClient.delete(`/payment-accounts/${id}`);
    }
}
export const paymentAccountService = new PaymentAccountService();
