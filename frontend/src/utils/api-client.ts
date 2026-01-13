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
    const isFormData = data instanceof FormData;

    const headers: Record<string, string> = {
      // Don't set Content-Type for FormData - let the browser set it with proper boundary
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...options?.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response: Response;

      if (isFormData) {
        // Use XMLHttpRequest for FormData - more reliable for multipart uploads
        response = await new Promise<Response>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(method, url);

          // Set auth header (don't set Content-Type - let browser handle it)
          Object.entries(headers).forEach(([key, value]) => {
            if (key.toLowerCase() !== 'content-type') {
              xhr.setRequestHeader(key, value);
            }
          });

          xhr.onload = () => {
            const responseHeaders = new Headers();
            xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
              const [key, value] = line.split(': ');
              if (key && value) responseHeaders.append(key, value);
            });

            resolve(new Response(xhr.response, {
              status: xhr.status,
              statusText: xhr.statusText,
              headers: responseHeaders,
            }));
          };

          xhr.onerror = () => reject(new TypeError('Network request failed'));
          xhr.ontimeout = () => reject(new TypeError('Request timeout'));
          xhr.timeout = 60000;

          xhr.send(data as FormData);
        });
      } else {
        // Use Tauri fetch for JSON requests (handles CORS better)
        response = await tauriFetch(url, {
          method,
          headers,
          body: data ? JSON.stringify(data) : undefined,
          connectTimeout: 30000,
        });
      }

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
        let errorMessage: string;

        if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors - format them nicely
          errorMessage = errorData.detail
            .map((e: { loc?: string[]; msg?: string }) => {
              const field = e.loc?.[e.loc.length - 1] || 'Campo';
              return `${field}: ${e.msg}`;
            })
            .join('\n');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail);
        } else {
          errorMessage = `HTTP ${response.status}`;
        }

        throw new Error(errorMessage);
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
      // Use XMLHttpRequest for FormData - more reliable for multipart uploads
      const response = await new Promise<Response>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url);

        // Set auth header (don't set Content-Type - let browser handle it)
        Object.entries(headers).forEach(([key, value]) => {
          if (key.toLowerCase() !== 'content-type') {
            xhr.setRequestHeader(key, value);
          }
        });

        xhr.onload = () => {
          const responseHeaders = new Headers();
          xhr.getAllResponseHeaders().split('\r\n').forEach(line => {
            const [key, value] = line.split(': ');
            if (key && value) responseHeaders.append(key, value);
          });

          resolve(new Response(xhr.response, {
            status: xhr.status,
            statusText: xhr.statusText,
            headers: responseHeaders,
          }));
        };

        xhr.onerror = () => reject(new TypeError('Network request failed'));
        xhr.ontimeout = () => reject(new TypeError('Request timeout'));
        xhr.timeout = 60000;

        xhr.send(formData);
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
        let errorMessage: string;

        if (Array.isArray(errorData.detail)) {
          // Pydantic validation errors - format them nicely
          errorMessage = errorData.detail
            .map((e: { loc?: string[]; msg?: string }) => {
              const field = e.loc?.[e.loc.length - 1] || 'Campo';
              return `${field}: ${e.msg}`;
            })
            .join('\n');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else if (errorData.detail && typeof errorData.detail === 'object') {
          errorMessage = JSON.stringify(errorData.detail);
        } else {
          errorMessage = `HTTP ${response.status}`;
        }

        throw new Error(errorMessage);
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

// Función centralizada para extraer mensajes de error legibles
export function extractErrorMessage(err: unknown): string {
  // Errores de validación Pydantic (array de detalles)
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    (err as { response?: { data?: { detail?: unknown } } }).response?.data?.detail &&
    Array.isArray((err as { response: { data: { detail: unknown[] } } }).response.data.detail)
  ) {
    return (err as { response: { data: { detail: Array<{ loc?: string[]; msg?: string }> } } }).response.data.detail
      .map((e) => {
        const field = e.loc?.[e.loc.length - 1] || 'Campo';
        return `${field}: ${e.msg}`;
      })
      .join('\n');
  }

  // Error string del backend (detail como string)
  if (
    err &&
    typeof err === 'object' &&
    'response' in err &&
    typeof (err as { response?: { data?: { detail?: string } } }).response?.data?.detail === 'string'
  ) {
    return (err as { response: { data: { detail: string } } }).response.data.detail;
  }

  // Error message directo (de throw new Error en apiClient)
  if (err instanceof Error && err.message) {
    if (err.message === 'Unauthorized') return 'Sesión expirada. Inicia sesión nuevamente.';
    if (err.message.includes('HTTP 400')) return 'Datos inválidos. Revisa los campos.';
    if (err.message.includes('HTTP 404')) return 'El recurso no fue encontrado.';
    if (err.message.includes('HTTP 409')) return 'Ya existe un registro con estos datos.';
    if (err.message.includes('HTTP 422')) return 'Error de validación. Revisa los campos.';
    if (err.message.includes('HTTP 500')) return 'Error del servidor. Intenta de nuevo.';
    // Si no es un error HTTP conocido, devolver el mensaje
    if (!err.message.startsWith('HTTP ')) return err.message;
  }

  // Error de red
  if (
    err &&
    typeof err === 'object' &&
    'message' in err &&
    typeof (err as { message: string }).message === 'string'
  ) {
    const msg = (err as { message: string }).message;
    if (msg.includes('fetch') || msg.includes('network') || msg.includes('Network')) {
      return 'Error de conexión. Verifica tu internet.';
    }
  }

  return (err as { message?: string })?.message || 'Error desconocido. Intenta de nuevo.';
}

export default apiClient;
