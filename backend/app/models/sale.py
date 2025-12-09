"""
Sales Transaction Models
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Text, ForeignKey, UniqueConstraint, CheckConstraint, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.db.base import Base


class PaymentMethod(str, enum.Enum):
    """Payment methods"""
    CASH = "cash"
    TRANSFER = "transfer"
    CARD = "card"
    CREDIT = "credit"


class SaleStatus(str, enum.Enum):
    """Sale status"""
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class Sale(Base):
    """
    Sales transactions

    Note: Total = sum of item prices (no tax applied)
    The business model does not require IVA/tax for now
    """
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint('school_id', 'code', name='uq_school_sale_code'),
        CheckConstraint('total > 0', name='chk_sale_total_positive'),
        CheckConstraint('paid_amount >= 0', name='chk_sale_paid_positive'),
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

    code: Mapped[str] = mapped_column(String(30), nullable=False)  # Auto-generated: VNT-2024-0001
    client_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="SET NULL")
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    sale_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    payment_method: Mapped[PaymentMethod | None] = mapped_column(
        SQLEnum(PaymentMethod, name="payment_method_enum")
    )

    status: Mapped[SaleStatus] = mapped_column(
        SQLEnum(SaleStatus, name="sale_status_enum"),
        default=SaleStatus.COMPLETED,
        nullable=False
    )
    notes: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    school: Mapped["School"] = relationship(back_populates="sales")
    client: Mapped["Client | None"] = relationship(back_populates="sales")
    user: Mapped["User"] = relationship()
    items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan"
    )
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Sale(code='{self.code}', total={self.total}, status='{self.status}')>"


class SaleItem(Base):
    """Detail of products per sale"""
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint('quantity > 0', name='chk_sale_item_quantity_positive'),
        CheckConstraint('unit_price >= 0', name='chk_sale_item_price_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    # For school products
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )
    # For global products (shared inventory)
    global_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("global_products.id", ondelete="RESTRICT"),
        nullable=True,
        index=True
    )
    is_global_product: Mapped[bool] = mapped_column(default=False, nullable=False)

    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)  # Price at time of sale
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    # Relationships
    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product | None"] = relationship(back_populates="sale_items")
    global_product: Mapped["GlobalProduct | None"] = relationship()
    changes_as_original: Mapped[list["SaleChange"]] = relationship(
        back_populates="original_item",
        foreign_keys="SaleChange.original_item_id"
    )

    def __repr__(self) -> str:
        return f"<SaleItem(sale_id='{self.sale_id}', product_id='{self.product_id}', quantity={self.quantity})>"


class ChangeStatus(str, enum.Enum):
    """Change request status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class ChangeType(str, enum.Enum):
    """Type of change"""
    SIZE_CHANGE = "size_change"  # Cambio de talla
    PRODUCT_CHANGE = "product_change"  # Cambio de producto
    RETURN = "return"  # Devolución sin reemplazo
    DEFECT = "defect"  # Cambio por defecto


class SaleChange(Base):
    """Product changes and returns for sales"""
    __tablename__ = "sale_changes"
    __table_args__ = (
        CheckConstraint('returned_quantity > 0', name='chk_change_returned_qty_positive'),
        CheckConstraint('new_quantity >= 0', name='chk_change_new_qty_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    sale_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    original_item_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sale_items.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    # Change details
    change_type: Mapped[ChangeType] = mapped_column(
        SQLEnum(ChangeType, name="change_type_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    change_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)

    # Original product returned
    returned_quantity: Mapped[int] = mapped_column(nullable=False)

    # New product (if applicable, None for pure returns)
    new_product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT")
    )
    new_quantity: Mapped[int] = mapped_column(default=0, nullable=False)
    new_unit_price: Mapped[float | None] = mapped_column(Numeric(10, 2))

    # Financial adjustment
    price_adjustment: Mapped[float] = mapped_column(
        Numeric(10, 2),
        default=0,
        nullable=False
    )  # Positive = customer pays more, Negative = refund

    # Status and notes
    status: Mapped[ChangeStatus] = mapped_column(
        SQLEnum(ChangeStatus, name="change_status_enum", values_callable=lambda x: [e.value for e in x]),
        default=ChangeStatus.PENDING,
        nullable=False
    )
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    rejection_reason: Mapped[str | None] = mapped_column(Text)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    sale: Mapped["Sale"] = relationship()
    original_item: Mapped["SaleItem"] = relationship(
        back_populates="changes_as_original",
        foreign_keys=[original_item_id]
    )
    new_product: Mapped["Product | None"] = relationship()
    user: Mapped["User"] = relationship()

    def __repr__(self) -> str:
        return f"<SaleChange(sale_id='{self.sale_id}', type='{self.change_type}', status='{self.status}')>"
