"""
Contact Schemas

Pydantic schemas for Contact model validation and serialization.
Used for PQRS (Peticiones, Quejas, Reclamos, Sugerencias) system.
"""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from uuid import UUID
from datetime import datetime
from typing import Optional

from app.models.contact import ContactType, ContactStatus


class ContactBase(BaseModel):
    """Base schema for Contact"""
    name: str = Field(..., min_length=2, max_length=150)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    contact_type: ContactType
    subject: str = Field(..., min_length=5, max_length=200)
    message: str = Field(..., min_length=10)
    school_id: Optional[UUID] = None


class ContactCreate(ContactBase):
    """Schema for creating a new contact (from web portal)"""
    client_id: Optional[UUID] = None  # Optional - puede ser anónimo


class ContactUpdate(BaseModel):
    """Schema for updating contact (admin only)"""
    status: Optional[ContactStatus] = None
    admin_response: Optional[str] = None
    is_read: Optional[bool] = None


class ContactResponse(ContactBase):
    """Schema for contact response"""
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    client_id: Optional[UUID]
    status: ContactStatus
    is_read: bool
    admin_response: Optional[str]
    admin_response_date: Optional[datetime]
    responded_by_id: Optional[UUID]
    created_at: datetime
    updated_at: datetime


class ContactListResponse(BaseModel):
    """Schema for paginated contact list response"""
    items: list[ContactResponse]
    total: int
    page: int
    page_size: int
    total_pages: int
