/**
 * Delivery Zone Service
 * Handles API calls for delivery zone management
 */
import apiClient from '../utils/api-client';
export const deliveryZoneService = {
    /**
     * List all delivery zones (admin)
     */
    getZones: async (includeInactive = true) => {
        const response = await apiClient.get('/delivery-zones', {
            params: { include_inactive: includeInactive }
        });
        return response.data;
    },
    /**
     * Get a specific delivery zone
     */
    getZone: async (zoneId) => {
        const response = await apiClient.get(`/delivery-zones/${zoneId}`);
        return response.data;
    },
    /**
     * Create a new delivery zone
     */
    createZone: async (data) => {
        const response = await apiClient.post('/delivery-zones', data);
        return response.data;
    },
    /**
     * Update a delivery zone
     */
    updateZone: async (zoneId, data) => {
        const response = await apiClient.patch(`/delivery-zones/${zoneId}`, data);
        return response.data;
    },
    /**
     * Deactivate a delivery zone (soft delete)
     */
    deleteZone: async (zoneId) => {
        await apiClient.delete(`/delivery-zones/${zoneId}`);
    },
};
