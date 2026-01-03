/**
 * API Client - Using Tauri HTTP plugin for cross-origin requests
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { useConfigStore } from '../stores/configStore';
// Track online status
function updateOnlineStatus(isOnline) {
    const store = useConfigStore.getState();
    if (store.isOnline !== isOnline) {
        store.setIsOnline(isOnline);
        store.updateLastChecked();
    }
}
// Helper function to get error message
export const getErrorMessage = (error) => {
    if (error instanceof Error) {
        return error.message;
    }
    if (typeof error === 'object' && error !== null && 'detail' in error) {
        return String(error.detail);
    }
    return 'An unexpected error occurred';
};
// API Client wrapper using Tauri fetch
export const apiClient = {
    async request(method, endpoint, data, options) {
        const apiUrl = useConfigStore.getState().apiUrl;
        let url = `${apiUrl}/api/v1${endpoint}`;
        // Add query params if provided
        if (options?.params) {
            const searchParams = new URLSearchParams();
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }
        const token = localStorage.getItem('access_token');
        const headers = {
            'Content-Type': 'application/json',
            ...options?.headers,
        };
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }
        try {
            const response = await tauriFetch(url, {
                method,
                headers,
                body: data ? JSON.stringify(data) : undefined,
                connectTimeout: 30000,
            });
            updateOnlineStatus(true);
            // Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                throw new Error('Unauthorized');
            }
            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error('No tienes permisos para esta acción');
            }
            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }
            // Handle 204 No Content (DELETE responses)
            if (response.status === 204) {
                return { data: {}, status: response.status };
            }
            const responseData = await response.json();
            return { data: responseData, status: response.status };
        }
        catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                updateOnlineStatus(false);
            }
            throw error;
        }
    },
    async get(endpoint, options) {
        return this.request('GET', endpoint, undefined, options);
    },
    async post(endpoint, data, options) {
        return this.request('POST', endpoint, data, options);
    },
    async put(endpoint, data, options) {
        return this.request('PUT', endpoint, data, options);
    },
    async patch(endpoint, data, options) {
        return this.request('PATCH', endpoint, data, options);
    },
    async delete(endpoint, options) {
        return this.request('DELETE', endpoint, undefined, options);
    },

    /**
     * Upload a file using multipart/form-data
     * @param {string} endpoint - API endpoint
     * @param {File} file - File to upload
     * @param {string} fieldName - Form field name for the file (default: 'file')
     * @param {Object} options - Additional options
     */
    async uploadFile(endpoint, file, fieldName = 'file', options) {
        const apiUrl = useConfigStore.getState().apiUrl;
        let url = `${apiUrl}/api/v1${endpoint}`;

        // Add query params if provided
        if (options?.params) {
            const searchParams = new URLSearchParams();
            Object.entries(options.params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.append(key, String(value));
                }
            });
            const queryString = searchParams.toString();
            if (queryString) {
                url += `?${queryString}`;
            }
        }

        const token = localStorage.getItem('access_token');
        const headers = {
            ...options?.headers,
        };
        // DO NOT set Content-Type - let the browser set it with boundary
        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Create FormData
        const formData = new FormData();
        formData.append(fieldName, file);

        try {
            const response = await tauriFetch(url, {
                method: 'POST',
                headers,
                body: formData,
                connectTimeout: 60000, // Longer timeout for uploads
            });

            updateOnlineStatus(true);

            // Handle 401 Unauthorized
            if (response.status === 401) {
                localStorage.removeItem('access_token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                throw new Error('Unauthorized');
            }

            // Handle 403 Forbidden
            if (response.status === 403) {
                throw new Error('No tienes permisos para esta acción');
            }

            // Handle other errors
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.detail || `HTTP ${response.status}`);
            }

            const responseData = await response.json();
            return { data: responseData, status: response.status };
        }
        catch (error) {
            if (error instanceof TypeError && error.message.includes('fetch')) {
                updateOnlineStatus(false);
            }
            throw error;
        }
    },
};
// Check connection status by calling health endpoint
export async function checkConnection() {
    try {
        const apiUrl = useConfigStore.getState().apiUrl;
        const response = await tauriFetch(`${apiUrl}/health`, {
            method: 'GET',
            connectTimeout: 5000,
        });
        updateOnlineStatus(response.ok);
        return response.ok;
    }
    catch {
        updateOnlineStatus(false);
        return false;
    }
}
export default apiClient;
