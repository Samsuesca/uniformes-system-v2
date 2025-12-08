"""
Pytest Configuration & Fixtures for Uniformes System v2.0

This module provides shared fixtures for both unit and integration tests.
"""
import asyncio
from datetime import datetime, date
from decimal import Decimal
from typing import AsyncGenerator, Generator
from uuid import uuid4
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.base import Base
from app.models import (
    User, School, Product, GarmentType, Inventory, Client,
    Sale, SaleItem, SaleChange, Order, OrderItem,
    Transaction, Expense, DailyCashRegister, UserSchoolRole
)
from app.models.sale import SaleStatus, PaymentMethod, ChangeType, ChangeStatus
from app.models.order import OrderStatus
from app.models.user import UserRole


# ============================================================================
# DATABASE FIXTURES (for integration tests)
# ============================================================================

@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for async tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def async_engine():
    """Create async SQLite engine for testing."""
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        echo=False,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest.fixture(scope="function")
async def db_session(async_engine) -> AsyncGenerator[AsyncSession, None]:
    """Provide a database session for testing."""
    async_session = async_sessionmaker(
        async_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with async_session() as session:
        yield session
        await session.rollback()


@pytest.fixture
def mock_db_session():
    """Create a mock database session for unit tests."""
    session = AsyncMock(spec=AsyncSession)
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.add = MagicMock()
    session.delete = AsyncMock()
    session.execute = AsyncMock()
    session.scalar = AsyncMock()
    session.scalars = AsyncMock()
    return session


# ============================================================================
# FACTORY FIXTURES - Generate test data
# ============================================================================

@pytest.fixture
def school_factory():
    """Factory for creating School instances."""
    def _create(
        id: str = None,
        code: str = None,
        name: str = "Test School",
        is_active: bool = True,
        **kwargs
    ) -> School:
        return School(
            id=id or str(uuid4()),
            code=code or f"TST-{uuid4().hex[:4].upper()}",
            name=name,
            is_active=is_active,
            **kwargs
        )
    return _create


@pytest.fixture
def user_factory():
    """Factory for creating User instances."""
    def _create(
        id: str = None,
        username: str = None,
        email: str = None,
        is_active: bool = True,
        is_superuser: bool = False,
        **kwargs
    ) -> User:
        unique = uuid4().hex[:6]
        return User(
            id=id or str(uuid4()),
            username=username or f"user_{unique}",
            email=email or f"user_{unique}@test.com",
            hashed_password="hashed_password",
            is_active=is_active,
            is_superuser=is_superuser,
            **kwargs
        )
    return _create


@pytest.fixture
def garment_type_factory():
    """Factory for creating GarmentType instances."""
    def _create(
        id: str = None,
        school_id: str = None,
        code: str = None,
        name: str = "Camisa",
        category: str = "tops",
        is_active: bool = True,
        **kwargs
    ) -> GarmentType:
        return GarmentType(
            id=id or str(uuid4()),
            school_id=school_id or str(uuid4()),
            code=code or f"GT-{uuid4().hex[:4].upper()}",
            name=name,
            category=category,
            is_active=is_active,
            **kwargs
        )
    return _create


@pytest.fixture
def product_factory():
    """Factory for creating Product instances."""
    def _create(
        id: str = None,
        school_id: str = None,
        garment_type_id: str = None,
        code: str = None,
        name: str = "Test Product",
        size: str = "M",
        color: str = "Blanco",
        price: Decimal = Decimal("50000"),
        is_active: bool = True,
        **kwargs
    ) -> Product:
        return Product(
            id=id or str(uuid4()),
            school_id=school_id or str(uuid4()),
            garment_type_id=garment_type_id or str(uuid4()),
            code=code or f"PRD-{uuid4().hex[:4].upper()}",
            name=name,
            size=size,
            color=color,
            price=price,
            is_active=is_active,
            **kwargs
        )
    return _create


@pytest.fixture
def inventory_factory():
    """Factory for creating Inventory instances."""
    def _create(
        id: str = None,
        product_id: str = None,
        school_id: str = None,
        quantity: int = 100,
        min_stock_alert: int = 10,
        **kwargs
    ) -> Inventory:
        return Inventory(
            id=id or str(uuid4()),
            product_id=product_id or str(uuid4()),
            school_id=school_id or str(uuid4()),
            quantity=quantity,
            min_stock_alert=min_stock_alert,
            **kwargs
        )
    return _create


@pytest.fixture
def client_factory():
    """Factory for creating Client instances."""
    def _create(
        id: str = None,
        school_id: str = None,
        code: str = None,
        name: str = "Test Client",
        is_active: bool = True,
        **kwargs
    ) -> Client:
        return Client(
            id=id or str(uuid4()),
            school_id=school_id or str(uuid4()),
            code=code or f"CLI-{uuid4().hex[:4].upper()}",
            name=name,
            is_active=is_active,
            **kwargs
        )
    return _create


@pytest.fixture
def sale_factory():
    """Factory for creating Sale instances."""
    def _create(
        id: str = None,
        school_id: str = None,
        client_id: str = None,
        user_id: str = None,
        code: str = None,
        status: SaleStatus = SaleStatus.COMPLETED,
        total: Decimal = Decimal("100000"),
        paid_amount: Decimal = Decimal("100000"),
        payment_method: PaymentMethod = PaymentMethod.CASH,
        **kwargs
    ) -> Sale:
        return Sale(
            id=id or str(uuid4()),
            school_id=school_id or str(uuid4()),
            client_id=client_id,
            user_id=user_id or str(uuid4()),
            code=code or f"VNT-2025-{uuid4().hex[:4].upper()}",
            status=status,
            total=total,
            paid_amount=paid_amount,
            payment_method=payment_method,
            **kwargs
        )
    return _create


@pytest.fixture
def sale_item_factory():
    """Factory for creating SaleItem instances."""
    def _create(
        id: str = None,
        sale_id: str = None,
        product_id: str = None,
        quantity: int = 1,
        unit_price: Decimal = Decimal("50000"),
        **kwargs
    ) -> SaleItem:
        subtotal = unit_price * quantity
        return SaleItem(
            id=id or str(uuid4()),
            sale_id=sale_id or str(uuid4()),
            product_id=product_id or str(uuid4()),
            quantity=quantity,
            unit_price=unit_price,
            subtotal=subtotal,
            **kwargs
        )
    return _create


@pytest.fixture
def order_factory():
    """Factory for creating Order instances."""
    def _create(
        id: str = None,
        school_id: str = None,
        client_id: str = None,
        user_id: str = None,
        code: str = None,
        status: OrderStatus = OrderStatus.PENDING,
        subtotal: Decimal = Decimal("100000"),
        tax: Decimal = Decimal("19000"),
        total: Decimal = Decimal("119000"),
        paid_amount: Decimal = Decimal("0"),
        **kwargs
    ) -> Order:
        return Order(
            id=id or str(uuid4()),
            school_id=school_id or str(uuid4()),
            client_id=client_id or str(uuid4()),
            user_id=user_id or str(uuid4()),
            code=code or f"ENC-2025-{uuid4().hex[:4].upper()}",
            status=status,
            subtotal=subtotal,
            tax=tax,
            total=total,
            paid_amount=paid_amount,
            **kwargs
        )
    return _create


# ============================================================================
# SAMPLE DATA FIXTURES - Pre-created test data
# ============================================================================

@pytest.fixture
def sample_school(school_factory) -> School:
    """Provide a sample school for testing."""
    return school_factory(
        id=str(uuid4()),
        code="IE-CARACAS",
        name="I.E. Caracas"
    )


@pytest.fixture
def sample_user(user_factory) -> User:
    """Provide a sample user for testing."""
    return user_factory(
        id="user-001",
        username="admin",
        email="admin@test.com",
        is_superuser=True
    )


@pytest.fixture
def sample_products(product_factory, sample_school) -> list[Product]:
    """Provide sample products for testing."""
    return [
        product_factory(
            id="prod-001",
            school_id=sample_school.id,
            code="PRD-0001",
            name="Camisa Blanca T12",
            size="T12",
            price=Decimal("45000")
        ),
        product_factory(
            id="prod-002",
            school_id=sample_school.id,
            code="PRD-0002",
            name="Camisa Blanca T14",
            size="T14",
            price=Decimal("48000")
        ),
        product_factory(
            id="prod-003",
            school_id=sample_school.id,
            code="PRD-0003",
            name="Pantalón Azul T12",
            size="T12",
            price=Decimal("55000")
        ),
    ]


@pytest.fixture
def sample_inventories(inventory_factory, sample_products, sample_school) -> list[Inventory]:
    """Provide sample inventories for testing."""
    return [
        inventory_factory(
            id=f"inv-{prod.id}",
            product_id=prod.id,
            school_id=sample_school.id,
            quantity=50,
            min_stock_alert=5
        )
        for prod in sample_products
    ]


@pytest.fixture
def sample_client(client_factory, sample_school) -> Client:
    """Provide a sample client for testing."""
    return client_factory(
        id="client-001",
        school_id=sample_school.id,
        code="CLI-0001",
        name="María García",
        email="maria@test.com",
        phone="3001234567",
        student_name="Juan García",
        student_grade="5A"
    )


# ============================================================================
# MOCK SERVICE FIXTURES - For unit tests
# ============================================================================

@pytest.fixture
def mock_inventory_service():
    """Create a mock InventoryService for unit tests."""
    service = AsyncMock()
    service.check_availability = AsyncMock(return_value=True)
    service.reserve_stock = AsyncMock()
    service.release_stock = AsyncMock()
    service.add_stock = AsyncMock()
    service.remove_stock = AsyncMock()
    service.get_by_product = AsyncMock()
    return service


@pytest.fixture
def mock_transaction_service():
    """Create a mock TransactionService for unit tests."""
    service = AsyncMock()
    service.create_sale_transaction = AsyncMock()
    service.create_order_transaction = AsyncMock()
    service.create_transaction = AsyncMock()
    service.get_daily_totals = AsyncMock()
    return service


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def assert_decimal_equal(actual: Decimal, expected: Decimal, places: int = 2):
    """Assert two decimals are equal within precision."""
    assert round(actual, places) == round(expected, places), \
        f"Expected {expected}, got {actual}"


def create_sale_data(
    client_id: str = None,
    items: list = None,
    payment_method: str = "cash",
    notes: str = None
) -> dict:
    """Helper to create sale request data."""
    return {
        "client_id": client_id,
        "items": items or [],
        "payment_method": payment_method,
        "notes": notes
    }


def create_sale_item_data(
    product_id: str,
    quantity: int = 1
) -> dict:
    """Helper to create sale item data."""
    return {
        "product_id": product_id,
        "quantity": quantity
    }
