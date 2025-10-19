"""
Client Schemas
"""
from uuid import UUID
from pydantic import Field, field_validator, EmailStr
from app.schemas.base import BaseSchema, IDModelSchema, TimestampSchema, SchoolIsolatedSchema


class ClientBase(BaseSchema):
    """Base client schema"""
    name: str = Field(..., min_length=3, max_length=255)
    phone: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    address: str | None = None
    document_type: str | None = Field(None, max_length=10)
    document_number: str | None = Field(None, max_length=50)
    notes: str | None = None

    # Student information (optional - for parents/students)
    student_name: str | None = Field(None, max_length=255)
    student_grade: str | None = Field(None, max_length=50)

    @field_validator('document_type')
    @classmethod
    def validate_document_type(cls, v: str | None) -> str | None:
        """Validate document type"""
        if v and v.upper() not in ['CC', 'CE', 'TI', 'NIT', 'PASSPORT']:
            raise ValueError('Document type must be: CC, CE, TI, NIT, or PASSPORT')
        return v.upper() if v else None


class ClientCreate(ClientBase, SchoolIsolatedSchema):
    """Schema for creating client"""
    # code will be auto-generated (CLI-0001)
    pass


class ClientUpdate(BaseSchema):
    """Schema for updating client"""
    name: str | None = Field(None, min_length=3, max_length=255)
    phone: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    address: str | None = None
    document_type: str | None = Field(None, max_length=10)
    document_number: str | None = Field(None, max_length=50)
    notes: str | None = None
    student_name: str | None = Field(None, max_length=255)
    student_grade: str | None = Field(None, max_length=50)
    is_active: bool | None = None


class ClientInDB(ClientBase, SchoolIsolatedSchema, IDModelSchema, TimestampSchema):
    """Client as stored in database"""
    code: str
    is_active: bool


class ClientResponse(ClientInDB):
    """Client for API responses"""
    pass


class ClientListResponse(BaseSchema):
    """Simplified client response for listings"""
    id: UUID
    code: str
    name: str
    phone: str | None
    email: str | None
    student_name: str | None
    student_grade: str | None
    is_active: bool


class ClientSummary(BaseSchema):
    """Client with transaction summary"""
    id: UUID
    code: str
    name: str
    phone: str | None
    email: str | None
    student_name: str | None
    total_purchases: int = 0
    total_spent: float = 0
    pending_orders: int = 0
    last_purchase_date: str | None = None
