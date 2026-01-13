"""
Tests for Fixed Expenses API endpoints.

Tests cover CRUD operations for fixed/recurring expenses management
including rent, utilities, and other recurring business expenses.
"""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta
from uuid import uuid4
from decimal import Decimal


@pytest.mark.asyncio
async def test_list_fixed_expenses(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test listing fixed expenses."""
    response = await api_client.get(
        "/api/v1/fixed-expenses",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_fixed_expenses_by_category(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test listing fixed expenses filtered by category."""
    response = await api_client.get(
        "/api/v1/fixed-expenses?category=rent",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["category"] == "rent"


@pytest.mark.asyncio
async def test_list_fixed_expenses_active_only(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test listing only active fixed expenses."""
    response = await api_client.get(
        "/api/v1/fixed-expenses?is_active=true",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["is_active"] is True


@pytest.mark.asyncio
async def test_get_upcoming_expenses(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test getting upcoming fixed expenses for the next N days."""
    response = await api_client.get(
        "/api/v1/fixed-expenses/upcoming?days=30",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_fixed_expense_by_id(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test getting a specific fixed expense by ID."""
    response = await api_client.get(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_fixed_expense.id)
    assert data["name"] == test_fixed_expense.name
    assert data["category"] == test_fixed_expense.category


@pytest.mark.asyncio
async def test_get_fixed_expense_not_found(api_client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent fixed expense returns 404."""
    fake_id = uuid4()
    response = await api_client.get(
        f"/api/v1/fixed-expenses/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_fixed_expense(api_client: AsyncClient, auth_headers: dict):
    """Test creating a new fixed expense."""
    expense_data = {
        "name": "Servicios Públicos",
        "category": "utilities",
        "description": "Agua, luz, gas mensual",
        "base_amount": "450000",
        "recurrence_type": "monthly",
        "recurrence_day": 15
    }

    response = await api_client.post(
        "/api/v1/fixed-expenses",
        json=expense_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Servicios Públicos"
    assert data["category"] == "utilities"
    assert Decimal(data["base_amount"]) == Decimal("450000")
    assert data["recurrence_type"] == "monthly"
    assert data["recurrence_day"] == 15
    assert data["is_active"] is True


@pytest.mark.asyncio
async def test_create_fixed_expense_with_different_recurrence(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test creating fixed expenses with different recurrence types."""
    # Weekly expense
    expense_data = {
        "name": "Limpieza Local",
        "category": "services",
        "base_amount": "100000",
        "recurrence_type": "weekly",
        "recurrence_day": 1  # Monday
    }

    response = await api_client.post(
        "/api/v1/fixed-expenses",
        json=expense_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["recurrence_type"] == "weekly"


@pytest.mark.asyncio
async def test_create_fixed_expense_validation_error(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test creating a fixed expense with invalid data returns 422."""
    expense_data = {
        "name": "",  # Empty - should fail
        "category": "rent",
        "base_amount": "-100000"  # Negative - should fail
    }

    response = await api_client.post(
        "/api/v1/fixed-expenses",
        json=expense_data,
        headers=auth_headers
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_fixed_expense(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test updating a fixed expense."""
    update_data = {
        "name": "Arriendo Local Actualizado",
        "base_amount": "2200000",
        "description": "Incluye administración"
    }

    response = await api_client.put(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "Actualizado" in data["name"]
    assert Decimal(data["base_amount"]) == Decimal("2200000")


@pytest.mark.asyncio
async def test_deactivate_fixed_expense(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test deactivating a fixed expense."""
    response = await api_client.delete(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    # Verify it's deactivated, not deleted
    get_response = await api_client.get(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}",
        headers=auth_headers
    )
    assert get_response.status_code == 200
    assert get_response.json()["is_active"] is False


@pytest.mark.asyncio
async def test_create_expense_record(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test recording a payment for a fixed expense."""
    today = date.today()
    record_data = {
        "amount": "2000000",
        "payment_date": today.isoformat(),
        "payment_method": "transfer",
        "period_start": (today.replace(day=1)).isoformat(),
        "period_end": today.isoformat(),
        "notes": "Pago mes enero"
    }

    response = await api_client.post(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}/records",
        json=record_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert Decimal(data["amount"]) == Decimal("2000000")
    assert data["payment_method"] == "transfer"
    assert data["fixed_expense_id"] == str(test_fixed_expense.id)


@pytest.mark.asyncio
async def test_create_expense_record_for_nonexistent_expense(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test recording payment for non-existent fixed expense returns 404."""
    fake_id = uuid4()
    record_data = {
        "amount": "100000",
        "payment_date": date.today().isoformat(),
        "payment_method": "cash"
    }

    response = await api_client.post(
        f"/api/v1/fixed-expenses/{fake_id}/records",
        json=record_data,
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_get_expense_records(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test getting payment records for a fixed expense."""
    response = await api_client.get(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}/records",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_expense_records_with_date_range(
    api_client: AsyncClient,
    auth_headers: dict,
    test_fixed_expense
):
    """Test getting payment records filtered by date range."""
    today = date.today()
    from_date = (today - timedelta(days=30)).isoformat()
    to_date = today.isoformat()

    response = await api_client.get(
        f"/api/v1/fixed-expenses/{test_fixed_expense.id}/records"
        f"?from_date={from_date}&to_date={to_date}",
        headers=auth_headers
    )

    assert response.status_code == 200


@pytest.mark.asyncio
async def test_fixed_expenses_unauthorized(api_client: AsyncClient):
    """Test that fixed expenses endpoints require authentication."""
    response = await api_client.get("/api/v1/fixed-expenses")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_fixed_expenses_pagination(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test fixed expenses list pagination."""
    response = await api_client.get(
        "/api/v1/fixed-expenses?skip=0&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 10
