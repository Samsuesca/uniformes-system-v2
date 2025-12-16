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
from app.models.client import Client, ClientStudent, ClientType
from app.models.sale import Sale, SaleItem, PaymentMethod, SaleStatus, SaleChange, ChangeType, ChangeStatus, SaleSource
from app.models.order import Order, OrderItem, OrderStatus
from app.models.contact import Contact, ContactType, ContactStatus
from app.models.payment_account import PaymentAccount, PaymentMethodType
from app.models.accounting import (
    Transaction, TransactionType,
    Expense, ExpenseCategory,
    DailyCashRegister,
    AccPaymentMethod,
    # Balance General models
    AccountType,
    BalanceAccount,
    BalanceEntry,
    AccountsReceivable,
    AccountsPayable,
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
    "ClientStudent",
    "ClientType",
    # Sale models
    "Sale",
    "SaleItem",
    "PaymentMethod",
    "SaleStatus",
    "SaleChange",
    "ChangeType",
    "ChangeStatus",
    "SaleSource",
    # Order models
    "Order",
    "OrderItem",
    "OrderStatus",
    # Contact models
    "Contact",
    "ContactType",
    "ContactStatus",
    # Payment Account models
    "PaymentAccount",
    "PaymentMethodType",
    # Accounting models
    "Transaction",
    "TransactionType",
    "Expense",
    "ExpenseCategory",
    "DailyCashRegister",
    "AccPaymentMethod",
    # Balance General models
    "AccountType",
    "BalanceAccount",
    "BalanceEntry",
    "AccountsReceivable",
    "AccountsPayable",
]
