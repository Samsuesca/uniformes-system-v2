"""
Sale and SaleItem Schemas
"""
from uuid import UUID
from decimal import Decimal
from datetime import datetime
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema
from app.models.sale import SaleStatus, PaymentMethod


# ============================================
# SaleItem Schemas
# ============================================

class SaleItemBase(BaseSchema):
    """Base sale item schema"""
    product_id: UUID
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    subtotal: Decimal = Field(..., ge=0)


class SaleItemCreate(BaseSchema):
    """Schema for creating sale item (simplified input)"""
    product_id: UUID
    quantity: int = Field(..., gt=0)
    # unit_price and subtotal will be calculated from product


class SaleItemInDB(SaleItemBase, SchoolIsolatedSchema, IDModelSchema):
    """SaleItem as stored in database"""
    sale_id: UUID


class SaleItemResponse(SaleItemInDB):
    """SaleItem for API responses"""
    pass


class SaleItemWithProduct(SaleItemResponse):
    """SaleItem with product information"""
    product_code: str
    product_name: str | None
    product_size: str
    product_color: str | None


# ============================================
# Sale Schemas
# ============================================

class SaleBase(BaseSchema):
    """Base sale schema"""
    client_id: UUID | None = None
    payment_method: PaymentMethod
    payment_reference: str | None = Field(None, max_length=100)
    notes: str | None = None


class SaleCreate(SaleBase, SchoolIsolatedSchema):
    """Schema for creating sale"""
    items: list[SaleItemCreate] = Field(..., min_length=1)
    # code, status, totals will be auto-generated


class SaleUpdate(BaseSchema):
    """Schema for updating sale (limited fields)"""
    status: SaleStatus | None = None
    payment_method: PaymentMethod | None = None
    payment_reference: str | None = Field(None, max_length=100)
    notes: str | None = None


class SaleInDB(SaleBase, SchoolIsolatedSchema, IDModelSchema, TimestampSchema):
    """Sale as stored in database"""
    code: str
    status: SaleStatus
    subtotal: Decimal
    tax: Decimal
    total: Decimal


class SaleResponse(SaleInDB):
    """Sale for API responses"""
    pass


class SaleWithItems(SaleResponse):
    """Sale with all items"""
    items: list[SaleItemWithProduct]
    client_name: str | None = None


class SaleListResponse(BaseSchema):
    """Simplified sale response for listings"""
    id: UUID
    code: str
    status: SaleStatus
    payment_method: PaymentMethod
    total: Decimal
    client_name: str | None
    created_at: datetime
    items_count: int = 0


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
