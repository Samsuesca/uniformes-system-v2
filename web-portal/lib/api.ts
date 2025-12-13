import axios from 'axios';

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
  description?: string;
  size?: string;
  gender?: string;
  color?: string;
  price: number;
  stock_quantity: number;
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
  list: (schoolId: string, params?: { is_active?: boolean }) =>
    apiClient.get<Product[]>(`/schools/${schoolId}/products`, { params }),
  get: (schoolId: string, productId: string) =>
    apiClient.get<Product>(`/schools/${schoolId}/products/${productId}`),
};

// Clients
export const clientsApi = {
  create: (schoolId: string, data: Partial<Client>) =>
    apiClient.post<Client>(`/schools/${schoolId}/clients`, data),
};

// Orders
export const ordersApi = {
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
