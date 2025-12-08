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

// User roles (hierarchical, highest to lowest)
export type UserRole = 'owner' | 'admin' | 'seller' | 'viewer';

export interface UserSchoolRole {
  id: string;
  user_id: string;
  school_id: string;
  role: UserRole;
  created_at: string;
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
  school_roles?: UserSchoolRole[];
}

export interface LoginResponse {
  token: Token;
  user: User;
}

// Role hierarchy for permission checking
export const ROLE_HIERARCHY: Record<UserRole, number> = {
  viewer: 1,
  seller: 2,
  admin: 3,
  owner: 4,
};

// Permission check helpers
export const canManageUsers = (role?: UserRole): boolean => role === 'owner';
export const canAccessAccounting = (role?: UserRole): boolean =>
  role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin : false;
export const canModifyInventory = (role?: UserRole): boolean =>
  role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin : false;
export const canCreateSales = (role?: UserRole): boolean =>
  role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.seller : false;
export const canDeleteRecords = (role?: UserRole): boolean =>
  role ? ROLE_HIERARCHY[role] >= ROLE_HIERARCHY.admin : false;

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
  // Inventory fields (when with_inventory=true)
  inventory_quantity?: number;
  inventory_min_stock?: number;
  stock?: number; // Alias for inventory_quantity
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

export interface SaleItemWithProduct extends SaleItem {
  product_code: string;
  product_name: string | null;
  product_size: string;
  product_color: string | null;
}

export interface SaleWithItems extends Sale {
  items: SaleItemWithProduct[];
  client_name: string | null;
}

export interface SaleListItem {
  id: string;
  code: string;
  status: 'pending' | 'completed' | 'cancelled';
  payment_method: 'cash' | 'credit' | 'transfer' | 'card' | null;
  total: number;
  paid_amount: number;
  client_id: string | null;
  client_name: string | null;
  sale_date: string;
  created_at: string;
  items_count: number;
}

// ============================================
// Sale Change Types
// ============================================

export type ChangeType = 'size_change' | 'product_change' | 'return' | 'defect';
export type ChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface SaleChange {
  id: string;
  sale_id: string;
  original_item_id: string;
  new_product_id: string | null;
  change_type: ChangeType;
  status: ChangeStatus;
  returned_quantity: number;
  new_quantity: number;
  price_adjustment: number;
  reason: string | null;
  rejection_reason: string | null;
  change_date: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface SaleChangeCreate {
  original_item_id: string;
  new_product_id?: string | null;  // null for returns
  change_type: ChangeType;
  returned_quantity: number;
  new_quantity?: number;  // 0 for returns
  reason: string;  // Required (min 3 chars in backend)
}

export interface SaleChangeListItem {
  id: string;
  sale_id: string;
  sale_code: string;
  change_type: ChangeType;
  status: ChangeStatus;
  returned_quantity: number;
  new_quantity: number;
  price_adjustment: number;
  change_date: string;
  reason: string | null;
}

// ============================================
// Order Types (Encargos)
// ============================================

export type OrderStatus = 'pending' | 'in_production' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItem {
  id: string;
  order_id: string;
  school_id: string;
  garment_type_id: string;
  garment_type_name: string;
  garment_type_category: string | null;
  requires_embroidery: boolean;
  has_custom_measurements: boolean;
  quantity: number;
  unit_price: number;
  subtotal: number;
  size: string | null;
  color: string | null;
  gender: string | null;
  custom_measurements: Record<string, number> | null;
  embroidery_text: string | null;
  notes: string | null;
}

export interface OrderItemCreate {
  garment_type_id: string;
  quantity: number;
  size?: string;
  color?: string;
  gender?: string;
  custom_measurements?: Record<string, number>;
  embroidery_text?: string;
  notes?: string;
}

export interface Order {
  id: string;
  school_id: string;
  code: string;
  client_id: string;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  total: number;
  paid_amount: number;
  balance: number;
  delivery_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
  client_name: string;
  client_phone: string | null;
  student_name: string | null;
}

export interface OrderListItem {
  id: string;
  code: string;
  status: OrderStatus;
  client_name: string;
  student_name: string | null;
  delivery_date: string | null;
  total: number;
  balance: number;
  created_at: string;
  items_count: number;
}

export interface OrderCreate {
  school_id: string;
  client_id: string;
  delivery_date?: string;
  notes?: string;
  items: OrderItemCreate[];
  advance_payment?: number;
}

export interface OrderPayment {
  amount: number;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

// ============================================
// Accounting Types
// ============================================

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccPaymentMethod = 'cash' | 'transfer' | 'card' | 'credit' | 'other';
export type ExpenseCategory = 'rent' | 'utilities' | 'payroll' | 'supplies' | 'inventory' |
                              'transport' | 'maintenance' | 'marketing' | 'taxes' | 'bank_fees' | 'other';

export interface Transaction {
  id: string;
  school_id: string;
  type: TransactionType;
  amount: number;
  payment_method: AccPaymentMethod;
  description: string;
  category: string | null;
  reference_code: string | null;
  transaction_date: string;
  sale_id: string | null;
  order_id: string | null;
  expense_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionListItem {
  id: string;
  type: TransactionType;
  amount: number;
  payment_method: AccPaymentMethod;
  description: string;
  category: string | null;
  reference_code: string | null;
  transaction_date: string;
  created_at: string;
}

export interface TransactionCreate {
  school_id: string;
  type: TransactionType;
  amount: number;
  payment_method: AccPaymentMethod;
  description: string;
  category?: string;
  reference_code?: string;
  transaction_date: string;
  sale_id?: string;
  order_id?: string;
  expense_id?: string;
}

export interface Expense {
  id: string;
  school_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  amount_paid: number;
  is_paid: boolean;
  expense_date: string;
  due_date: string | null;
  vendor: string | null;
  receipt_number: string | null;
  notes: string | null;
  is_recurring: boolean;
  recurring_period: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  balance: number;
}

export interface ExpenseListItem {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  amount_paid: number;
  is_paid: boolean;
  expense_date: string;
  due_date: string | null;
  vendor: string | null;
  is_recurring: boolean;
  balance: number;
}

export interface ExpenseCreate {
  school_id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  expense_date: string;
  due_date?: string;
  vendor?: string;
  receipt_number?: string;
  notes?: string;
  is_recurring?: boolean;
  recurring_period?: 'weekly' | 'monthly' | 'yearly';
}

export interface ExpensePayment {
  amount: number;
  payment_method: AccPaymentMethod;
  notes?: string;
}

export interface DailyCashRegister {
  id: string;
  school_id: string;
  register_date: string;
  opening_balance: number;
  closing_balance: number | null;
  total_income: number;
  total_expenses: number;
  cash_income: number;
  transfer_income: number;
  card_income: number;
  credit_sales: number;
  is_closed: boolean;
  closed_at: string | null;
  closed_by: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  net_flow: number;
}

export interface AccountingDashboard {
  today_income: number;
  today_expenses: number;
  today_net: number;
  month_income: number;
  month_expenses: number;
  month_net: number;
  pending_expenses: number;
  pending_expenses_amount: number;
  recent_transactions: TransactionListItem[];
}

export interface CashFlowSummary {
  period_start: string;
  period_end: string;
  total_income: number;
  total_expenses: number;
  net_flow: number;
  income_by_method: Record<string, number>;
  expenses_by_category: Record<string, number>;
}

export interface ExpensesByCategory {
  category: ExpenseCategory;
  total_amount: number;
  count: number;
  percentage: number;
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
