/**
 * Sale Change Service - API calls for sale changes/returns
 */
import apiClient from '../utils/api-client';
import type { SaleChange, SaleChangeCreate, SaleChangeListItem } from '../types/api';

export const saleChangeService = {
  /**
   * Create a new sale change request
   */
  async createChange(
    schoolId: string,
    saleId: string,
    data: SaleChangeCreate
  ): Promise<SaleChange> {
    const response = await apiClient.post<SaleChange>(
      `/schools/${schoolId}/sales/${saleId}/changes`,
      data
    );
    return response.data;
  },

  /**
   * Get all changes for a specific sale
   */
  async getSaleChanges(schoolId: string, saleId: string): Promise<SaleChangeListItem[]> {
    const response = await apiClient.get<SaleChangeListItem[]>(
      `/schools/${schoolId}/sales/${saleId}/changes`
    );
    return response.data;
  },

  /**
   * Approve a sale change request (ADMIN only)
   * @param paymentMethod - Payment method for refunds/additional payments (cash, nequi, transfer, card)
   */
  async approveChange(
    schoolId: string,
    saleId: string,
    changeId: string,
    paymentMethod?: 'cash' | 'nequi' | 'transfer' | 'card'
  ): Promise<SaleChange> {
    const data = paymentMethod ? { payment_method: paymentMethod } : undefined;
    const response = await apiClient.patch<SaleChange>(
      `/schools/${schoolId}/sales/${saleId}/changes/${changeId}/approve`,
      data
    );
    return response.data;
  },

  /**
   * Reject a sale change request (ADMIN only)
   */
  async rejectChange(
    schoolId: string,
    saleId: string,
    changeId: string,
    rejectionReason: string
  ): Promise<SaleChange> {
    const response = await apiClient.patch<SaleChange>(
      `/schools/${schoolId}/sales/${saleId}/changes/${changeId}/reject`,
      { rejection_reason: rejectionReason }
    );
    return response.data;
  },
};
