/**
 * User Service - API calls for user management
 */
import apiClient from '../utils/api-client';
export const userService = {
    // ==========================================
    // Current User Profile
    // ==========================================
    /**
     * Get current user info
     */
    async getMe() {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
    /**
     * Update current user profile
     */
    async updateProfile(userId, data) {
        const response = await apiClient.put(`/users/${userId}`, data);
        return response.data;
    },
    /**
     * Change current user password
     */
    async changePassword(data) {
        await apiClient.post('/auth/change-password', data);
    },
    // ==========================================
    // User Management (Superuser only)
    // ==========================================
    /**
     * Get all users
     */
    async getUsers(skip = 0, limit = 100) {
        const response = await apiClient.get('/users', {
            params: { skip, limit }
        });
        return response.data;
    },
    /**
     * Get user by ID
     */
    async getUser(userId) {
        const response = await apiClient.get(`/users/${userId}`);
        return response.data;
    },
    /**
     * Create new user
     */
    async createUser(data) {
        const response = await apiClient.post('/users', data);
        return response.data;
    },
    /**
     * Update user
     */
    async updateUser(userId, data) {
        const response = await apiClient.put(`/users/${userId}`, data);
        return response.data;
    },
    /**
     * Delete user
     */
    async deleteUser(userId) {
        await apiClient.delete(`/users/${userId}`);
    },
    // ==========================================
    // User School Roles
    // ==========================================
    /**
     * Get user's school roles
     */
    async getUserSchools(userId) {
        const response = await apiClient.get(`/users/${userId}/schools`);
        return response.data;
    },
    /**
     * Add user role for school
     */
    async addUserSchoolRole(userId, schoolId, role) {
        const response = await apiClient.post(`/users/${userId}/schools/${schoolId}/role`, null, { params: { role } });
        return response.data;
    },
    /**
     * Update user role for school
     */
    async updateUserSchoolRole(userId, schoolId, role) {
        const response = await apiClient.put(`/users/${userId}/schools/${schoolId}/role`, null, { params: { role } });
        return response.data;
    },
    /**
     * Remove user role from school
     */
    async removeUserSchoolRole(userId, schoolId) {
        await apiClient.delete(`/users/${userId}/schools/${schoolId}/role`);
    },
    /**
     * Get all users with access to a school
     */
    async getSchoolUsers(schoolId) {
        const response = await apiClient.get(`/users/schools/${schoolId}/users`);
        return response.data;
    },
};
