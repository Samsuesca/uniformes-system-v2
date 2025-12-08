"""
Accounting Models - Transactions, Expenses, and Cash Flow
"""
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import String, Boolean, DateTime, Date, Numeric, Text, ForeignKey, Enum as SQLEnum, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.db.base import Base


class TransactionType(str, enum.Enum):
    """Types of financial transactions"""
    INCOME = "income"           # Ingresos (ventas, abonos)
    EXPENSE = "expense"         # Gastos (arriendo, servicios, etc.)
    TRANSFER = "transfer"       # Transferencias entre cuentas


class AccPaymentMethod(str, enum.Enum):
    """Payment methods for accounting transactions (extended)"""
    CASH = "cash"               # Efectivo
    TRANSFER = "transfer"       # Transferencia bancaria
    CARD = "card"               # Tarjeta débito/crédito
    CREDIT = "credit"           # Crédito (fiado)
    OTHER = "other"             # Otro


class ExpenseCategory(str, enum.Enum):
    """Categories for expenses"""
    RENT = "rent"                       # Arriendo
    UTILITIES = "utilities"             # Servicios públicos
    PAYROLL = "payroll"                 # Nómina/Salarios
    SUPPLIES = "supplies"               # Insumos/Materiales
    INVENTORY = "inventory"             # Compra de inventario
    TRANSPORT = "transport"             # Transporte
    MAINTENANCE = "maintenance"         # Mantenimiento
    MARKETING = "marketing"             # Publicidad/Marketing
    TAXES = "taxes"                     # Impuestos
    BANK_FEES = "bank_fees"             # Comisiones bancarias
    OTHER = "other"                     # Otros


class Transaction(Base):
    """
    Financial transaction record.

    Every money movement (income or expense) is recorded here.
    Sales automatically create income transactions.
    """
    __tablename__ = "transactions"
    __table_args__ = (
        CheckConstraint('amount > 0', name='chk_transaction_amount_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Transaction details
    type: Mapped[TransactionType] = mapped_column(
        SQLEnum(TransactionType, name="transaction_type_enum"),
        nullable=False,
        index=True
    )
    amount: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        nullable=False
    )
    payment_method: Mapped[AccPaymentMethod] = mapped_column(
        SQLEnum(AccPaymentMethod, name="acc_payment_method_enum"),
        nullable=False
    )

    # Description and categorization
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    category: Mapped[str | None] = mapped_column(String(100))  # For expenses
    reference_code: Mapped[str | None] = mapped_column(String(100))  # VNT-2025-0001, etc.

    # Date tracking
    transaction_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Optional relations to source records
    sale_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True
    )
    order_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="SET NULL"),
        nullable=True
    )
    expense_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("expenses.id", ondelete="SET NULL"),
        nullable=True
    )

    # Audit
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    school: Mapped["School"] = relationship(back_populates="transactions")
    sale: Mapped["Sale | None"] = relationship(back_populates="transactions")
    order: Mapped["Order | None"] = relationship(back_populates="transactions")
    expense: Mapped["Expense | None"] = relationship(back_populates="transaction")
    created_by_user: Mapped["User | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Transaction({self.type.value}: ${self.amount} on {self.transaction_date})>"


class Expense(Base):
    """
    Expense record for business costs.

    Each expense can have one or more transactions (e.g., partial payments).
    """
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint('amount > 0', name='chk_expense_amount_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Expense details
    category: Mapped[ExpenseCategory] = mapped_column(
        SQLEnum(ExpenseCategory, name="expense_category_enum"),
        nullable=False,
        index=True
    )
    description: Mapped[str] = mapped_column(String(500), nullable=False)
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)

    # Payment tracking
    amount_paid: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )
    is_paid: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    # Dates
    expense_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    due_date: Mapped[date | None] = mapped_column(Date)  # For recurring/scheduled expenses

    # Additional info
    vendor: Mapped[str | None] = mapped_column(String(255))  # Proveedor
    receipt_number: Mapped[str | None] = mapped_column(String(100))  # Número de factura
    notes: Mapped[str | None] = mapped_column(Text)

    # Recurring expense config
    is_recurring: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    recurring_period: Mapped[str | None] = mapped_column(String(20))  # monthly, weekly, yearly

    # Audit
    created_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    school: Mapped["School"] = relationship(back_populates="expenses")
    transaction: Mapped["Transaction | None"] = relationship(
        back_populates="expense",
        uselist=False
    )
    created_by_user: Mapped["User | None"] = relationship()

    @property
    def balance(self) -> Decimal:
        """Remaining balance to pay"""
        return self.amount - self.amount_paid

    def __repr__(self) -> str:
        return f"<Expense({self.category.value}: ${self.amount} on {self.expense_date})>"


class DailyCashRegister(Base):
    """
    Daily cash register summary.

    Tracks opening/closing balance and daily totals.
    """
    __tablename__ = "daily_cash_registers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Date
    register_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)

    # Balances
    opening_balance: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )
    closing_balance: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))

    # Daily totals (calculated)
    total_income: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )
    total_expenses: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )

    # Breakdown by payment method
    cash_income: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )
    transfer_income: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )
    card_income: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )
    credit_sales: Mapped[Decimal] = mapped_column(
        Numeric(12, 2),
        default=Decimal("0"),
        nullable=False
    )

    # Status
    is_closed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime)
    closed_by: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    school: Mapped["School"] = relationship(back_populates="cash_registers")

    @property
    def net_flow(self) -> Decimal:
        """Net cash flow for the day"""
        return self.total_income - self.total_expenses

    def __repr__(self) -> str:
        return f"<DailyCashRegister({self.register_date}: Income=${self.total_income}, Expenses=${self.total_expenses})>"
