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
    """Sales transactions"""
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
    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )

    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)  # Price at time of sale
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    discount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    # Relationships
    sale: Mapped["Sale"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="sale_items")

    def __repr__(self) -> str:
        return f"<SaleItem(sale_id='{self.sale_id}', product_id='{self.product_id}', quantity={self.quantity})>"
