import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAdminAuth } from './adminAuth';

// API Base URL
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Create axios instance
const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Get token from store (only works client-side)
    if (typeof window !== 'undefined') {
      const storage = localStorage.getItem('admin-auth-storage');
      if (storage) {
        try {
          const { state } = JSON.parse(storage);
          if (state?.token) {
            config.headers.Authorization = `Bearer ${state.token}`;
          }
        } catch (e) {
          console.error('Error parsing auth storage:', e);
        }
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, logout
      if (typeof window !== 'undefined') {
        useAdminAuth.getState().logout();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// Types
export interface School {
  id: string;
  code: string;
  name: string;
  slug: string;
  email?: string;
  phone?: string;
  address?: string;
  logo_url?: string;
  is_active: boolean;
  display_order: number;
  created_at: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  is_superuser: boolean;
  last_login?: string;
  created_at: string;
}

export interface UserSchoolRole {
  school_id: string;
  school_name: string;
  role: 'owner' | 'admin' | 'seller' | 'viewer';
}

export interface PaymentAccount {
  id: string;
  method: string;
  account_name: string;
  account_number: string;
  holder_name?: string;
  bank_name?: string;
  account_type?: string;
  qr_code_url?: string;
  instructions?: string;
  display_order: number;
  is_active: boolean;
}

export interface DeliveryZone {
  id: string;
  name: string;
  description?: string;
  fee: number;
  estimated_days: number;
  is_active: boolean;
}

export interface Product {
  id: string;
  code: string;
  name: string;
  size: string;
  price: number;
  stock: number;
  garment_type_id?: string;
  garment_type_name?: string;
  image_url?: string;
  school_id?: string;
  is_global: boolean;
  is_active: boolean;
}

export interface GarmentType {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  school_id?: string;
  is_global: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface DashboardStats {
  total_schools: number;
  total_users: number;
  total_superusers: number;
  total_products: number;
  total_orders_today: number;
  total_sales_today: number;
}
