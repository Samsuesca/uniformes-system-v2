import apiClient, {
  Order,
  OrderWithItems,
  OrderItem,
  OrderPayment,
  OrderStatus,
  OrderItemStatus,
  PaymentMethod,
} from '../api';

export interface OrderListParams {
  school_id?: string;
  status?: string;
  search?: string;
  skip?: number;
  limit?: number;
}

export interface CreateOrderItemData {
  garment_type_id?: string;
  product_id?: string;
  quantity: number;
  unit_price: number;
  custom_measurements?: Record<string, any>;
  embroidery_text?: string;
  needs_quotation?: boolean;
  reserve_stock?: boolean;
  notes?: string;
}

export interface CreateOrderData {
  client_id?: string;
  items: CreateOrderItemData[];
  advance_payment?: number;
  advance_payment_method?: PaymentMethod;
  delivery_date?: string;
  delivery_type?: 'pickup' | 'delivery';
  delivery_zone_id?: string;
  notes?: string;
  source?: string;
}

export interface UpdateOrderData {
  delivery_date?: string;
  notes?: string;
  status?: OrderStatus;
}

export interface AddOrderPaymentData {
  amount: number;
  payment_method: PaymentMethod;
  reference?: string;
}

export interface OrderApprovalData {
  auto_fulfill?: boolean;
  items_action?: Record<string, 'fulfill' | 'produce' | 'skip'>;
}

export interface StockVerificationItem {
  item_id: string;
  product_id?: string;
  product_name?: string;
  quantity_needed: number;
  quantity_available: number;
  can_fulfill: boolean;
}

export interface StockVerification {
  order_id: string;
  can_auto_fulfill: boolean;
  items: StockVerificationItem[];
}

const ordersService = {
  // List orders (multi-school)
  list: async (params?: OrderListParams): Promise<Order[]> => {
    const response = await apiClient.get<Order[]>('/orders', { params });
    return response.data;
  },

  // Get order by ID
  getById: async (id: string): Promise<Order> => {
    const response = await apiClient.get<Order>(`/orders/${id}`);
    return response.data;
  },

  // Get order with items
  getWithItems: async (schoolId: string, orderId: string): Promise<OrderWithItems> => {
    const response = await apiClient.get<OrderWithItems>(
      `/schools/${schoolId}/orders/${orderId}`
    );
    return response.data;
  },

  // Create order
  create: async (schoolId: string, data: CreateOrderData): Promise<Order> => {
    const response = await apiClient.post<Order>(`/schools/${schoolId}/orders`, data);
    return response.data;
  },

  // Update order
  update: async (
    schoolId: string,
    orderId: string,
    data: UpdateOrderData
  ): Promise<Order> => {
    const response = await apiClient.patch<Order>(
      `/schools/${schoolId}/orders/${orderId}`,
      data
    );
    return response.data;
  },

  // Update order status
  updateStatus: async (
    schoolId: string,
    orderId: string,
    status: OrderStatus
  ): Promise<Order> => {
    const response = await apiClient.patch<Order>(
      `/schools/${schoolId}/orders/${orderId}/status`,
      { status }
    );
    return response.data;
  },

  // Update individual item status
  updateItemStatus: async (
    schoolId: string,
    orderId: string,
    itemId: string,
    status: OrderItemStatus
  ): Promise<OrderItem> => {
    const response = await apiClient.patch<OrderItem>(
      `/schools/${schoolId}/orders/${orderId}/items/${itemId}/status`,
      { status }
    );
    return response.data;
  },

  // Add payment to order
  addPayment: async (
    schoolId: string,
    orderId: string,
    data: AddOrderPaymentData
  ): Promise<OrderPayment> => {
    const response = await apiClient.post<OrderPayment>(
      `/schools/${schoolId}/orders/${orderId}/payments`,
      data
    );
    return response.data;
  },

  // Verify stock availability
  verifyStock: async (
    schoolId: string,
    orderId: string
  ): Promise<StockVerification> => {
    const response = await apiClient.get<StockVerification>(
      `/schools/${schoolId}/orders/${orderId}/stock-verification`
    );
    return response.data;
  },

  // Approve order
  approve: async (
    schoolId: string,
    orderId: string,
    data?: OrderApprovalData
  ): Promise<Order> => {
    const response = await apiClient.post<Order>(
      `/schools/${schoolId}/orders/${orderId}/approve`,
      data || {}
    );
    return response.data;
  },

  // Cancel order
  cancel: async (schoolId: string, orderId: string): Promise<Order> => {
    const response = await apiClient.post<Order>(
      `/schools/${schoolId}/orders/${orderId}/cancel`
    );
    return response.data;
  },

  // Get receipt HTML
  getReceipt: async (schoolId: string, orderId: string): Promise<string> => {
    const response = await apiClient.get<string>(
      `/schools/${schoolId}/orders/${orderId}/receipt`,
      { responseType: 'text' as any }
    );
    return response.data;
  },
};

export default ordersService;
