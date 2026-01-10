import apiClient, { Product, GarmentType } from '../api';

export interface CreateProductData {
  code: string;
  name: string;
  size: string;
  price: number;
  stock?: number;
  garment_type_id?: string;
  image_url?: string;
}

export interface UpdateProductData {
  code?: string;
  name?: string;
  size?: string;
  price?: number;
  garment_type_id?: string;
  image_url?: string;
  is_active?: boolean;
}

export interface InventoryAdjustment {
  adjustment_type: 'add' | 'remove' | 'set';
  quantity: number;
  reason?: string;
}

export interface CreateGarmentTypeData {
  name: string;
  description?: string;
  image_url?: string;
}

const productService = {
  // ========== School Products ==========

  // List products for a school
  listBySchool: async (schoolId: string, params?: { skip?: number; limit?: number }) => {
    const response = await apiClient.get<Product[]>(`/schools/${schoolId}/products`, { params });
    return response.data;
  },

  // Get product by ID
  getById: async (schoolId: string, productId: string) => {
    const response = await apiClient.get<Product>(`/schools/${schoolId}/products/${productId}`);
    return response.data;
  },

  // Create product for school
  create: async (schoolId: string, data: CreateProductData) => {
    const response = await apiClient.post<Product>(`/schools/${schoolId}/products`, data);
    return response.data;
  },

  // Update product
  update: async (schoolId: string, productId: string, data: UpdateProductData) => {
    const response = await apiClient.put<Product>(`/schools/${schoolId}/products/${productId}`, data);
    return response.data;
  },

  // Delete product
  delete: async (schoolId: string, productId: string) => {
    const response = await apiClient.delete(`/schools/${schoolId}/products/${productId}`);
    return response.data;
  },

  // Adjust inventory
  adjustInventory: async (schoolId: string, productId: string, data: InventoryAdjustment) => {
    const response = await apiClient.post(`/schools/${schoolId}/products/${productId}/inventory`, data);
    return response.data;
  },

  // ========== Global Products ==========

  // List global products
  listGlobal: async (params?: { skip?: number; limit?: number }) => {
    const response = await apiClient.get<Product[]>('/products/global', { params });
    return response.data;
  },

  // Create global product
  createGlobal: async (data: CreateProductData) => {
    const response = await apiClient.post<Product>('/products/global', data);
    return response.data;
  },

  // Update global product
  updateGlobal: async (productId: string, data: UpdateProductData) => {
    const response = await apiClient.put<Product>(`/products/global/${productId}`, data);
    return response.data;
  },

  // Delete global product
  deleteGlobal: async (productId: string) => {
    const response = await apiClient.delete(`/products/global/${productId}`);
    return response.data;
  },

  // ========== Garment Types ==========

  // List garment types for a school
  listGarmentTypes: async (schoolId: string) => {
    const response = await apiClient.get<GarmentType[]>(`/schools/${schoolId}/garment-types`);
    return response.data;
  },

  // Create garment type
  createGarmentType: async (schoolId: string, data: CreateGarmentTypeData) => {
    const response = await apiClient.post<GarmentType>(`/schools/${schoolId}/garment-types`, data);
    return response.data;
  },

  // Update garment type
  updateGarmentType: async (schoolId: string, garmentTypeId: string, data: CreateGarmentTypeData) => {
    const response = await apiClient.put<GarmentType>(`/schools/${schoolId}/garment-types/${garmentTypeId}`, data);
    return response.data;
  },

  // Delete garment type
  deleteGarmentType: async (schoolId: string, garmentTypeId: string) => {
    const response = await apiClient.delete(`/schools/${schoolId}/garment-types/${garmentTypeId}`);
    return response.data;
  },

  // List global garment types
  listGlobalGarmentTypes: async () => {
    const response = await apiClient.get<GarmentType[]>('/garment-types/global');
    return response.data;
  },
};

export default productService;
