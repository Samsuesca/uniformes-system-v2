"""
Sale and SaleItem Schemas
"""
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import Field, field_validator, model_validator
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema
from app.models.sale import SaleStatus, PaymentMethod, ChangeStatus, ChangeType, SaleSource


# ============================================
# SaleItem Schemas
# ============================================

class SaleItemBase(BaseSchema):
    """Base sale item schema"""
    product_id: UUID | None = None
    global_product_id: UUID | None = None
    is_global_product: bool = False
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    subtotal: Decimal = Field(..., ge=0)


class SaleItemCreate(BaseSchema):
    """Schema for creating sale item (simplified input)"""
    product_id: UUID
    quantity: int = Field(..., gt=0)
    is_global: bool = False  # True if product is from global inventory
    # unit_price and subtotal will be calculated from product


class SaleItemInDB(SaleItemBase, IDModelSchema):
    """SaleItem as stored in database"""
    sale_id: UUID


class SaleItemResponse(SaleItemInDB):
    """SaleItem for API responses"""

    model_config = {"from_attributes": True}


class SaleItemWithProduct(SaleItemResponse):
    """SaleItem with product information"""
    product_code: str | None = None
    product_name: str | None = None
    product_size: str | None = None
    product_color: str | None = None
    # Global product info (if applicable)
    global_product_code: str | None = None
    global_product_name: str | None = None
    global_product_size: str | None = None
    global_product_color: str | None = None


# ============================================
# Sale Schemas
# ============================================

class SaleBase(BaseSchema):
    """Base sale schema"""
    client_id: UUID | None = None
    payment_method: PaymentMethod | None = None
    notes: str | None = None


class SaleCreate(SaleBase, SchoolIsolatedSchema):
    """Schema for creating sale"""
    items: list[SaleItemCreate] = Field(..., min_length=1)
    source: SaleSource = SaleSource.DESKTOP_APP  # Default to desktop app
    # Historical sales (migration) - don't affect inventory
    is_historical: bool = False
    sale_date: datetime | None = None  # Optional: set custom date for historical sales
    # code, status, totals will be auto-generated


class SaleUpdate(BaseSchema):
    """Schema for updating sale (limited fields)"""
    status: SaleStatus | None = None
    payment_method: PaymentMethod | None = None
    notes: str | None = None


class SaleInDB(SaleBase, SchoolIsolatedSchema, IDModelSchema, TimestampSchema):
    """Sale as stored in database"""
    code: str
    user_id: UUID
    status: SaleStatus
    source: SaleSource
    is_historical: bool = False
    total: Decimal
    paid_amount: Decimal
    sale_date: datetime


class SaleResponse(SaleInDB):
    """Sale for API responses"""
    items: list[SaleItemResponse] = []

    model_config = {"from_attributes": True}


class SaleWithItems(SaleResponse):
    """Sale with all items and product details"""
    items: list[SaleItemWithProduct]
    client_name: str | None = None


class SaleListResponse(BaseSchema):
    """Simplified sale response for listings (multi-school support)"""
    id: UUID
    code: str
    status: SaleStatus
    source: SaleSource | None = None
    is_historical: bool = False
    payment_method: PaymentMethod | None = None
    total: Decimal
    paid_amount: Decimal
    client_id: UUID | None = None
    client_name: str | None = None
    sale_date: datetime
    created_at: datetime
    items_count: int = 0
    # Track who made the sale
    user_id: UUID | None = None
    user_name: str | None = None
    # Multi-school support
    school_id: UUID | None = None
    school_name: str | None = None


# ============================================
# Sale Analytics Schemas
# ============================================

class SalesReport(BaseSchema):
    """Sales summary report"""
    total_sales: int
    total_revenue: Decimal
    total_tax: Decimal
    average_ticket: Decimal
    sales_by_status: dict[str, int]  # {"completed": 45, "pending": 3, "cancelled": 2}
    sales_by_payment_method: dict[str, int]  # {"cash": 30, "transfer": 15, "credit": 5}


class TopProduct(BaseSchema):
    """Product sales performance"""
    product_id: UUID
    product_code: str
    product_name: str | None
    units_sold: int
    total_revenue: Decimal


class SalesByPeriod(BaseSchema):
    """Sales grouped by time period"""
    period: str  # "2024-01", "2024-W05", "2024-01-15"
    sales_count: int
    total_revenue: Decimal


class DailySalesSummary(BaseSchema):
    """Daily sales summary"""
    date: str  # "2024-01-15"
    total_sales: int
    total_revenue: Decimal
    cash_sales: Decimal
    transfer_sales: Decimal
    credit_sales: Decimal
    completed_count: int
    pending_count: int
    cancelled_count: int


# ============================================
# SaleChange Schemas
# ============================================

class SaleChangeBase(BaseSchema):
    """Base sale change schema"""
    change_type: ChangeType
    returned_quantity: int = Field(..., gt=0)
    new_product_id: UUID | None = None
    new_quantity: int = Field(0, ge=0)
    reason: str = Field(..., min_length=3, max_length=500)


class SaleChangeCreate(SaleChangeBase):
    """Schema for creating sale change request"""
    original_item_id: UUID

    @model_validator(mode='after')
    def validate_change_type_fields(self):
        """Validate fields based on change type after all fields are set"""
        change_type = self.change_type
        new_product_id = self.new_product_id
        new_quantity = self.new_quantity

        # For returns, no new product needed
        if change_type == ChangeType.RETURN:
            if new_product_id is not None:
                raise ValueError("Returns should not have a new product")
            if new_quantity > 0:
                raise ValueError("Returns should not have new quantity")

        # For changes, new product is required
        elif change_type in [ChangeType.SIZE_CHANGE, ChangeType.PRODUCT_CHANGE, ChangeType.DEFECT]:
            if new_product_id is None:
                raise ValueError(f"{change_type.value} requires a new product")
            if new_quantity <= 0:
                raise ValueError(f"{change_type.value} requires new quantity > 0")

        return self


class SaleChangeUpdate(BaseSchema):
    """Schema for updating sale change (approve/reject)"""
    status: ChangeStatus
    rejection_reason: str | None = Field(None, max_length=500)

    @field_validator('rejection_reason')
    def validate_rejection_reason(cls, v, info):
        """Rejection reason required when rejecting"""
        status = info.data.get('status')
        if status == ChangeStatus.REJECTED and not v:
            raise ValueError("Rejection reason is required when rejecting a change")
        return v


class SaleChangeApprove(BaseSchema):
    """Schema for approving sale change with payment method for price adjustments"""
    payment_method: PaymentMethod = Field(
        default=PaymentMethod.CASH,
        description="Payment method for price adjustment (refund or additional payment)"
    )


class SaleChangeInDB(SaleChangeBase, IDModelSchema, TimestampSchema):
    """SaleChange as stored in database"""
    sale_id: UUID
    original_item_id: UUID
    user_id: UUID
    change_date: datetime
    new_unit_price: Decimal | None
    price_adjustment: Decimal
    status: ChangeStatus
    rejection_reason: str | None


class SaleChangeResponse(SaleChangeInDB):
    """SaleChange for API responses"""
    pass


class SaleChangeWithDetails(SaleChangeResponse):
    """SaleChange with detailed product information"""
    # Original item details
    original_product_code: str
    original_product_name: str | None
    original_product_size: str
    original_unit_price: Decimal

    # New product details (if applicable)
    new_product_code: str | None
    new_product_name: str | None
    new_product_size: str | None

    # User who processed the change
    user_username: str


class SaleChangeListResponse(BaseSchema):
    """Simplified sale change response for listings"""
    id: UUID
    sale_id: UUID
    sale_code: str
    change_type: ChangeType
    status: ChangeStatus
    returned_quantity: int
    new_quantity: int
    price_adjustment: Decimal
    change_date: datetime
    reason: str
