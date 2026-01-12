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

export interface SchoolInfoForRole {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

export interface UserSchoolRole {
  id: string;
  user_id: string;
  school_id: string;
  role: 'owner' | 'admin' | 'seller' | 'viewer';
  created_at: string;
  school: SchoolInfoForRole;  // Nested school info from backend
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
  updated_at?: string;
  school_roles?: UserSchoolRole[];
}

export interface PaymentAccount {
  id: string;
  method_type: string;
  account_name: string;
  account_number: string;
  account_holder: string;
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
  delivery_fee: number;
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

// Sales Types
export type SaleStatus = 'pending' | 'completed' | 'cancelled';
export type PaymentMethod = 'cash' | 'nequi' | 'transfer' | 'card' | 'credit';
export type ChangeType = 'SIZE_CHANGE' | 'PRODUCT_CHANGE' | 'RETURN' | 'DEFECT';
export type ChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Sale {
  id: string;
  code: string;
  school_id: string;
  school_name?: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  user_id: string;
  user_name?: string;
  total: number;
  paid_amount: number;
  status: SaleStatus;
  payment_method?: PaymentMethod;
  source: string;
  notes?: string;
  sale_date: string;
  created_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id?: string;
  global_product_id?: string;
  product_code?: string;
  product_name?: string;
  product_size?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  is_global: boolean;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  created_at: string;
}

export interface SaleChange {
  id: string;
  sale_id: string;
  change_type: ChangeType;
  status: ChangeStatus;
  original_item_id: string;
  original_product_name?: string;
  new_product_id?: string;
  new_product_name?: string;
  quantity: number;
  price_difference: number;
  reason?: string;
  approved_by?: string;
  created_at: string;
  updated_at?: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItem[];
  payments?: SalePayment[];
  changes?: SaleChange[];
}

// Orders Types
export type OrderStatus = 'pending' | 'in_production' | 'ready' | 'delivered' | 'cancelled';
export type OrderItemStatus = 'pending' | 'in_production' | 'ready' | 'delivered' | 'cancelled';
export type DeliveryType = 'pickup' | 'delivery';

export interface Order {
  id: string;
  code: string;
  school_id?: string;
  school_name?: string;
  client_id?: string;
  client_name?: string;
  client_phone?: string;
  user_id?: string;
  user_name?: string;
  total: number;
  paid_amount: number;
  balance: number;
  status: OrderStatus;
  delivery_date?: string;
  delivery_type?: DeliveryType;
  delivery_zone_id?: string;
  delivery_zone_name?: string;
  delivery_fee?: number;
  notes?: string;
  source?: string;
  created_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  garment_type_id?: string;
  garment_type_name?: string;
  product_id?: string;
  product_name?: string;
  product_code?: string;
  product_size?: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  item_status: OrderItemStatus;
  custom_measurements?: Record<string, any>;
  embroidery_text?: string;
  reserved_from_stock?: boolean;
  quantity_reserved?: number;
  notes?: string;
}

export interface OrderPayment {
  id: string;
  order_id: string;
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
  created_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  payments?: OrderPayment[];
}

// Client Type
export interface Client {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  school_id?: string;
}
