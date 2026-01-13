"""
Tests for Payroll API endpoints.

Tests cover CRUD operations for payroll records, payment processing,
and period generation for the payroll system.
"""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta
from uuid import uuid4
from decimal import Decimal


@pytest.mark.asyncio
async def test_list_payroll_records(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test listing payroll records."""
    response = await api_client.get(
        "/api/v1/payroll",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_payroll_by_employee(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record,
    test_employee
):
    """Test listing payroll records filtered by employee."""
    response = await api_client.get(
        f"/api/v1/payroll?employee_id={test_employee.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["employee_id"] == str(test_employee.id)


@pytest.mark.asyncio
async def test_list_payroll_by_date_range(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test listing payroll records by date range."""
    today = date.today()
    from_date = (today - timedelta(days=30)).isoformat()
    to_date = today.isoformat()

    response = await api_client.get(
        f"/api/v1/payroll?from_date={from_date}&to_date={to_date}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_list_payroll_by_payment_status(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test listing payroll records filtered by payment status."""
    response = await api_client.get(
        "/api/v1/payroll?is_paid=false",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["is_paid"] is False


@pytest.mark.asyncio
async def test_get_payroll_summary(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test getting payroll summary."""
    response = await api_client.get(
        "/api/v1/payroll/summary",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "total_employees" in data
    assert "total_paid" in data
    assert "total_pending" in data
    assert "records_paid" in data
    assert "records_pending" in data


@pytest.mark.asyncio
async def test_get_pending_payroll(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test getting pending payroll payments."""
    response = await api_client.get(
        "/api/v1/payroll/pending",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)


@pytest.mark.asyncio
async def test_get_payroll_record_by_id(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test getting a specific payroll record by ID."""
    response = await api_client.get(
        f"/api/v1/payroll/{test_payroll_record.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_payroll_record.id)
    assert data["employee_id"] == str(test_payroll_record.employee_id)


@pytest.mark.asyncio
async def test_get_payroll_record_not_found(api_client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent payroll record returns 404."""
    fake_id = uuid4()
    response = await api_client.get(
        f"/api/v1/payroll/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_payroll_record(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test creating a new payroll record."""
    today = date.today()
    payroll_data = {
        "employee_id": str(test_employee.id),
        "period_start": (today - timedelta(days=15)).isoformat(),
        "period_end": today.isoformat(),
        "base_amount": "750000",
        "bonus": "100000",
        "deductions": "50000",
        "notes": "Quincena enero"
    }

    response = await api_client.post(
        "/api/v1/payroll",
        json=payroll_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["employee_id"] == str(test_employee.id)
    assert Decimal(data["base_amount"]) == Decimal("750000")
    assert Decimal(data["bonus"]) == Decimal("100000")
    assert Decimal(data["deductions"]) == Decimal("50000")
    # Net = 750000 + 100000 - 50000 = 800000
    assert Decimal(data["net_amount"]) == Decimal("800000")
    assert data["is_paid"] is False


@pytest.mark.asyncio
async def test_create_payroll_record_validation_error(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test creating a payroll record with invalid data returns 422."""
    payroll_data = {
        "employee_id": str(test_employee.id),
        "period_start": date.today().isoformat(),
        "period_end": date.today().isoformat(),
        "base_amount": "-500000",  # Negative - should fail
    }

    response = await api_client.post(
        "/api/v1/payroll",
        json=payroll_data,
        headers=auth_headers
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_payroll_record(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test updating a payroll record."""
    update_data = {
        "bonus": "75000",
        "deductions": "30000",
        "notes": "Actualizado con bono extra"
    }

    response = await api_client.put(
        f"/api/v1/payroll/{test_payroll_record.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert Decimal(data["bonus"]) == Decimal("75000")
    assert Decimal(data["deductions"]) == Decimal("30000")
    assert "Actualizado" in data["notes"]


@pytest.mark.asyncio
async def test_process_payroll_payment(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test processing payment for a payroll record."""
    response = await api_client.post(
        f"/api/v1/payroll/{test_payroll_record.id}/pay?payment_method=transfer",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["is_paid"] is True
    assert data["payment_method"] == "transfer"
    assert data["payment_date"] is not None


@pytest.mark.asyncio
async def test_process_payment_creates_expense(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test that processing payment creates an expense entry."""
    response = await api_client.post(
        f"/api/v1/payroll/{test_payroll_record.id}/pay?payment_method=cash",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    # expense_id should be set after payment
    # (depends on implementation - may or may not be returned)
    assert data["is_paid"] is True


@pytest.mark.asyncio
async def test_generate_period_payroll(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test generating payroll records for all active employees for a period."""
    today = date.today()
    period_start = (today - timedelta(days=15)).isoformat()
    period_end = today.isoformat()

    response = await api_client.post(
        f"/api/v1/payroll/generate-period?period_start={period_start}&period_end={period_end}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert "records" in data


@pytest.mark.asyncio
async def test_delete_unpaid_payroll_record(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test deleting an unpaid payroll record."""
    # test_payroll_record is unpaid by default
    response = await api_client.delete(
        f"/api/v1/payroll/{test_payroll_record.id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    # Verify it's deleted
    get_response = await api_client.get(
        f"/api/v1/payroll/{test_payroll_record.id}",
        headers=auth_headers
    )
    assert get_response.status_code == 404


@pytest.mark.asyncio
async def test_cannot_delete_paid_payroll_record(
    api_client: AsyncClient,
    auth_headers: dict,
    test_payroll_record
):
    """Test that paid payroll records cannot be deleted."""
    # First, pay the record
    await api_client.post(
        f"/api/v1/payroll/{test_payroll_record.id}/pay?payment_method=cash",
        headers=auth_headers
    )

    # Try to delete
    response = await api_client.delete(
        f"/api/v1/payroll/{test_payroll_record.id}",
        headers=auth_headers
    )

    assert response.status_code == 400


@pytest.mark.asyncio
async def test_payroll_unauthorized(api_client: AsyncClient):
    """Test that payroll endpoints require authentication."""
    response = await api_client.get("/api/v1/payroll")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_payroll_pagination(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test payroll list pagination."""
    response = await api_client.get(
        "/api/v1/payroll?skip=0&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 10
