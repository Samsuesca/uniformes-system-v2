/**
 * Dashboard Service - API calls for dashboard stats
 */
import apiClient from '../utils/api-client';
import type { SchoolSummary } from '../types/api';

export interface DashboardStats {
  total_products: number;
  total_clients: number;
  total_sales: number;
  total_orders: number;
}

export const dashboardService = {
  /**
   * Get school summary with stats
   */
  async getSchoolSummary(schoolId: string): Promise<SchoolSummary> {
    const response = await apiClient.get<SchoolSummary>(`/schools/${schoolId}/summary`);
    return response.data;
  },

  /**
   * Get dashboard stats (simplified)
   */
  async getStats(schoolId: string): Promise<DashboardStats> {
    const summary = await this.getSchoolSummary(schoolId);
    return {
      total_products: summary.total_products,
      total_clients: summary.total_clients,
      total_sales: summary.total_sales,
      total_orders: 0, // TODO: Add to backend summary
    };
  },
};
