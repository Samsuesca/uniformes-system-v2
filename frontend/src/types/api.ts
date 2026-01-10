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
  total_orders?: number;
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
  min_stock?: number; // Minimum stock alert level
  // Pending orders info
  pending_orders_qty?: number;
  pending_orders_count?: number;
  // Extra fields from multi-school endpoint
  garment_type_name?: string;
  school_name?: string;
  // Garment type images (when with_images=true)
  garment_type_images?: GarmentTypeImage[];
  garment_type_primary_image_url?: string | null;
}

export interface ProductWithInventory extends Product {
  inventory_quantity: number;
  inventory_min_stock: number;
}

// GarmentType Image (for multiple images per garment type)
export interface GarmentTypeImage {
  id: string;
  garment_type_id: string;
  school_id: string;
  image_url: string;
  display_order: number;
  is_primary: boolean;
  created_at: string;
}

export interface GarmentType {
  id: string;
  school_id: string;
  name: string;
  description: string | null;
  category: string | null;
  has_custom_measurements: boolean;
  requires_embroidery: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  // Image fields (when included by backend)
  images?: GarmentTypeImage[];
  primary_image_url?: string | null;
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
// Payment Method Types
// ============================================

// Payment methods for sales
export type PaymentMethod = 'cash' | 'nequi' | 'transfer' | 'card' | 'credit';

// Payment method display labels
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  cash: 'Efectivo',
  nequi: 'Nequi',
  transfer: 'Transferencia',
  card: 'Tarjeta',
  credit: 'Crédito',
};

// Payment method to account mapping (for UI display)
export const PAYMENT_METHOD_ACCOUNTS: Record<PaymentMethod, string> = {
  cash: 'Caja Menor',
  nequi: 'Nequi',
  transfer: 'Banco',
  card: 'Banco',
  credit: 'Cuenta por Cobrar',
};

// ============================================
// Sale Types
// ============================================

export interface Sale {
  id: string;
  school_id: string;
  code: string;
  client_id: string | null;
  user_id: string;
  user_name?: string | null;  // Seller name
  status: 'pending' | 'completed' | 'cancelled';
  is_historical: boolean;  // Historical sale (migration data)
  payment_method: 'cash' | 'nequi' | 'credit' | 'transfer' | 'card' | null;
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
  product_id: string | null;  // null when is_global_product is true
  global_product_id?: string | null;
  is_global_product?: boolean;
  quantity: number;
  unit_price: number;
  subtotal: number;
  created_at: string;
  updated_at: string;
}

export interface SaleItemWithProduct extends SaleItem {
  product_code: string | null;
  product_name: string | null;
  product_size: string | null;
  product_color: string | null;
  // Global product info (if applicable)
  global_product_code: string | null;
  global_product_name: string | null;
  global_product_size: string | null;
  global_product_color: string | null;
  // Flag to identify global products
  is_global_product?: boolean;
  global_product_id?: string | null;
}

export interface SalePayment {
  id: string;
  sale_id: string;
  amount: number;
  payment_method: PaymentMethod;
  notes: string | null;
  transaction_id: string | null;
  created_at: string;
}

export interface SaleWithItems extends Sale {
  items: SaleItemWithProduct[];
  client_name: string | null;
  payments?: SalePayment[];
  // Calculated fields
  balance?: number;  // Saldo pendiente (total - paid_amount)
}

export interface SaleListItem {
  id: string;
  code: string;
  status: 'pending' | 'completed' | 'cancelled';
  source: 'desktop_app' | 'web_portal' | 'api' | null;
  is_historical: boolean;  // Historical sale (migration data)
  payment_method: 'cash' | 'nequi' | 'credit' | 'transfer' | 'card' | null;
  total: number;
  paid_amount: number;
  client_id: string | null;
  client_name: string | null;
  sale_date: string;
  created_at: string;
  items_count: number;
  // Track who made the sale
  user_id: string | null;
  user_name: string | null;
  // Multi-school support
  school_id: string | null;
  school_name: string | null;
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
export type OrderItemStatus = 'pending' | 'in_production' | 'ready' | 'delivered' | 'cancelled';
export type OrderType = 'catalog' | 'yomber' | 'custom';
export type DeliveryType = 'pickup' | 'delivery';

// Yomber measurements interface
export interface YomberMeasurements {
  // Required
  delantero: number;
  trasero: number;
  cintura: number;
  largo: number;
  // Optional
  espalda?: number;
  cadera?: number;
  hombro?: number;
  pierna?: number;
  entrepierna?: number;
  manga?: number;
  cuello?: number;
  pecho?: number;
  busto?: number;
  tiro?: number;
}

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
  // Item-level status for individual tracking
  item_status: OrderItemStatus;
  status_updated_at: string | null;
  // Stock reservation tracking ("pisar" functionality)
  reserved_from_stock?: boolean;
  quantity_reserved?: number;
}

export interface OrderItemCreate {
  garment_type_id: string;
  quantity: number;
  // Order type
  order_type?: OrderType;
  // For catalog/yomber orders - product for price
  product_id?: string;
  // For custom orders - manual price
  unit_price?: number;
  // Additional services price
  additional_price?: number;
  // Stock reservation - "pisar" functionality (reserve from inventory if available)
  reserve_stock?: boolean;
  // Common fields
  size?: string;
  color?: string;
  gender?: string;
  custom_measurements?: YomberMeasurements | Record<string, number>;
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
  client_email: string | null;
  student_name: string | null;
  // Delivery info
  delivery_type?: DeliveryType;
  delivery_address?: string | null;
  delivery_neighborhood?: string | null;
  delivery_city?: string | null;
  delivery_references?: string | null;
  delivery_zone_id?: string | null;
  delivery_fee?: number;
}

export interface OrderListItem {
  id: string;
  code: string;
  status: OrderStatus;
  source: 'desktop_app' | 'web_portal' | 'api' | null;
  client_name: string | null;
  student_name: string | null;
  delivery_date: string | null;
  total: number;
  balance: number;
  created_at: string;
  items_count: number;
  // Track who created the order
  user_id: string | null;
  user_name: string | null;
  // Multi-school support
  school_id: string | null;
  school_name: string | null;
  // Partial delivery tracking
  items_delivered: number;
  items_total: number;
  // Payment proof
  payment_proof_url: string | null;
  // Quotation flag
  needs_quotation?: boolean;
  // Delivery info
  delivery_type: DeliveryType;
  delivery_fee: number;
  delivery_address: string | null;
  delivery_neighborhood: string | null;
}

export interface OrderCreate {
  school_id: string;
  client_id: string;
  delivery_date?: string;
  notes?: string;
  items: OrderItemCreate[];
  advance_payment?: number;
  advance_payment_method?: 'cash' | 'nequi' | 'transfer' | 'card';
}

export interface OrderPayment {
  amount: number;
  payment_method: string;
  payment_reference?: string;
  notes?: string;
}

export interface OrderItemStatusUpdate {
  item_status: OrderItemStatus;
}

// ============================================
// Accounting Types
// ============================================

export type TransactionType = 'income' | 'expense' | 'transfer';
export type AccPaymentMethod = 'cash' | 'nequi' | 'transfer' | 'card' | 'credit' | 'other';
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
  notes: string | null;
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
  use_fallback?: boolean;
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
// Balance General Types (Balance Sheet)
// ============================================

export type AccountType =
  | 'asset_current' | 'asset_fixed' | 'asset_other'
  | 'liability_current' | 'liability_long' | 'liability_other'
  | 'equity_capital' | 'equity_retained' | 'equity_other';

// Balance Account (Cuenta de Balance)
export interface BalanceAccount {
  id: string;
  school_id: string;
  account_type: AccountType;
  name: string;
  description: string | null;
  code: string | null;
  balance: number;
  original_value: number | null;
  accumulated_depreciation: number | null;
  useful_life_years: number | null;
  interest_rate: number | null;
  due_date: string | null;
  creditor: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface BalanceAccountCreate {
  account_type: AccountType;
  name: string;
  description?: string;
  code?: string;
  balance: number;
  original_value?: number;
  accumulated_depreciation?: number;
  useful_life_years?: number;
  interest_rate?: number;
  due_date?: string;
  creditor?: string;
}

export interface BalanceAccountUpdate {
  name?: string;
  description?: string;
  code?: string;
  balance?: number;
  original_value?: number;
  accumulated_depreciation?: number;
  useful_life_years?: number;
  interest_rate?: number;
  due_date?: string;
  creditor?: string;
  is_active?: boolean;
}

export interface BalanceAccountListItem {
  id: string;
  account_type: AccountType;
  name: string;
  code: string | null;
  balance: number;
  net_value: number;
  is_active: boolean;
}

// Balance Entry (Movimiento de Cuenta)
export interface BalanceEntry {
  id: string;
  account_id: string;
  school_id: string;
  entry_date: string;
  amount: number;
  balance_after: number;
  description: string;
  reference: string | null;
  created_by: string | null;
  created_at: string;
}

export interface BalanceEntryCreate {
  entry_date: string;
  amount: number;
  description: string;
  reference?: string;
}

// Accounts Receivable (Cuentas por Cobrar)
export interface AccountsReceivable {
  id: string;
  school_id: string;
  client_id: string | null;
  sale_id: string | null;
  amount: number;
  amount_paid: number;
  description: string;
  due_date: string | null;
  invoice_date: string;
  is_paid: boolean;
  is_overdue: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  balance: number;
  client_name?: string;
}

export interface AccountsReceivableCreate {
  client_id?: string;
  sale_id?: string;
  amount: number;
  description: string;
  due_date?: string;
  invoice_date: string;
  notes?: string;
}

export interface AccountsReceivablePayment {
  amount: number;
  payment_method: AccPaymentMethod;
  notes?: string;
}

export interface AccountsReceivableListItem {
  id: string;
  client_id: string | null;
  client_name: string | null;
  amount: number;
  amount_paid: number;
  balance: number;
  description: string;
  due_date: string | null;
  invoice_date: string;
  is_paid: boolean;
  is_overdue: boolean;
}

// Accounts Payable (Cuentas por Pagar)
export interface AccountsPayable {
  id: string;
  school_id: string;
  vendor: string;
  amount: number;
  amount_paid: number;
  description: string;
  category: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  is_paid: boolean;
  is_overdue: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  balance: number;
}

export interface AccountsPayableCreate {
  vendor: string;
  amount: number;
  description: string;
  category?: string;
  invoice_number?: string;
  invoice_date: string;
  due_date?: string;
  notes?: string;
}

export interface AccountsPayablePayment {
  amount: number;
  payment_method: AccPaymentMethod;
  notes?: string;
}

export interface AccountsPayableListItem {
  id: string;
  vendor: string;
  amount: number;
  amount_paid: number;
  balance: number;
  description: string;
  category: string | null;
  invoice_number: string | null;
  invoice_date: string;
  due_date: string | null;
  is_paid: boolean;
  is_overdue: boolean;
}

// Balance General Summary (Balance Sheet Summary)
export interface BalanceGeneralSummary {
  as_of_date: string;
  // Activos
  total_current_assets: number;
  total_fixed_assets: number;
  total_other_assets: number;
  total_assets: number;
  // Pasivos
  total_current_liabilities: number;
  total_long_liabilities: number;
  total_other_liabilities: number;
  total_liabilities: number;
  // Patrimonio
  total_equity: number;
  // Check
  is_balanced: boolean;
}

// Accounts grouped by type for balance sheet display
export interface BalanceAccountsByType {
  account_type: AccountType;
  account_type_label: string;
  accounts: BalanceAccountListItem[];
  total: number;
}

export interface BalanceGeneralDetailed {
  as_of_date: string;
  // Assets breakdown
  current_assets: BalanceAccountsByType;
  fixed_assets: BalanceAccountsByType;
  other_assets: BalanceAccountsByType;
  // Liabilities breakdown
  current_liabilities: BalanceAccountsByType;
  long_liabilities: BalanceAccountsByType;
  other_liabilities: BalanceAccountsByType;
  // Equity breakdown
  equity: BalanceAccountsByType[];
  // Totals
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  is_balanced: boolean;
}

export interface ReceivablesPayablesSummary {
  // Receivables (Cuentas por Cobrar)
  total_receivables: number;
  receivables_collected: number;
  receivables_pending: number;
  receivables_overdue: number;
  receivables_count: number;
  // Payables (Cuentas por Pagar)
  total_payables: number;
  payables_paid: number;
  payables_pending: number;
  payables_overdue: number;
  payables_count: number;
  // Net position
  net_position: number;
}

// ============================================
// Global Product Types
// ============================================

export interface GlobalGarmentType {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  has_custom_measurements: boolean;
  requires_embroidery: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  images?: GarmentTypeImage[];
}

export interface GlobalProduct {
  id: string;
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
  // Inventory fields
  inventory_quantity?: number;
  inventory_min_stock?: number;
  stock?: number; // Alias for inventory_quantity (for consistency with Product)
  min_stock?: number; // Minimum stock alert level
}

export interface GlobalProductWithInventory extends GlobalProduct {
  inventory_quantity: number;
  inventory_min_stock: number;
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

// ============================================
// Caja Menor Types (Cash Register)
// ============================================

export interface CajaMenorBalance {
  id: string | null;
  name: string;
  code: string;
  balance: number;
  last_updated: string | null;
}

export interface CajaMenorSummary {
  caja_menor_balance: number;
  caja_mayor_balance: number;
  today_liquidations: number;
  today_entries_count: number;
  date: string;
}

export interface LiquidationResult {
  success: boolean;
  message: string;
  caja_menor_balance: number;
  caja_mayor_balance: number;
  amount_liquidated: number;
  entry_from: {
    id: string;
    amount: number;
    balance_after: number;
    description: string;
  };
  entry_to: {
    id: string;
    amount: number;
    balance_after: number;
    description: string;
  };
}

export interface LiquidationHistoryItem {
  id: string;
  date: string;
  amount: number;
  balance_after: number;
  description: string;
  reference: string;
  created_at: string;
}

// Cash balances response with all accounts
export interface CashBalances {
  caja_menor: {
    id: string;
    name: string;
    code: string;
    balance: number;
    last_updated: string | null;
  } | null;
  caja_mayor: {
    id: string;
    name: string;
    code: string;
    balance: number;
    last_updated: string | null;
  } | null;
  nequi: {
    id: string;
    name: string;
    code: string;
    balance: number;
    last_updated: string | null;
  } | null;
  banco: {
    id: string;
    name: string;
    code: string;
    balance: number;
    last_updated: string | null;
  } | null;
  total_liquid: number;
  total_cash: number;
}
