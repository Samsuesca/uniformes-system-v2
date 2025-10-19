"""
Product, GarmentType, and Inventory Schemas
"""
from uuid import UUID
from decimal import Decimal
from pydantic import Field, field_validator
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema


# ============================================
# GarmentType Schemas
# ============================================

class GarmentTypeBase(BaseSchema):
    """Base garment type schema"""
    name: str = Field(..., min_length=3, max_length=100)
    description: str | None = None
    category: str | None = Field(None, max_length=50)
    requires_embroidery: bool = False
    has_custom_measurements: bool = False


class GarmentTypeCreate(GarmentTypeBase, SchoolIsolatedSchema):
    """Schema for creating garment type"""
    pass


class GarmentTypeUpdate(BaseSchema):
    """Schema for updating garment type"""
    name: str | None = Field(None, min_length=3, max_length=100)
    description: str | None = None
    category: str | None = Field(None, max_length=50)
    requires_embroidery: bool | None = None
    has_custom_measurements: bool | None = None
    is_active: bool | None = None


class GarmentTypeInDB(GarmentTypeBase, SchoolIsolatedSchema, IDModelSchema, TimestampSchema):
    """GarmentType as stored in database"""
    is_active: bool


class GarmentTypeResponse(GarmentTypeInDB):
    """GarmentType for API responses"""
    pass


# ============================================
# Product Schemas
# ============================================

class ProductBase(BaseSchema):
    """Base product schema"""
    name: str | None = Field(None, max_length=255)
    size: str = Field(..., max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    price: Decimal = Field(..., ge=0)
    cost: Decimal | None = Field(None, ge=0)
    description: str | None = None
    image_url: str | None = Field(None, max_length=500)

    @field_validator('gender')
    @classmethod
    def validate_gender(cls, v: str | None) -> str | None:
        """Validate gender field"""
        if v and v not in ['unisex', 'male', 'female']:
            raise ValueError('Gender must be: unisex, male, or female')
        return v


class ProductCreate(ProductBase, SchoolIsolatedSchema):
    """Schema for creating product"""
    garment_type_id: UUID
    # code will be auto-generated


class ProductUpdate(BaseSchema):
    """Schema for updating product"""
    name: str | None = Field(None, max_length=255)
    size: str | None = Field(None, max_length=10)
    color: str | None = Field(None, max_length=50)
    gender: str | None = Field(None, max_length=10)
    price: Decimal | None = Field(None, ge=0)
    cost: Decimal | None = Field(None, ge=0)
    description: str | None = None
    image_url: str | None = Field(None, max_length=500)
    is_active: bool | None = None


class ProductInDB(ProductBase, SchoolIsolatedSchema, IDModelSchema, TimestampSchema):
    """Product as stored in database"""
    code: str
    garment_type_id: UUID
    is_active: bool


class ProductResponse(ProductInDB):
    """Product for API responses"""
    pass


class ProductWithInventory(ProductResponse):
    """Product with inventory information"""
    inventory_quantity: int = 0
    inventory_min_stock: int = 5


class ProductListResponse(BaseSchema):
    """Simplified product response for listings"""
    id: UUID
    code: str
    name: str | None
    size: str
    color: str | None
    price: Decimal
    inventory_quantity: int = 0
    is_active: bool


# ============================================
# Inventory Schemas
# ============================================

class InventoryBase(BaseSchema):
    """Base inventory schema"""
    quantity: int = Field(..., ge=0)
    min_stock_alert: int = Field(default=5, ge=0)


class InventoryCreate(InventoryBase, SchoolIsolatedSchema):
    """Schema for creating inventory"""
    product_id: UUID


class InventoryUpdate(BaseSchema):
    """Schema for updating inventory"""
    quantity: int | None = Field(None, ge=0)
    min_stock_alert: int | None = Field(None, ge=0)


class InventoryAdjust(BaseSchema):
    """Schema for adjusting inventory quantity"""
    adjustment: int  # Can be positive or negative
    reason: str | None = Field(None, max_length=255)


class InventoryInDB(InventoryBase, SchoolIsolatedSchema, IDModelSchema):
    """Inventory as stored in database"""
    product_id: UUID
    last_updated: str


class InventoryResponse(InventoryInDB):
    """Inventory for API responses"""
    pass


class LowStockProduct(BaseSchema):
    """Product with low stock alert"""
    product_id: UUID
    product_code: str
    product_name: str | None
    size: str
    color: str | None
    current_quantity: int
    min_stock_alert: int
    difference: int  # How many units below minimum


class InventoryReport(BaseSchema):
    """Inventory summary report"""
    total_products: int
    total_stock_value: Decimal
    low_stock_count: int
    out_of_stock_count: int
    low_stock_products: list[LowStockProduct]
