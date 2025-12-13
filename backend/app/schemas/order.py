"""
Order and OrderItem Schemas (Encargos/Yombers)
"""
from uuid import UUID
from decimal import Decimal
from datetime import date, datetime
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema
from app.models.order import OrderStatus
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
    unit_price: Decimal | None = Field(None, ge=0)  # Optional, will use product price if not provided
    size: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    custom_measurements: dict | None = None
    embroidery_text: str | None = Field(None, max_length=100)
    notes: str | None = None


class OrderItemUpdate(BaseSchema):
    """Schema for updating order item"""
    quantity: int | None = Field(None, gt=0)
    size: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    custom_measurements: dict | None = None
    embroidery_text: str | None = Field(None, max_length=100)
    notes: str | None = None


class OrderItemInDB(OrderItemBase, SchoolIsolatedSchema, IDModelSchema):
    """OrderItem as stored in database"""
    order_id: UUID


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
    source: SaleSource = SaleSource.DESKTOP_APP  # Default to desktop app
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
    source: SaleSource
    subtotal: Decimal
    tax: Decimal
    total: Decimal
    paid_amount: Decimal
    balance: Decimal  # Computed column
    user_id: UUID | None = None  # Who created the order (None for web portal)


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
    message: str = "Pedido creado exitosamente"
