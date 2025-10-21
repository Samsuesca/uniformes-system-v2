/**
 * API Types - TypeScript interfaces matching backend schemas
 */

// ============================================
// Auth Types
// ============================================

export interface LoginRequest {
  username: string;
  password: string;
}

export interface Token {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  full_name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  last_login: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  token: Token;
  user: User;
}

// ============================================
// School Types
// ============================================

export interface School {
  id: string;
  code: string;
  name: string;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  settings: Record<string, any>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SchoolSummary {
  id: string;
  code: string;
  name: string;
  total_products: number;
  total_clients: number;
  total_sales: number;
  is_active: boolean;
}

// ============================================
// Product Types
// ============================================

export interface Product {
  id: string;
  school_id: string;
  code: string;
  garment_type_id: string;
  name: string | null;
  size: string;
  color: string | null;
  gender: string | null;
  price: number;
  cost: number | null;
  description: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithInventory extends Product {
  inventory_quantity: number;
  inventory_min_stock: number;
}

export interface GarmentType {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Client Types
// ============================================

export interface Client {
  id: string;
  school_id: string;
  code: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  student_name: string | null;
  student_grade: string | null;
  notes: string | null;
  balance?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ============================================
// Sale Types
// ============================================

export interface Sale {
  id: string;
  school_id: string;
  code: string;
  client_id: string | null;
  user_id: string;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'credit' | 'transfer' | 'card' | null;
  total: number;
  paid_amount: number;
  sale_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface SaleItem {
  id: string;
  sale_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

// ============================================
// API Response Types
// ============================================

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip: number;
  limit: number;
}

export interface ApiError {
  detail: string;
}
