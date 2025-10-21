/**
 * Sale Service - API calls for sales
 */
import apiClient from '../utils/api-client';
import type { Sale, SaleItem } from '../types/api';

export interface SaleWithItems extends Sale {
  items: SaleItem[];
}

export interface SaleItemCreate {
  product_id: string;
  quantity: number;
  unit_price: number;
}

export interface SaleCreate {
  school_id: string;
  client_id: string;
  items: SaleItemCreate[];
  payment_method: 'cash' | 'credit' | 'transfer' | 'card';
  notes?: string;
}

export const saleService = {
  /**
   * Get all sales for a school
   */
  async getSales(schoolId: string): Promise<Sale[]> {
    const response = await apiClient.get<Sale[]>(`/schools/${schoolId}/sales`);
    return response.data;
  },

  /**
   * Get a single sale by ID
   */
  async getSale(schoolId: string, saleId: string): Promise<Sale> {
    const response = await apiClient.get<Sale>(`/schools/${schoolId}/sales/${saleId}`);
    return response.data;
  },

  /**
   * Get a sale with its items
   */
  async getSaleWithItems(schoolId: string, saleId: string): Promise<SaleWithItems> {
    const response = await apiClient.get<SaleWithItems>(`/schools/${schoolId}/sales/${saleId}/items`);
    return response.data;
  },

  /**
   * Create a new sale
   */
  async createSale(schoolId: string, data: SaleCreate): Promise<Sale> {
    const response = await apiClient.post<Sale>(`/schools/${schoolId}/sales`, data);
    return response.data;
  },
};
