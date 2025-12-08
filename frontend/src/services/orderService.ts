/**
 * Order Service - API calls for orders (encargos)
 */
import apiClient from '../utils/api-client';
import type { Order, OrderListItem, OrderWithItems, OrderCreate, OrderPayment, OrderStatus } from '../types/api';

export const orderService = {
  /**
   * Get all orders for a school
   */
  async getOrders(schoolId: string, status?: OrderStatus): Promise<OrderListItem[]> {
    const params = status ? { status_filter: status } : {};
    const response = await apiClient.get<OrderListItem[]>(`/schools/${schoolId}/orders`, { params });
    return response.data;
  },

  /**
   * Get a single order with items
   */
  async getOrder(schoolId: string, orderId: string): Promise<OrderWithItems> {
    const response = await apiClient.get<OrderWithItems>(`/schools/${schoolId}/orders/${orderId}`);
    return response.data;
  },

  /**
   * Create a new order
   */
  async createOrder(schoolId: string, data: OrderCreate): Promise<Order> {
    const response = await apiClient.post<Order>(`/schools/${schoolId}/orders`, data);
    return response.data;
  },

  /**
   * Update order status
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
   * Add payment to order
   */
  async addPayment(schoolId: string, orderId: string, payment: OrderPayment): Promise<Order> {
    const response = await apiClient.post<Order>(
      `/schools/${schoolId}/orders/${orderId}/payments`,
      payment
    );
    return response.data;
  },
};
