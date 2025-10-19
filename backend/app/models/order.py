"""
Custom Orders Models (Encargos)
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Integer, Text, ForeignKey, UniqueConstraint, CheckConstraint, Enum as SQLEnum, Computed
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.base import Base


class OrderStatus(str, enum.Enum):
    """Order status"""
    PENDING = "pending"
    IN_PRODUCTION = "in_production"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class Order(Base):
    """Custom orders with personalized measurements"""
    __tablename__ = "orders"
    __table_args__ = (
        UniqueConstraint('school_id', 'code', name='uq_school_order_code'),
        CheckConstraint('total > 0', name='chk_order_total_positive'),
        CheckConstraint('paid_amount >= 0', name='chk_order_paid_positive'),
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

    code: Mapped[str] = mapped_column(String(30), nullable=False)  # Auto-generated: ENC-2024-0001
    client_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("clients.id", ondelete="RESTRICT"),
        nullable=False
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False
    )

    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    delivery_date: Mapped[datetime | None] = mapped_column(DateTime)
    expected_delivery_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)

    total: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    paid_amount: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    # balance computed automatically as (total - paid_amount)
    balance: Mapped[float] = mapped_column(
        Numeric(10, 2),
        Computed("total - paid_amount"),
        nullable=False
    )

    status: Mapped[OrderStatus] = mapped_column(
        SQLEnum(OrderStatus, name="order_status_enum"),
        default=OrderStatus.PENDING,
        nullable=False
    )

    # Custom measurements (for Yombers, tailored garments, etc.)
    custom_measurements: Mapped[dict | None] = mapped_column(JSONB)
    # Example:
    # {
    #     "delantero": 40,
    #     "trasero": 42,
    #     "espalda": 35,
    #     "cintura": 28,
    #     "largo": 75
    # }

    notes: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    school: Mapped["School"] = relationship(back_populates="orders")
    client: Mapped["Client"] = relationship(back_populates="orders")
    user: Mapped["User"] = relationship()
    items: Mapped[list["OrderItem"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Order(code='{self.code}', total={self.total}, status='{self.status}')>"


class OrderItem(Base):
    """Detail of products per order"""
    __tablename__ = "order_items"
    __table_args__ = (
        CheckConstraint('quantity > 0', name='chk_order_item_quantity_positive'),
    )

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    order_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("orders.id", ondelete="CASCADE"),
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
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship(back_populates="items")
    product: Mapped["Product"] = relationship(back_populates="order_items")

    def __repr__(self) -> str:
        return f"<OrderItem(order_id='{self.order_id}', product_id='{self.product_id}', quantity={self.quantity})>"
