/**
 * Authentication Store - Zustand store for managing auth state
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import apiClient, { getErrorMessage } from '../utils/api-client';
export const useAuthStore = create()(persist((set, get) => ({
    // Initial state
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
    // Login action
    login: async (credentials) => {
        set({ isLoading: true, error: null });
        try {
            const response = await apiClient.post('/auth/login', credentials);
            const { token, user } = response.data;
            // Store token in localStorage (also handled by persist middleware)
            localStorage.setItem('access_token', token.access_token);
            set({
                user,
                token: token.access_token,
                isAuthenticated: true,
                isLoading: false,
                error: null,
            });
        }
        catch (error) {
            const errorMessage = getErrorMessage(error);
            set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false,
                error: errorMessage,
            });
            throw error;
        }
    },
    // Logout action
    logout: () => {
        localStorage.removeItem('access_token');
        set({
            user: null,
            token: null,
            isAuthenticated: false,
            error: null,
        });
    },
    // Clear error
    clearError: () => {
        set({ error: null });
    },
    // Get current user (verify token is still valid)
    getCurrentUser: async () => {
        const { token } = get();
        if (!token) {
            return;
        }
        try {
            const response = await apiClient.get('/auth/me');
            set({ user: response.data, isAuthenticated: true });
        }
        catch (error) {
            // Token is invalid, logout
            get().logout();
        }
    },
    // Update user data locally (after profile edit)
    updateUser: (userData) => {
        const { user } = get();
        if (user) {
            set({ user: { ...user, ...userData } });
        }
    },
}), {
    name: 'auth-storage',
    partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
    }),
}));
