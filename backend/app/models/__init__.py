"""
Database Models

Import all models here to ensure they are registered with SQLAlchemy
and available for Alembic migrations.
"""
from app.db.base import Base

# Import all models
from app.models.user import User, UserSchoolRole, UserRole
from app.models.school import School
from app.models.product import GarmentType, Product, Inventory
from app.models.client import Client
from app.models.sale import Sale, SaleItem, PaymentMethod, SaleStatus
from app.models.order import Order, OrderItem, OrderStatus

__all__ = [
    "Base",
    # User models
    "User",
    "UserSchoolRole",
    "UserRole",
    # School models
    "School",
    # Product models
    "GarmentType",
    "Product",
    "Inventory",
    # Client models
    "Client",
    # Sale models
    "Sale",
    "SaleItem",
    "PaymentMethod",
    "SaleStatus",
    # Order models
    "Order",
    "OrderItem",
    "OrderStatus",
]
