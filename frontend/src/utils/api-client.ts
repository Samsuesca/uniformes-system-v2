/**
 * API Client - Using Tauri HTTP plugin for cross-origin requests
 */
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';
import { useConfigStore } from '../stores/configStore';

// Track online status
function updateOnlineStatus(isOnline: boolean) {
  const store = useConfigStore.getState();
  if (store.isOnline !== isOnline) {
    store.setIsOnline(isOnline);
    store.updateLastChecked();
  }
}

// Helper function to get error message
export const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'object' && error !== null && 'detail' in error) {
    return String((error as { detail: unknown }).detail);
  }
  return 'An unexpected error occurred';
};

// API Client wrapper using Tauri fetch
export const apiClient = {
  async request<T>(
    method: string,
    endpoint: string,
    data?: unknown,
    options?: { headers?: Record<string, string>; params?: Record<string, unknown> }
  ): Promise<{ data: T; status: number }> {
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

    const headers: Record<string, string> = {
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
        return { data: {} as T, status: response.status };
      }

      const responseData = await response.json();
      return { data: responseData as T, status: response.status };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        updateOnlineStatus(false);
      }
      throw error;
    }
  },

  async get<T>(endpoint: string, options?: { headers?: Record<string, string>; params?: Record<string, unknown> }) {
    return this.request<T>('GET', endpoint, undefined, options);
  },

  async post<T>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string>; params?: Record<string, unknown> }) {
    return this.request<T>('POST', endpoint, data, options);
  },

  async put<T>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string>; params?: Record<string, unknown> }) {
    return this.request<T>('PUT', endpoint, data, options);
  },

  async patch<T>(endpoint: string, data?: unknown, options?: { headers?: Record<string, string>; params?: Record<string, unknown> }) {
    return this.request<T>('PATCH', endpoint, data, options);
  },

  async delete<T>(endpoint: string, options?: { headers?: Record<string, string>; params?: Record<string, unknown> }) {
    return this.request<T>('DELETE', endpoint, undefined, options);
  },

  async uploadFile<T>(endpoint: string, file: File, fieldName: string = 'file'): Promise<{ data: T; status: number }> {
    const apiUrl = useConfigStore.getState().apiUrl;
    const url = `${apiUrl}/api/v1${endpoint}`;
    const token = localStorage.getItem('access_token');

    const formData = new FormData();
    formData.append(fieldName, file);

    const headers: Record<string, string> = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await tauriFetch(url, {
        method: 'POST',
        headers,
        body: formData,
        connectTimeout: 60000,
      });

      updateOnlineStatus(true);

      if (response.status === 401) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
        throw new Error('Unauthorized');
      }

      if (response.status === 403) {
        throw new Error('No tienes permisos para esta acción');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const responseData = await response.json();
      return { data: responseData as T, status: response.status };
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        updateOnlineStatus(false);
      }
      throw error;
    }
  },
};

// Check connection status by calling health endpoint
export async function checkConnection(): Promise<boolean> {
  try {
    const apiUrl = useConfigStore.getState().apiUrl;
    const response = await tauriFetch(`${apiUrl}/health`, {
      method: 'GET',
      connectTimeout: 5000,
    });
    updateOnlineStatus(response.ok);
    return response.ok;
  } catch {
    updateOnlineStatus(false);
    return false;
  }
}

export default apiClient;
