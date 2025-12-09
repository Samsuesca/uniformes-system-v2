/**
 * Order Service - API calls for orders (encargos)
 *
 * Two types of endpoints:
 * - Multi-school: /orders - Lists from ALL schools user has access to
 * - School-specific: /schools/{school_id}/orders - Original endpoints
 */
import apiClient from '../utils/api-client';
import type { Order, OrderListItem, OrderWithItems, OrderCreate, OrderPayment, OrderStatus } from '../types/api';

export interface OrderFilters {
  school_id?: string;
  status?: OrderStatus;
  search?: string;
  skip?: number;
  limit?: number;
}

export const orderService = {
  /**
   * Get all orders from ALL schools user has access to (multi-school)
   */
  async getAllOrders(filters?: OrderFilters): Promise<OrderListItem[]> {
    const params = new URLSearchParams();
    if (filters?.school_id) params.append('school_id', filters.school_id);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.skip) params.append('skip', String(filters.skip));
    if (filters?.limit) params.append('limit', String(filters.limit));

    const queryString = params.toString();
    const url = queryString ? `/orders?${queryString}` : '/orders';
    const response = await apiClient.get<OrderListItem[]>(url);
    return response.data;
  },

  /**
   * Get all orders for a school (backwards compatible)
   * Uses multi-school endpoint with school filter
   */
  async getOrders(schoolId?: string, status?: OrderStatus): Promise<OrderListItem[]> {
    const filters: OrderFilters = {};
    if (schoolId) filters.school_id = schoolId;
    if (status) filters.status = status;
    return this.getAllOrders(filters);
  },

  /**
   * Get a single order by ID (from any accessible school)
   */
  async getOrderById(orderId: string): Promise<Order> {
    const response = await apiClient.get<Order>(`/orders/${orderId}`);
    return response.data;
  },

  /**
   * Get a single order with items (school-specific)
   */
  async getOrder(schoolId: string, orderId: string): Promise<OrderWithItems> {
    const response = await apiClient.get<OrderWithItems>(`/schools/${schoolId}/orders/${orderId}`);
    return response.data;
  },

  /**
   * Create a new order (school-specific)
   */
  async createOrder(schoolId: string, data: OrderCreate): Promise<Order> {
    const response = await apiClient.post<Order>(`/schools/${schoolId}/orders`, data);
    return response.data;
  },

  /**
   * Update order status (school-specific)
   */
  async updateStatus(schoolId: string, orderId: string, status: OrderStatus): Promise<Order> {
    const response = await apiClient.patch<Order>(
      `/schools/${schoolId}/orders/${orderId}/status`,
      null,
      { params: { new_status: status } }
    );
    return response.data;
  },

  /**
   * Add payment to order (school-specific)
   */
  async addPayment(schoolId: string, orderId: string, payment: OrderPayment): Promise<Order> {
    const response = await apiClient.post<Order>(
      `/schools/${schoolId}/orders/${orderId}/payments`,
      payment
    );
    return response.data;
  },
};
