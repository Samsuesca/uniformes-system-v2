import axios from 'axios';
import { getPublicToken, clearPublicToken } from './auth';

// API Base URL - se configura desde variables de entorno
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  async (config) => {
    // Get public token for catalog access
    try {
      const token = await getPublicToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to add auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token expiration
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired, clear cache and retry once
      clearPublicToken();
      const originalRequest = error.config;

      if (!originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const token = await getPublicToken();
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        } catch (retryError) {
          return Promise.reject(retryError);
        }
      }
    }
    return Promise.reject(error);
  }
);

// Types
export interface School {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  address?: string;
  phone?: string;
  email?: string;
  settings?: Record<string, unknown>;
  is_active: boolean;
}

export interface Product {
  id: string;
  school_id: string;
  garment_type_id: string;
  name: string;
  code: string;
  description?: string;
  size?: string;
  gender?: string;
  color?: string;
  price: number;
  stock?: number; // Campo devuelto por ProductListResponse cuando with_stock=true
  stock_quantity?: number; // Alias por compatibilidad
  inventory_quantity?: number; // Para GlobalProduct
  min_stock_level?: number;
  location?: string;
  barcode?: string;
  is_active: boolean;
}

export interface Client {
  id: string;
  school_id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  student_name?: string;
  student_grade?: string;
  notes?: string;
  is_active: boolean;
}

export interface OrderItem {
  garment_type_id: string;
  quantity: number;
  unit_price: number;
  size?: string;
  gender?: string;
  custom_measurements?: Record<string, unknown>;
  notes?: string;
}

export interface Order {
  id: string;
  school_id: string;
  code: string;
  client_id: string;
  order_date: string;
  delivery_date?: string;
  status: string;
  total_amount: number;
  notes?: string;
  items: OrderItem[];
}

// API Endpoints

// Schools
export const schoolsApi = {
  list: () => apiClient.get<School[]>('/schools'),
  getBySlug: (slug: string) => apiClient.get<School>(`/schools/slug/${slug}`),
};

// Products
export const productsApi = {
  list: (schoolId: string, params?: { is_active?: boolean; with_stock?: boolean }) =>
    apiClient.get<Product[]>('/products', { params: { school_id: schoolId, with_stock: true, ...params } }),
  get: (schoolId: string, productId: string) =>
    apiClient.get<Product>(`/schools/${schoolId}/products/${productId}`),
  listGlobal: (params?: { with_inventory?: boolean; limit?: number }) =>
    apiClient.get<Product[]>('/global/products', { params }),
};

// Clients (Web Portal Registration)
export interface ClientWebRegister {
  name: string;
  email: string;
  password: string;
  phone?: string;
  students: Array<{
    school_id: string;
    student_name: string;
    student_grade?: string;
    student_section?: string;
    notes?: string;
  }>;
}

export const clientsApi = {
  // Web portal client registration (public endpoint - sin autenticación)
  register: async (data: ClientWebRegister) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_BASE_URL}/api/v1/portal/clients/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error en el registro' }));
      throw new Error(error.detail || 'Error en el registro');
    }

    const result = await response.json();
    return { data: result };
  },
};

// Orders
export const ordersApi = {
  // Web portal order creation (public endpoint - sin autenticación)
  createWeb: async (data: { school_id: string; client_id: string; items: OrderItem[]; notes?: string }) => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    const response = await fetch(`${API_BASE_URL}/api/v1/portal/orders/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Error al crear el pedido' }));
      throw new Error(error.detail || 'Error al crear el pedido');
    }

    const result = await response.json();
    return { data: result };
  },
  create: (schoolId: string, data: { school_id: string; client_id: string; items: OrderItem[]; notes?: string }) =>
    apiClient.post<Order>(`/schools/${schoolId}/orders`, data),
  get: (schoolId: string, orderId: string) =>
    apiClient.get<Order>(`/schools/${schoolId}/orders/${orderId}`),
};

// Helper function for product images (placeholder)
export const getProductImage = (productName: string): string => {
  const name = productName.toLowerCase();
  if (name.includes('camisa') || name.includes('blusa')) return '👕';
  if (name.includes('pantalon') || name.includes('falda')) return '👖';
  if (name.includes('sudadera') || name.includes('buzo')) return '🧥';
  if (name.includes('zapato') || name.includes('tennis')) return '👟';
  if (name.includes('media') || name.includes('calcet')) return '🧦';
  return '👔';
};
