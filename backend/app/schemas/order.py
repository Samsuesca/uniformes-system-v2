"""
Order and OrderItem Schemas (Encargos/Yombers)
"""
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema
from app.models.order import OrderStatus, OrderItemStatus
from app.models.sale import SaleSource


# ============================================
# OrderItem Schemas
# ============================================

class OrderItemBase(BaseSchema):
    """Base order item schema"""
    garment_type_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    subtotal: Decimal = Field(..., ge=0)
    size: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    custom_measurements: dict | None = None
    embroidery_text: str | None = Field(None, max_length=100)
    notes: str | None = None

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        """Validate gender field"""
        if v and v not in ['unisex', 'male', 'female']:
            raise ValueError('Gender must be: unisex, male, or female')
        return v

    @field_validator('custom_measurements')
    @classmethod
    def validate_measurements(cls, v: dict | None) -> dict | None:
        """Validate custom measurements structure"""
        if v:
            allowed_keys = {
                'delantero', 'trasero', 'espalda', 'cintura', 'largo',
                'cadera', 'pierna', 'entrepierna', 'hombro', 'manga',
                'cuello', 'pecho', 'busto', 'tiro'
            }
            for key in v.keys():
                if key not in allowed_keys:
                    raise ValueError(f'Invalid measurement key: {key}')
            # Validate values are positive numbers
            for key, value in v.items():
                if not isinstance(value, (int, float)) or value <= 0:
                    raise ValueError(f'Measurement {key} must be a positive number')
        return v


class OrderItemCreate(BaseSchema):
    """Schema for creating order item"""
    garment_type_id: UUID
    quantity: int = Field(..., gt=0)

    # Order type: "catalog" | "yomber" | "custom"
    order_type: str = Field(default="custom")

    # For catalog/yomber orders - select specific product for price
    product_id: UUID | None = None

    # For custom orders - manual price
    unit_price: Decimal | None = Field(None, ge=0)

    # Additional services price (mainly for yomber)
    additional_price: Decimal | None = Field(None, ge=0)

    # Common fields
    size: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    custom_measurements: dict | None = None
    embroidery_text: str | None = Field(None, max_length=100)
    notes: str | None = None

    @field_validator('order_type')
    @classmethod
    def validate_order_type(cls, v: str) -> str:
        """Validate order type field"""
        valid_types = ['catalog', 'yomber', 'custom']
        if v not in valid_types:
            raise ValueError(f'Order type must be one of: {", ".join(valid_types)}')
        return v


class OrderItemUpdate(BaseSchema):
    """Schema for updating order item"""
    quantity: int | None = Field(None, gt=0)
    size: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    custom_measurements: dict | None = None
    embroidery_text: str | None = Field(None, max_length=100)
    notes: str | None = None


class OrderItemStatusUpdate(BaseSchema):
    """Schema for updating order item status"""
    item_status: OrderItemStatus


class OrderItemInDB(OrderItemBase, SchoolIsolatedSchema, IDModelSchema):
    """OrderItem as stored in database"""
    order_id: UUID
    item_status: OrderItemStatus = OrderItemStatus.PENDING
    status_updated_at: datetime | None = None


class OrderItemResponse(OrderItemInDB):
    """OrderItem for API responses"""
    pass


class OrderItemWithGarment(OrderItemResponse):
    """OrderItem with garment type information"""
    garment_type_name: str
    garment_type_category: str | None
    requires_embroidery: bool
    has_custom_measurements: bool


# ============================================
# Order Schemas
# ============================================

class OrderBase(BaseSchema):
    """Base order schema"""
    client_id: UUID
    delivery_date: date | None = None
    notes: str | None = None


class OrderCreate(OrderBase, SchoolIsolatedSchema):
    """Schema for creating order"""
    items: list[OrderItemCreate] = Field(..., min_length=1)
    advance_payment: Decimal | None = Field(None, ge=0)
    advance_payment_method: str | None = Field(None, max_length=20)  # cash, nequi, transfer, card
    source: SaleSource = SaleSource.DESKTOP_APP  # Default to desktop app
    # Payment proof (for web orders)
    payment_proof_url: str | None = Field(None, max_length=500)
    payment_notes: str | None = None
    # code, status, totals will be auto-generated


class OrderUpdate(BaseSchema):
    """Schema for updating order"""
    delivery_date: date | None = None
    status: OrderStatus | None = None
    notes: str | None = None


class OrderPayment(BaseSchema):
    """Schema for recording order payment"""
    amount: Decimal = Field(..., gt=0)
    payment_method: str = Field(..., max_length=20)
    payment_reference: str | None = Field(None, max_length=100)
    notes: str | None = None


class OrderInDB(OrderBase, SchoolIsolatedSchema, IDModelSchema, TimestampSchema):
    """Order as stored in database"""
    code: str
    status: OrderStatus
    source: SaleSource | None = None  # Optional for backwards compatibility with old orders
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    paid_amount: Decimal
    balance: Decimal  # Computed column
    user_id: UUID | None = None  # Who created the order (None for web portal)
    payment_proof_url: str | None = None
    payment_notes: str | None = None


class OrderResponse(OrderInDB):
    """Order for API responses"""
    pass


class OrderWithItems(OrderResponse):
    """Order with all items"""
    items: list[OrderItemWithGarment]
    client_name: str
    client_phone: str | None
    student_name: str | None


class OrderListResponse(BaseSchema):
    """Simplified order response for listings (multi-school support)"""
    id: UUID
    code: str
    status: OrderStatus
    source: SaleSource | None = None
    client_name: str | None = None
    student_name: str | None = None
    delivery_date: date | None = None
    total: Decimal
    balance: Decimal
    created_at: datetime
    items_count: int = 0
    # Track who created the order
    user_id: UUID | None = None
    user_name: str | None = None
    # Multi-school support
    school_id: UUID | None = None
    school_name: str | None = None
    # Partial delivery tracking
    items_delivered: int = 0
    items_total: int = 0


# ============================================
# Order Analytics Schemas
# ============================================

class OrdersReport(BaseSchema):
    """Orders summary report"""
    total_orders: int
    total_value: Decimal
    total_paid: Decimal
    total_balance: Decimal
    orders_by_status: dict[str, int]  # {"pending": 10, "in_production": 5, ...}
    overdue_orders: int


class PendingOrder(BaseSchema):
    """Order with pending balance"""
    order_id: UUID
    order_code: str
    client_name: str
    student_name: str | None
    total: Decimal
    paid_amount: Decimal
    balance: Decimal
    delivery_date: date | None
    days_pending: int


class OrdersByClient(BaseSchema):
    """Client orders summary"""
    client_id: UUID
    client_name: str
    total_orders: int
    pending_orders: int
    completed_orders: int
    total_value: Decimal
    pending_balance: Decimal


class ProductionSchedule(BaseSchema):
    """Orders grouped by delivery date"""
    delivery_date: date
    orders_count: int
    total_items: int
    order_codes: list[str]


# ============================================
# Web Portal Schemas
# ============================================

class WebOrderResponse(BaseSchema):
    """Simplified order response for web portal (no user_id required)"""
    id: UUID
    code: str
    status: OrderStatus
    total: Decimal
    created_at: datetime | None = None
    payment_proof_url: str | None = None
    payment_notes: str | None = None
    message: str = "Pedido creado exitosamente"


# ============================================
# Order Stock Verification Schemas
# ============================================

class OrderItemStockInfo(BaseSchema):
    """Stock information for an order item"""
    item_id: UUID
    garment_type_id: UUID
    garment_type_name: str
    size: str | None
    color: str | None
    quantity_requested: int
    # Product match info
    product_id: UUID | None = None
    product_code: str | None = None
    stock_available: int = 0
    can_fulfill_from_stock: bool = False
    # Quantities
    quantity_from_stock: int = 0  # How many can be taken from stock
    quantity_to_produce: int = 0  # How many need to be produced
    # Status suggestion
    suggested_action: str = "produce"  # "fulfill" | "partial" | "produce"


class OrderStockVerification(BaseSchema):
    """Stock verification result for an entire order"""
    order_id: UUID
    order_code: str
    items: list[OrderItemStockInfo]
    # Summary
    total_items: int = 0
    items_in_stock: int = 0  # Items that can be fully fulfilled
    items_partial: int = 0   # Items that can be partially fulfilled
    items_to_produce: int = 0  # Items that need production
    can_fulfill_completely: bool = False
    suggested_action: str = "review"  # "approve_all" | "partial" | "produce_all" | "review"


class OrderItemApprovalAction(BaseSchema):
    """Action for a specific item during approval"""
    item_id: UUID
    action: str = "auto"  # "fulfill" | "produce" | "auto"
    # If fulfilling from stock, specify product
    product_id: UUID | None = None
    quantity_from_stock: int | None = None


class OrderApprovalRequest(BaseSchema):
    """Request to approve/process a web order"""
    # Items actions - if empty, use auto-detection
    items: list[OrderItemApprovalAction] = []
    # Global options
    auto_fulfill_if_stock: bool = True  # Automatically fulfill items with stock
    notify_client: bool = True  # Send notification to client
