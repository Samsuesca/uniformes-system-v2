/**
 * Order Service - API calls for orders (encargos)
 *
 * Two types of endpoints:
 * - Multi-school: /orders - Lists from ALL schools user has access to
 * - School-specific: /schools/{school_id}/orders - Original endpoints
 */
import apiClient from '../utils/api-client';
export const orderService = {
    /**
     * Get all orders from ALL schools user has access to (multi-school)
     */
    async getAllOrders(filters) {
        const params = new URLSearchParams();
        if (filters?.school_id)
            params.append('school_id', filters.school_id);
        if (filters?.status)
            params.append('status', filters.status);
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.skip)
            params.append('skip', String(filters.skip));
        if (filters?.limit)
            params.append('limit', String(filters.limit));
        const queryString = params.toString();
        const url = queryString ? `/orders?${queryString}` : '/orders';
        const response = await apiClient.get(url);
        return response.data;
    },
    /**
     * Get all orders for a school (backwards compatible)
     * Uses multi-school endpoint with school filter
     */
    async getOrders(schoolId, status) {
        const filters = {};
        if (schoolId)
            filters.school_id = schoolId;
        if (status)
            filters.status = status;
        return this.getAllOrders(filters);
    },
    /**
     * Get a single order by ID (from any accessible school)
     */
    async getOrderById(orderId) {
        const response = await apiClient.get(`/orders/${orderId}`);
        return response.data;
    },
    /**
     * Get a single order with items (school-specific)
     */
    async getOrder(schoolId, orderId) {
        const response = await apiClient.get(`/schools/${schoolId}/orders/${orderId}`);
        return response.data;
    },
    /**
     * Create a new order (school-specific)
     */
    async createOrder(schoolId, data) {
        const response = await apiClient.post(`/schools/${schoolId}/orders`, data);
        return response.data;
    },
    /**
     * Update order status (school-specific)
     */
    async updateStatus(schoolId, orderId, status) {
        const response = await apiClient.patch(`/schools/${schoolId}/orders/${orderId}/status`, null, { params: { new_status: status } });
        return response.data;
    },
    /**
     * Add payment to order (school-specific)
     */
    async addPayment(schoolId, orderId, payment) {
        const response = await apiClient.post(`/schools/${schoolId}/orders/${orderId}/payments`, payment);
        return response.data;
    },
    /**
     * Update order details (delivery_date, notes) - school-specific
     */
    async updateOrder(schoolId, orderId, data) {
        const response = await apiClient.patch(`/schools/${schoolId}/orders/${orderId}`, data);
        return response.data;
    },
    /**
     * Update individual order item status (school-specific)
     *
     * Allows tracking progress of individual items within an order.
     * For example: a catalog item may be ready while a yomber is still in production.
     */
    async updateItemStatus(schoolId, orderId, itemId, status) {
        const response = await apiClient.patch(`/schools/${schoolId}/orders/${orderId}/items/${itemId}/status`, { item_status: status });
        return response.data;
    },
    /**
     * Verify stock availability for all items in an order
     *
     * Returns detailed information about which items can be fulfilled from
     * current inventory vs which need to be produced.
     */
    async verifyOrderStock(schoolId, orderId) {
        const response = await apiClient.get(`/schools/${schoolId}/orders/${orderId}/stock-verification`);
        return response.data;
    },
    /**
     * Approve/process a web order with intelligent stock handling
     *
     * This endpoint:
     * 1. Checks stock availability for each item
     * 2. For items WITH stock: marks as READY and decrements inventory
     * 3. For items WITHOUT stock: marks as IN_PRODUCTION
     */
    async approveOrderWithStock(schoolId, orderId, options) {
        const response = await apiClient.post(`/schools/${schoolId}/orders/${orderId}/approve`, {
            auto_fulfill_if_stock: options?.auto_fulfill_if_stock ?? true,
            items: options?.items || [],
            notify_client: true
        });
        return response.data;
    },
    /**
     * Approve payment proof for an order
     */
    async approvePayment(schoolId, orderId) {
        const response = await apiClient.post(`/schools/${schoolId}/orders/${orderId}/approve-payment`);
        return response.data;
    },
    /**
     * Reject payment proof for an order
     */
    async rejectPayment(schoolId, orderId, rejectionNotes) {
        const response = await apiClient.post(`/schools/${schoolId}/orders/${orderId}/reject-payment`, null, { params: { rejection_notes: rejectionNotes } });
        return response.data;
    },
};
