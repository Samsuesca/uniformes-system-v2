/**
 * Product Service - API calls for products
 */
import apiClient from '../utils/api-client';
import type { Product, GarmentType, GlobalProduct, GlobalGarmentType } from '../types/api';

export const productService = {
  /**
   * Get all products for a school
   */
  async getProducts(schoolId: string, withInventory: boolean = true, limit: number = 500): Promise<Product[]> {
    const response = await apiClient.get<Product[]>(`/schools/${schoolId}/products`, {
      params: { with_inventory: withInventory, limit }
    });
    return response.data;
  },

  /**
   * Get a single product by ID
   */
  async getProduct(schoolId: string, productId: string): Promise<Product> {
    const response = await apiClient.get<Product>(`/schools/${schoolId}/products/${productId}`);
    return response.data;
  },

  /**
   * Create a new product
   */
  async createProduct(schoolId: string, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.post<Product>(`/schools/${schoolId}/products`, data);
    return response.data;
  },

  /**
   * Update a product
   */
  async updateProduct(schoolId: string, productId: string, data: Partial<Product>): Promise<Product> {
    const response = await apiClient.put<Product>(`/schools/${schoolId}/products/${productId}`, data);
    return response.data;
  },

  /**
   * Delete a product (soft delete)
   */
  async deleteProduct(schoolId: string, productId: string): Promise<void> {
    await apiClient.delete(`/schools/${schoolId}/products/${productId}`);
  },

  /**
   * Get all garment types for a school
   */
  async getGarmentTypes(schoolId: string): Promise<GarmentType[]> {
    const response = await apiClient.get<GarmentType[]>(`/schools/${schoolId}/garment-types`);
    return response.data;
  },

  /**
   * Create a new garment type
   */
  async createGarmentType(schoolId: string, data: Partial<GarmentType>): Promise<GarmentType> {
    const response = await apiClient.post<GarmentType>(`/schools/${schoolId}/garment-types`, data);
    return response.data;
  },

  // ============================================
  // Global Products (shared across all schools)
  // ============================================

  /**
   * Get all global products with inventory
   */
  async getGlobalProducts(withInventory: boolean = true, limit: number = 500): Promise<GlobalProduct[]> {
    const response = await apiClient.get<GlobalProduct[]>('/global/products', {
      params: { with_inventory: withInventory, limit }
    });
    return response.data;
  },

  /**
   * Get a single global product by ID
   */
  async getGlobalProduct(productId: string): Promise<GlobalProduct> {
    const response = await apiClient.get<GlobalProduct>(`/global/products/${productId}`);
    return response.data;
  },

  /**
   * Search global products
   */
  async searchGlobalProducts(query: string, limit: number = 20): Promise<GlobalProduct[]> {
    const response = await apiClient.get<GlobalProduct[]>('/global/products/search', {
      params: { q: query, limit }
    });
    return response.data;
  },

  /**
   * Get all global garment types
   */
  async getGlobalGarmentTypes(activeOnly: boolean = true): Promise<GlobalGarmentType[]> {
    const response = await apiClient.get<GlobalGarmentType[]>('/global/garment-types', {
      params: { active_only: activeOnly }
    });
    return response.data;
  },

  /**
   * Adjust global inventory (superuser only)
   */
  async adjustGlobalInventory(productId: string, adjustment: number, reason?: string): Promise<void> {
    await apiClient.post(`/global/products/${productId}/inventory/adjust`, {
      adjustment,
      reason: reason || `Ajuste manual: ${adjustment > 0 ? 'Agregar' : 'Remover'} ${Math.abs(adjustment)} unidades`
    });
  },
};
