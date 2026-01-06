/**
 * Sale Service - API calls for sales
 *
 * Two types of endpoints:
 * - Multi-school: /sales - Lists from ALL schools user has access to
 * - School-specific: /schools/{school_id}/sales - Original endpoints
 */
import apiClient from '../utils/api-client';
import type { Sale, SaleWithItems, SaleListItem } from '../types/api';

export interface SaleItemCreate {
  product_id: string;
  quantity: number;
  unit_price: number;
  is_global?: boolean;  // True if product is from global inventory
}

export type PaymentMethod = 'cash' | 'nequi' | 'credit' | 'transfer' | 'card';

export interface SalePaymentCreate {
  amount: number;
  payment_method: PaymentMethod;
  notes?: string;
}

export interface SaleCreate {
  school_id: string;
  client_id?: string | null;
  items: SaleItemCreate[];
  // Single payment method (deprecated, use payments instead)
  payment_method?: PaymentMethod;
  // Multiple payments support
  payments?: SalePaymentCreate[];
  notes?: string;
  source?: 'desktop_app' | 'web_portal' | 'api';
  // Historical sales (migration) - don't affect inventory
  is_historical?: boolean;
  sale_date?: string;  // ISO date string for historical sales
}

export interface SaleFilters {
  school_id?: string;
  status?: string;
  source?: 'desktop_app' | 'web_portal' | 'api';
  search?: string;
  skip?: number;
  limit?: number;
}

export const saleService = {
  /**
   * Get all sales from ALL schools user has access to (multi-school)
   */
  async getAllSales(filters?: SaleFilters): Promise<SaleListItem[]> {
    const params = new URLSearchParams();
    if (filters?.school_id) params.append('school_id', filters.school_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.source) params.append('source', filters.source);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.skip) params.append('skip', String(filters.skip));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString ? `/sales?${queryString}` : '/sales';
    const response = await apiClient.get<SaleListItem[]>(url);
    return response.data;
  },

  /**
   * Get all sales for a specific school (backwards compatible)
   * Uses multi-school endpoint with school filter
   */
  async getSales(schoolId?: string): Promise<SaleListItem[]> {
    if (schoolId) {
      return this.getAllSales({ school_id: schoolId });
    }
    return this.getAllSales();
  },

  /**
   * Get a single sale by ID (from any accessible school)
   */
  async getSaleById(saleId: string): Promise<Sale> {
    const response = await apiClient.get<Sale>(`/sales/${saleId}`);
    return response.data;
  },

  /**
   * Get a single sale by ID (school-specific)
   */
  async getSale(schoolId: string, saleId: string): Promise<Sale> {
    const response = await apiClient.get<Sale>(`/schools/${schoolId}/sales/${saleId}`);
    return response.data;
  },

  /**
   * Get a sale with its items (school-specific)
   */
  async getSaleWithItems(schoolId: string, saleId: string): Promise<SaleWithItems> {
    const response = await apiClient.get<SaleWithItems>(`/schools/${schoolId}/sales/${saleId}/items`);
    return response.data;
  },

  /**
   * Create a new sale (school-specific)
   */
  async createSale(schoolId: string, data: SaleCreate): Promise<Sale> {
    const response = await apiClient.post<Sale>(`/schools/${schoolId}/sales`, data);
    return response.data;
  },
};
