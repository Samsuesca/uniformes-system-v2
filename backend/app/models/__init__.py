"""
Database Models

Import all models here to ensure they are registered with SQLAlchemy
and available for Alembic migrations.
"""
from app.db.base import Base

# Import all models
from app.models.user import User, UserSchoolRole, UserRole
from app.models.school import School
from app.models.product import (
    GarmentType, Product, Inventory,
    GlobalGarmentType, GlobalProduct, GlobalInventory
)
from app.models.client import Client
from app.models.sale import Sale, SaleItem, PaymentMethod, SaleStatus, SaleChange, ChangeType, ChangeStatus
from app.models.order import Order, OrderItem, OrderStatus
from app.models.accounting import (
    Transaction, TransactionType,
    Expense, ExpenseCategory,
    DailyCashRegister,
    AccPaymentMethod
)

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
    # Global product models
    "GlobalGarmentType",
    "GlobalProduct",
    "GlobalInventory",
    # Client models
    "Client",
    # Sale models
    "Sale",
    "SaleItem",
    "PaymentMethod",
    "SaleStatus",
    "SaleChange",
    "ChangeType",
    "ChangeStatus",
    # Order models
    "Order",
    "OrderItem",
    "OrderStatus",
    # Accounting models
    "Transaction",
    "TransactionType",
    "Expense",
    "ExpenseCategory",
    "DailyCashRegister",
    "AccPaymentMethod",
]
