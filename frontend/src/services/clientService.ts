/**
 * Client Service - API calls for clients
 */
import apiClient from '../utils/api-client';
import type { Client } from '../types/api';

export const clientService = {
  /**
   * Get all clients for a school
   */
  async getClients(schoolId: string): Promise<Client[]> {
    const response = await apiClient.get<Client[]>(`/schools/${schoolId}/clients`);
    return response.data;
  },

  /**
   * Get a single client by ID
   */
  async getClient(schoolId: string, clientId: string): Promise<Client> {
    const response = await apiClient.get<Client>(`/schools/${schoolId}/clients/${clientId}`);
    return response.data;
  },

  /**
   * Create a new client
   */
  async createClient(schoolId: string, data: Partial<Client>): Promise<Client> {
    const response = await apiClient.post<Client>(`/schools/${schoolId}/clients`, data);
    return response.data;
  },

  /**
   * Update a client
   */
  async updateClient(schoolId: string, clientId: string, data: Partial<Client>): Promise<Client> {
    const response = await apiClient.patch<Client>(`/schools/${schoolId}/clients/${clientId}`, data);
    return response.data;
  },

  /**
   * Delete a client (soft delete)
   */
  async deleteClient(schoolId: string, clientId: string): Promise<void> {
    await apiClient.delete(`/schools/${schoolId}/clients/${clientId}`);
  },
};
