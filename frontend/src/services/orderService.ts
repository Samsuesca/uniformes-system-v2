/**
 * Order Service - API calls for orders (encargos)
 *
 * Two types of endpoints:
 * - Multi-school: /orders - Lists from ALL schools user has access to
 * - School-specific: /schools/{school_id}/orders - Original endpoints
 */
import apiClient from '../utils/api-client';
import type { Order, OrderListItem, OrderWithItems, OrderCreate, OrderPayment, OrderStatus, OrderItemStatus, OrderItem } from '../types/api';

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

  /**
   * Update order details (delivery_date, notes) - school-specific
   */
  async updateOrder(schoolId: string, orderId: string, data: { delivery_date?: string; notes?: string }): Promise<Order> {
    const response = await apiClient.patch<Order>(
      `/schools/${schoolId}/orders/${orderId}`,
      data
    );
    return response.data;
  },

  /**
   * Update individual order item status (school-specific)
   *
   * Allows tracking progress of individual items within an order.
   * For example: a catalog item may be ready while a yomber is still in production.
   */
  async updateItemStatus(
    schoolId: string,
    orderId: string,
    itemId: string,
    status: OrderItemStatus
  ): Promise<OrderItem> {
    const response = await apiClient.patch<OrderItem>(
      `/schools/${schoolId}/orders/${orderId}/items/${itemId}/status`,
      { item_status: status }
    );
    return response.data;
  },

  /**
   * Verify stock availability for all items in an order
   *
   * Returns detailed information about which items can be fulfilled from
   * current inventory vs which need to be produced.
   */
  async verifyOrderStock(schoolId: string, orderId: string): Promise<OrderStockVerification> {
    const response = await apiClient.get<OrderStockVerification>(
      `/schools/${schoolId}/orders/${orderId}/stock-verification`
    );
    return response.data;
  },

  /**
   * Approve/process a web order with intelligent stock handling
   *
   * This endpoint:
   * 1. Checks stock availability for each item
   * 2. For items WITH stock: marks as READY and decrements inventory
   * 3. For items WITHOUT stock: marks as IN_PRODUCTION
   */
  async approveOrderWithStock(
    schoolId: string,
    orderId: string,
    options?: {
      auto_fulfill_if_stock?: boolean;
      items?: Array<{
        item_id: string;
        action: 'fulfill' | 'produce' | 'auto';
        product_id?: string;
        quantity_from_stock?: number;
      }>;
    }
  ): Promise<Order> {
    const response = await apiClient.post<Order>(
      `/schools/${schoolId}/orders/${orderId}/approve`,
      {
        auto_fulfill_if_stock: options?.auto_fulfill_if_stock ?? true,
        items: options?.items || [],
        notify_client: true
      }
    );
    return response.data;
  },
};

// Types for stock verification
export interface OrderItemStockInfo {
  item_id: string;
  garment_type_id: string;
  garment_type_name: string;
  size: string | null;
  color: string | null;
  quantity_requested: number;
  product_id: string | null;
  product_code: string | null;
  stock_available: number;
  can_fulfill_from_stock: boolean;
  quantity_from_stock: number;
  quantity_to_produce: number;
  suggested_action: 'fulfill' | 'partial' | 'produce';
  has_custom_measurements: boolean;
  item_status: string;
}

export interface OrderStockVerification {
  order_id: string;
  order_code: string;
  order_status: string;
  items: OrderItemStockInfo[];
  total_items: number;
  items_in_stock: number;
  items_partial: number;
  items_to_produce: number;
  can_fulfill_completely: boolean;
  suggested_action: 'approve_all' | 'partial' | 'produce_all' | 'review';
}

class OrderService {
  /**
   * Approve payment proof for an order
   */
  async approvePayment(schoolId: string, orderId: string): Promise<any> {
    const response = await apiClient.post(`/schools/${schoolId}/orders/${orderId}/approve-payment`);
    return response.data;
  }

  /**
   * Reject payment proof for an order
   */
  async rejectPayment(schoolId: string, orderId: string, rejectionNotes: string): Promise<any> {
    const response = await apiClient.post(
      `/schools/${schoolId}/orders/${orderId}/reject-payment`,
      null,
      { params: { rejection_notes: rejectionNotes } }
    );
    return response.data;
  }
}

export const orderService = new OrderService();
