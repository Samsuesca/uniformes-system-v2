"""
Client Models
"""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, Text, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid

from app.db.base import Base


class Client(Base):
    """Customer base per school"""
    __tablename__ = "clients"
    __table_args__ = (
        UniqueConstraint('school_id', 'code', name='uq_school_client_code'),
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

    code: Mapped[str] = mapped_column(String(20), nullable=False)  # Auto-generated: CLI-0001
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20))
    email: Mapped[str | None] = mapped_column(String(255))
    address: Mapped[str | None] = mapped_column(Text)

    # Student information
    student_name: Mapped[str | None] = mapped_column(String(255))
    student_grade: Mapped[str | None] = mapped_column(String(50))  # 3ro Primaria, 10mo

    notes: Mapped[str | None] = mapped_column(Text)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    # Relationships
    school: Mapped["School"] = relationship(back_populates="clients")
    sales: Mapped[list["Sale"]] = relationship(back_populates="client")
    orders: Mapped[list["Order"]] = relationship(back_populates="client")

    def __repr__(self) -> str:
        return f"<Client(code='{self.code}', name='{self.name}')>"
