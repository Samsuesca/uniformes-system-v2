/**
 * API Client - Axios instance configured for backend communication
 */
import axios, { AxiosError, AxiosResponse } from 'axios';
import { useConfigStore } from '../stores/configStore';

// Create Axios instance
export const apiClient = axios.create({
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Dynamic baseURL interceptor - uses current config from store
apiClient.interceptors.request.use(
  (config) => {
    // Get current API URL from config store
    const apiUrl = useConfigStore.getState().apiUrl;
    config.baseURL = `${apiUrl}/api/v1`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Request interceptor - add auth token
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('access_token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - handle errors
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response;
  },
  (error: AxiosError) => {
    // Handle 401 Unauthorized - token expired or invalid
    if (error.response?.status === 401) {
      // Clear auth data
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');

      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Handle 403 Forbidden - no permissions
    if (error.response?.status === 403) {
      console.error('Forbidden: You do not have permission to access this resource');
    }

    // Handle network errors
    if (!error.response) {
      console.error('Network error: Could not connect to API');
    }

    return Promise.reject(error);
  }
);

// Helper function to get error message
export const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.detail;
    if (typeof message === 'string') {
      return message;
    }
    return error.message;
  }
  return 'An unexpected error occurred';
};

export default apiClient;
