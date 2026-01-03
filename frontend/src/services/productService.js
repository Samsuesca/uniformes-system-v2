/**
 * Product Service - API calls for products
 *
 * Two types of endpoints:
 * - Multi-school: /products - Lists from ALL schools user has access to
 * - School-specific: /schools/{school_id}/products - Original endpoints
 */
import apiClient from '../utils/api-client';
export const productService = {
    /**
     * Get all products from ALL schools user has access to (multi-school)
     */
    async getAllProducts(filters) {
        const params = new URLSearchParams();
        if (filters?.school_id)
            params.append('school_id', filters.school_id);
        if (filters?.garment_type_id)
            params.append('garment_type_id', filters.garment_type_id);
        if (filters?.search)
            params.append('search', filters.search);
        if (filters?.active_only !== undefined)
            params.append('active_only', String(filters.active_only));
        if (filters?.with_stock !== undefined)
            params.append('with_stock', String(filters.with_stock));
        if (filters?.skip)
            params.append('skip', String(filters.skip));
        if (filters?.limit)
            params.append('limit', String(filters.limit));
        const queryString = params.toString();
        const url = queryString ? `/products?${queryString}` : '/products';
        const response = await apiClient.get(url);
        return response.data;
    },
    /**
     * Get all products for a school (backwards compatible)
     * Uses multi-school endpoint with school filter
     */
    async getProducts(schoolId, withInventory = true, limit = 500) {
        if (schoolId) {
            return this.getAllProducts({
                school_id: schoolId,
                with_stock: withInventory,
                limit
            });
        }
        return this.getAllProducts({ with_stock: withInventory, limit });
    },
    /**
     * Get a single product by ID (from any accessible school)
     */
    async getProductById(productId) {
        const response = await apiClient.get(`/products/${productId}`);
        return response.data;
    },
    /**
     * Get a single product by ID (school-specific)
     */
    async getProduct(schoolId, productId) {
        const response = await apiClient.get(`/schools/${schoolId}/products/${productId}`);
        return response.data;
    },
    /**
     * Create a new product (school-specific)
     */
    async createProduct(schoolId, data) {
        const response = await apiClient.post(`/schools/${schoolId}/products`, data);
        return response.data;
    },
    /**
     * Update a product (school-specific)
     */
    async updateProduct(schoolId, productId, data) {
        const response = await apiClient.put(`/schools/${schoolId}/products/${productId}`, data);
        return response.data;
    },
    /**
     * Delete a product (soft delete)
     */
    async deleteProduct(schoolId, productId) {
        await apiClient.delete(`/schools/${schoolId}/products/${productId}`);
    },
    /**
     * Get all garment types from ALL schools (multi-school)
     */
    async getAllGarmentTypes(filters) {
        const params = new URLSearchParams();
        if (filters?.school_id)
            params.append('school_id', filters.school_id);
        if (filters?.active_only !== undefined)
            params.append('active_only', String(filters.active_only));
        const queryString = params.toString();
        const url = queryString ? `/garment-types?${queryString}` : '/garment-types';
        const response = await apiClient.get(url);
        return response.data;
    },
    /**
     * Get all garment types for a school (backwards compatible)
     */
    async getGarmentTypes(schoolId) {
        if (schoolId) {
            return this.getAllGarmentTypes({ school_id: schoolId });
        }
        return this.getAllGarmentTypes();
    },
    /**
     * Create a new garment type (school-specific)
     */
    async createGarmentType(schoolId, data) {
        const response = await apiClient.post(`/schools/${schoolId}/garment-types`, data);
        return response.data;
    },
    // ============================================
    // Global Products (shared across all schools)
    // ============================================
    /**
     * Get all global products with inventory
     */
    async getGlobalProducts(withInventory = true, limit = 500) {
        const response = await apiClient.get('/global/products', {
            params: { with_inventory: withInventory, limit }
        });
        return response.data;
    },
    /**
     * Get a single global product by ID
     */
    async getGlobalProduct(productId) {
        const response = await apiClient.get(`/global/products/${productId}`);
        return response.data;
    },
    /**
     * Search global products
     */
    async searchGlobalProducts(query, limit = 20) {
        const response = await apiClient.get('/global/products/search', {
            params: { q: query, limit }
        });
        return response.data;
    },
    /**
     * Get all global garment types
     */
    async getGlobalGarmentTypes(activeOnly = true) {
        const response = await apiClient.get('/global/garment-types', {
            params: { active_only: activeOnly }
        });
        return response.data;
    },
    /**
     * Adjust global inventory (superuser only)
     */
    async adjustGlobalInventory(productId, adjustment, reason) {
        await apiClient.post(`/global/products/${productId}/inventory/adjust`, {
            adjustment,
            reason: reason || `Ajuste manual: ${adjustment > 0 ? 'Agregar' : 'Remover'} ${Math.abs(adjustment)} unidades`
        });
    },
    // ==========================================
    // GLOBAL PRODUCTS - CRUD
    // ==========================================
    /**
     * Create global product (superuser only)
     */
    async createGlobalProduct(data) {
        const response = await apiClient.post('/global/products', data);
        return response.data;
    },
    /**
     * Update global product (superuser only)
     */
    async updateGlobalProduct(productId, data) {
        const response = await apiClient.put(`/global/products/${productId}`, data);
        return response.data;
    },
    // ==========================================
    // GLOBAL GARMENT TYPES - CRUD
    // ==========================================
    /**
     * Create global garment type (superuser only)
     */
    async createGlobalGarmentType(data) {
        const response = await apiClient.post('/global/garment-types', data);
        return response.data;
    },
    /**
     * Update global garment type (superuser only)
     */
    async updateGlobalGarmentType(typeId, data) {
        const response = await apiClient.put(`/global/garment-types/${typeId}`, data);
        return response.data;
    },
    // ==========================================
    // SCHOOL GARMENT TYPES - UPDATE (missing)
    // ==========================================
    /**
     * Update garment type for school (admin only)
     */
    async updateGarmentType(schoolId, typeId, data) {
        const response = await apiClient.put(`/schools/${schoolId}/garment-types/${typeId}`, data);
        return response.data;
    },

    // ==========================================
    // GARMENT TYPE IMAGES
    // ==========================================

    /**
     * Get all images for a garment type
     */
    async getGarmentTypeImages(schoolId, garmentTypeId) {
        const response = await apiClient.get(`/schools/${schoolId}/garment-types/${garmentTypeId}/images`);
        return response.data;
    },

    /**
     * Upload a new image for a garment type
     * @param {string} schoolId - School ID
     * @param {string} garmentTypeId - Garment type ID
     * @param {File} file - Image file to upload
     */
    async uploadGarmentTypeImage(schoolId, garmentTypeId, file) {
        const response = await apiClient.uploadFile(
            `/schools/${schoolId}/garment-types/${garmentTypeId}/images`,
            file,
            'file'
        );
        return response.data;
    },

    /**
     * Delete an image from a garment type
     */
    async deleteGarmentTypeImage(schoolId, garmentTypeId, imageId) {
        await apiClient.delete(`/schools/${schoolId}/garment-types/${garmentTypeId}/images/${imageId}`);
    },

    /**
     * Set an image as the primary image for a garment type
     */
    async setGarmentTypePrimaryImage(schoolId, garmentTypeId, imageId) {
        const response = await apiClient.put(
            `/schools/${schoolId}/garment-types/${garmentTypeId}/images/${imageId}/primary`
        );
        return response.data;
    },

    /**
     * Reorder images for a garment type
     * @param {string} schoolId - School ID
     * @param {string} garmentTypeId - Garment type ID
     * @param {string[]} imageIds - Array of image IDs in new order
     */
    async reorderGarmentTypeImages(schoolId, garmentTypeId, imageIds) {
        const response = await apiClient.put(
            `/schools/${schoolId}/garment-types/${garmentTypeId}/images/reorder`,
            { image_ids: imageIds }
        );
        return response.data;
    },
};
