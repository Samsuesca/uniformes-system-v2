/**
 * School Service - API calls for schools
 */
import apiClient from '../utils/api-client';

export interface School {
  id: string;
  code: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  is_active: boolean;
  created_at: string;
}

export const schoolService = {
  /**
   * Get all active schools
   */
  async getSchools(): Promise<School[]> {
    const response = await apiClient.get<School[]>('/schools');
    return response.data;
  },

  /**
   * Get a specific school by ID
   */
  async getSchool(schoolId: string): Promise<School> {
    const response = await apiClient.get<School>(`/schools/${schoolId}`);
    return response.data;
  },

  /**
   * Search schools by name
   */
  async searchSchools(name: string, limit = 10): Promise<School[]> {
    const response = await apiClient.get<School[]>('/schools/search/by-name', {
      params: { name, limit }
    });
    return response.data;
  },
};
