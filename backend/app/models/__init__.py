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
    GarmentType, GarmentTypeImage, Product, Inventory,
    GlobalGarmentType, GlobalGarmentTypeImage, GlobalProduct, GlobalInventory
)
from app.models.client import Client, ClientStudent, ClientType
from app.models.sale import Sale, SaleItem, SalePayment, PaymentMethod, SaleStatus, SaleChange, ChangeType, ChangeStatus, SaleSource
from app.models.order import Order, OrderItem, OrderStatus, DeliveryType, PaymentProofStatus
from app.models.delivery_zone import DeliveryZone
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
    # Expense Adjustment models
    AdjustmentReason,
    ExpenseAdjustment,
)
from app.models.fixed_expense import (
    FixedExpense,
    FixedExpenseType,
    ExpenseFrequency,
)
from app.models.document import DocumentFolder, BusinessDocument
from app.models.alteration import (
    Alteration,
    AlterationPayment,
    AlterationType,
    AlterationStatus,
)
from app.models.notification import Notification, NotificationType, ReferenceType

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
    "GarmentTypeImage",
    "Product",
    "Inventory",
    # Global product models
    "GlobalGarmentType",
    "GlobalGarmentTypeImage",
    "GlobalProduct",
    "GlobalInventory",
    # Client models
    "Client",
    "ClientStudent",
    "ClientType",
    # Sale models
    "Sale",
    "SaleItem",
    "SalePayment",
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
    "DeliveryType",
    "PaymentProofStatus",
    # Delivery Zone models
    "DeliveryZone",
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
    # Expense Adjustment models
    "AdjustmentReason",
    "ExpenseAdjustment",
    # Fixed Expense models
    "FixedExpense",
    "FixedExpenseType",
    "ExpenseFrequency",
    # Document models
    "DocumentFolder",
    "BusinessDocument",
    # Alteration models
    "Alteration",
    "AlterationPayment",
    "AlterationType",
    "AlterationStatus",
    # Notification models
    "Notification",
    "NotificationType",
    "ReferenceType",
]
