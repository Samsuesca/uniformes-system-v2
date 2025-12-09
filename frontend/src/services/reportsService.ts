/**
 * Reports Service - API calls for reports and analytics
 */
import apiClient from '../utils/api-client';

export interface DashboardSummary {
  today: {
    sales_count: number;
    revenue: number;
  };
  this_month: {
    sales_count: number;
    revenue: number;
    average_ticket: number;
  };
  alerts: {
    low_stock_count: number;
    pending_orders_count: number;
  };
  inventory: {
    total_products: number;
    total_value: number;
  };
}

export interface DailySales {
  date: string;
  total_sales: number;
  total_revenue: number;
  completed_count: number;
  pending_count: number;
  cancelled_count: number;
  cash_sales: number;
  transfer_sales: number;
  card_sales: number;
  credit_sales: number;
}

export interface SalesSummary {
  total_sales: number;
  total_revenue: number;
  average_ticket: number;
  sales_by_payment: Record<string, { count: number; total: number }>;
  start_date: string;
  end_date: string;
}

export interface TopProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  product_size: string;
  units_sold: number;
  total_revenue: number;
}

export interface LowStockProduct {
  product_id: string;
  product_code: string;
  product_name: string;
  product_size: string;
  current_stock: number;
  min_stock: number;
}

export interface InventoryValue {
  total_products: number;
  total_units: number;
  total_value: number;
}

export interface PendingOrder {
  order_id: string;
  order_code: string;
  status: string;
  delivery_date: string | null;
  total: number;
  balance: number;
  created_at: string;
}

export interface TopClient {
  client_id: string;
  client_code: string;
  client_name: string;
  client_phone: string | null;
  total_purchases: number;
  total_spent: number;
}

// Date filter options for reports
export interface DateFilters {
  startDate?: string;  // YYYY-MM-DD
  endDate?: string;    // YYYY-MM-DD
}

export const reportsService = {
  /**
   * Get dashboard summary (with optional date filters)
   */
  async getDashboardSummary(schoolId: string, filters?: DateFilters): Promise<DashboardSummary> {
    const params: Record<string, string> = {};
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;
    const response = await apiClient.get<DashboardSummary>(`/schools/${schoolId}/reports/dashboard`, { params });
    return response.data;
  },

  /**
   * Get daily sales
   */
  async getDailySales(schoolId: string, date?: string): Promise<DailySales> {
    const params = date ? { target_date: date } : {};
    const response = await apiClient.get<DailySales>(`/schools/${schoolId}/reports/sales/daily`, { params });
    return response.data;
  },

  /**
   * Get sales summary for a period
   */
  async getSalesSummary(schoolId: string, filters?: DateFilters): Promise<SalesSummary> {
    const params: Record<string, string> = {};
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;
    const response = await apiClient.get<SalesSummary>(`/schools/${schoolId}/reports/sales/summary`, { params });
    return response.data;
  },

  /**
   * Get top selling products (with optional date filters)
   */
  async getTopProducts(schoolId: string, limit = 10, filters?: DateFilters): Promise<TopProduct[]> {
    const params: Record<string, string | number> = { limit };
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;
    const response = await apiClient.get<TopProduct[]>(`/schools/${schoolId}/reports/sales/top-products`, { params });
    return response.data;
  },

  /**
   * Get low stock products
   */
  async getLowStock(schoolId: string, threshold = 5): Promise<LowStockProduct[]> {
    const response = await apiClient.get<LowStockProduct[]>(`/schools/${schoolId}/reports/inventory/low-stock`, {
      params: { threshold }
    });
    return response.data;
  },

  /**
   * Get inventory value
   */
  async getInventoryValue(schoolId: string): Promise<InventoryValue> {
    const response = await apiClient.get<InventoryValue>(`/schools/${schoolId}/reports/inventory/value`);
    return response.data;
  },

  /**
   * Get pending orders
   */
  async getPendingOrders(schoolId: string): Promise<PendingOrder[]> {
    const response = await apiClient.get<PendingOrder[]>(`/schools/${schoolId}/reports/orders/pending`);
    return response.data;
  },

  /**
   * Get top clients (with optional date filters)
   */
  async getTopClients(schoolId: string, limit = 10, filters?: DateFilters): Promise<TopClient[]> {
    const params: Record<string, string | number> = { limit };
    if (filters?.startDate) params.start_date = filters.startDate;
    if (filters?.endDate) params.end_date = filters.endDate;
    const response = await apiClient.get<TopClient[]>(`/schools/${schoolId}/reports/clients/top`, { params });
    return response.data;
  },
};
