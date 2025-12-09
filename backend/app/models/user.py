"""
User and Authentication Models
"""
from datetime import datetime
from sqlalchemy import String, Boolean, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.dialects.postgresql import UUID
import uuid
import enum

from app.db.base import Base


class UserRole(str, enum.Enum):
    """
    User roles in the system (hierarchical, highest to lowest)

    Permissions by role:
    - OWNER: Full access + user management + school settings
    - ADMIN: Full business data (sales, inventory, accounting, reports)
    - SELLER: Create/read sales, read inventory, manage clients/orders
    - VIEWER: Read-only access to sales, inventory, clients

    Note: DEVELOPER access is controlled via is_superuser flag.
    Superusers bypass all role checks and can access/modify anything.
    """
    OWNER = "owner"        # Propietario - full access + user mgmt
    ADMIN = "admin"        # Administrador - business data access
    SELLER = "seller"      # Vendedor - sales, clients, orders
    VIEWER = "viewer"      # Solo lectura - read only


class User(Base):
    """System users (sellers, administrators, etc.)"""
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    username: Mapped[str] = mapped_column(String(50), unique=True, index=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255))

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

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
    last_login: Mapped[datetime | None] = mapped_column(DateTime)

    # Relationships
    school_roles: Mapped[list["UserSchoolRole"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<User(username='{self.username}', email='{self.email}')>"


class UserSchoolRole(Base):
    """Many-to-many relationship: users can have roles in multiple schools"""
    __tablename__ = "user_school_roles"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    school_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("schools.id", ondelete="CASCADE"),
        nullable=False
    )
    role: Mapped[UserRole] = mapped_column(
        SQLEnum(UserRole, name="user_role_enum", values_callable=lambda x: [e.value for e in x]),
        nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="school_roles")
    school: Mapped["School"] = relationship(back_populates="user_roles")

    def __repr__(self) -> str:
        return f"<UserSchoolRole(user_id='{self.user_id}', school_id='{self.school_id}', role='{self.role}')>"
