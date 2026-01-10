"""
Custom Orders Models (Encargos)
"""
from datetime import datetime
from sqlalchemy import String, DateTime, Numeric, Integer, Text, ForeignKey, UniqueConstraint, CheckConstraint, Enum as SQLEnum, Computed, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
import uuid
import enum

from app.db.base import Base
from app.models.sale import SaleSource  # Reuse the same source enum


class OrderStatus(str, enum.Enum):
    """Order status"""
    PENDING = "pending"
    IN_PRODUCTION = "in_production"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class OrderItemStatus(str, enum.Enum):
    """Individual order item status - allows independent tracking per item"""
    PENDING = "pending"
    IN_PRODUCTION = "in_production"
    READY = "ready"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class DeliveryType(str, enum.Enum):
    """Tipo de entrega del pedido"""
    PICKUP = "pickup"      # Retiro en tienda
    DELIVERY = "delivery"  # Domicilio


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
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True  # Allow NULL for web portal orders
    )

    order_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    delivery_date: Mapped[datetime | None] = mapped_column(DateTime)
    expected_delivery_days: Mapped[int] = mapped_column(Integer, default=7, nullable=False)

    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
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

    # Source/origin of the order (who/where created it) - uses values (lowercase in DB)
    source: Mapped[SaleSource] = mapped_column(
        SQLEnum(SaleSource, name="sale_source_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=SaleSource.DESKTOP_APP,
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

    # Payment proof for web orders (manual verification)
    payment_proof_url: Mapped[str | None] = mapped_column(String(500))
    payment_notes: Mapped[str | None] = mapped_column(Text)  # Client notes about payment

    # Delivery information
    delivery_type: Mapped[DeliveryType] = mapped_column(
        SQLEnum(DeliveryType, name="delivery_type_enum", values_callable=lambda x: [e.value for e in x]),
        default=DeliveryType.PICKUP,
        nullable=False
    )

    # Delivery address (solo para domicilios)
    delivery_address: Mapped[str | None] = mapped_column(String(300))  # Dirección completa
    delivery_neighborhood: Mapped[str | None] = mapped_column(String(100))  # Barrio
    delivery_city: Mapped[str | None] = mapped_column(String(100))  # Ciudad
    delivery_references: Mapped[str | None] = mapped_column(Text)  # Indicaciones adicionales

    # Zona de envío y costo
    delivery_zone_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("delivery_zones.id", ondelete="SET NULL"),
        nullable=True
    )
    delivery_fee: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)

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
    transactions: Mapped[list["Transaction"]] = relationship(
        back_populates="order",
        cascade="all, delete-orphan"
    )
    delivery_zone: Mapped["DeliveryZone | None"] = relationship()

    def __repr__(self) -> str:
        return f"<Order(code='{self.code}', total={self.total}, status='{self.status}')>"


class OrderItem(Base):
    """Detail of products per order (encargos personalizados)"""
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
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    garment_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("garment_types.id", ondelete="RESTRICT"),
        nullable=False,
        index=True
    )
    # product_id is optional - only set when order is fulfilled from inventory
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("products.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    quantity: Mapped[int] = mapped_column(nullable=False)
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)

    # Custom order specifications
    size: Mapped[str | None] = mapped_column(String(10))
    color: Mapped[str | None] = mapped_column(String(50))
    gender: Mapped[str | None] = mapped_column(String(10))  # unisex, male, female
    custom_measurements: Mapped[dict | None] = mapped_column(JSONB)
    embroidery_text: Mapped[str | None] = mapped_column(String(100))
    notes: Mapped[str | None] = mapped_column(Text)

    # Individual item status - allows independent tracking per item
    item_status: Mapped[OrderItemStatus] = mapped_column(
        SQLEnum(OrderItemStatus, name="order_item_status_enum", create_type=False, values_callable=lambda x: [e.value for e in x]),
        default=OrderItemStatus.PENDING,
        nullable=False,
        index=True
    )
    status_updated_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    # Stock reservation tracking - for "pisar" (reserve) functionality
    reserved_from_stock: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    quantity_reserved: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Relationships
    order: Mapped["Order"] = relationship(back_populates="items")
    garment_type: Mapped["GarmentType"] = relationship()
    product: Mapped["Product | None"] = relationship(back_populates="order_items")

    def __repr__(self) -> str:
        return f"<OrderItem(order_id='{self.order_id}', product_id='{self.product_id}', quantity={self.quantity})>"
