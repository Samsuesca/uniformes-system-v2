"""
Tests for Alterations API endpoints.

Tests cover CRUD operations, status management, and payment registration
for the alterations (arreglos) module.
"""
import pytest
from httpx import AsyncClient
from datetime import date, timedelta
from uuid import uuid4
from decimal import Decimal


@pytest.mark.asyncio
async def test_list_alterations(api_client: AsyncClient, auth_headers: dict, test_alteration):
    """Test listing alterations."""
    response = await api_client.get(
        "/api/v1/alterations",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_alterations_with_status_filter(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test listing alterations filtered by status."""
    response = await api_client.get(
        "/api/v1/alterations?status=pending",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    # All returned items should have pending status
    for item in data["items"]:
        assert item["status"] == "pending"


@pytest.mark.asyncio
async def test_list_alterations_with_date_range(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test listing alterations with date range filter."""
    today = date.today()
    from_date = (today - timedelta(days=7)).isoformat()
    to_date = today.isoformat()

    response = await api_client.get(
        f"/api/v1/alterations?from_date={from_date}&to_date={to_date}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_list_alterations_with_search(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test searching alterations by client name or garment description."""
    response = await api_client.get(
        "/api/v1/alterations?search=Pantalón",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_get_alteration_stats(api_client: AsyncClient, auth_headers: dict):
    """Test getting alteration statistics."""
    response = await api_client.get(
        "/api/v1/alterations/stats",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "by_status" in data
    assert "total_revenue" in data
    assert "total_pending" in data


@pytest.mark.asyncio
async def test_get_alteration_by_id(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test getting a specific alteration by ID."""
    response = await api_client.get(
        f"/api/v1/alterations/{test_alteration.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_alteration.id)
    assert data["client_name"] == test_alteration.client_name
    assert data["garment_description"] == test_alteration.garment_description


@pytest.mark.asyncio
async def test_get_alteration_not_found(api_client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent alteration returns 404."""
    fake_id = uuid4()
    response = await api_client.get(
        f"/api/v1/alterations/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_alteration(api_client: AsyncClient, auth_headers: dict, test_school):
    """Test creating a new alteration."""
    alteration_data = {
        "client_name": "Juan Pérez",
        "client_phone": "3009876543",
        "school_id": str(test_school.id),
        "garment_description": "Falda azul talla 10",
        "alteration_type": "Ruedo",
        "description": "Subir ruedo 5cm",
        "price": "20000",
        "deposit": "10000",
        "payment_method": "cash",
        "received_date": date.today().isoformat(),
        "promised_date": (date.today() + timedelta(days=3)).isoformat()
    }

    response = await api_client.post(
        "/api/v1/alterations",
        json=alteration_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["client_name"] == "Juan Pérez"
    assert data["alteration_type"] == "Ruedo"
    assert Decimal(data["price"]) == Decimal("20000")
    assert Decimal(data["deposit"]) == Decimal("10000")
    assert data["payment_status"] == "partial"  # Has deposit but not fully paid


@pytest.mark.asyncio
async def test_create_alteration_without_deposit(api_client: AsyncClient, auth_headers: dict):
    """Test creating an alteration without initial deposit."""
    alteration_data = {
        "client_name": "María López",
        "garment_description": "Pantalón negro talla M",
        "alteration_type": "Cintura",
        "price": "25000",
        "received_date": date.today().isoformat()
    }

    response = await api_client.post(
        "/api/v1/alterations",
        json=alteration_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["payment_status"] == "pending"
    assert Decimal(data["deposit"]) == Decimal("0")


@pytest.mark.asyncio
async def test_create_alteration_validation_error(api_client: AsyncClient, auth_headers: dict):
    """Test creating an alteration with invalid data returns 422."""
    alteration_data = {
        "client_name": "",  # Empty name - should fail
        "garment_description": "Test",
        "alteration_type": "Bota",
        "price": "-100",  # Negative price - should fail
        "received_date": date.today().isoformat()
    }

    response = await api_client.post(
        "/api/v1/alterations",
        json=alteration_data,
        headers=auth_headers
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_alteration(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test updating an alteration."""
    update_data = {
        "garment_description": "Pantalón azul talla 14 (actualizado)",
        "price": "18000",
        "promised_date": (date.today() + timedelta(days=5)).isoformat()
    }

    response = await api_client.put(
        f"/api/v1/alterations/{test_alteration.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "actualizado" in data["garment_description"]
    assert Decimal(data["price"]) == Decimal("18000")


@pytest.mark.asyncio
async def test_update_alteration_status(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test updating alteration status."""
    response = await api_client.post(
        f"/api/v1/alterations/{test_alteration.id}/status?status=in_progress",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "in_progress"


@pytest.mark.asyncio
async def test_update_alteration_status_to_completed(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test marking alteration as completed sets completed_date."""
    response = await api_client.post(
        f"/api/v1/alterations/{test_alteration.id}/status?status=completed",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "completed"
    assert data["completed_date"] is not None


@pytest.mark.asyncio
async def test_register_payment(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test registering a payment for an alteration."""
    payment_data = {
        "amount": "5000",
        "payment_method": "nequi"
    }

    response = await api_client.post(
        f"/api/v1/alterations/{test_alteration.id}/payment",
        json=payment_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    # Original deposit was 5000, adding 5000 more = 10000 total
    assert Decimal(data["deposit"]) == Decimal("10000")


@pytest.mark.asyncio
async def test_register_payment_completes_payment(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test that registering full remaining amount marks as paid."""
    # test_alteration has price=15000, deposit=5000, so remaining=10000
    payment_data = {
        "amount": "10000",
        "payment_method": "cash"
    }

    response = await api_client.post(
        f"/api/v1/alterations/{test_alteration.id}/payment",
        json=payment_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["payment_status"] == "paid"
    assert Decimal(data["deposit"]) >= Decimal(data["price"])


@pytest.mark.asyncio
async def test_delete_alteration(
    api_client: AsyncClient,
    auth_headers: dict,
    test_alteration
):
    """Test soft deleting an alteration (cancelling)."""
    response = await api_client.delete(
        f"/api/v1/alterations/{test_alteration.id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    # Verify it's cancelled, not actually deleted
    get_response = await api_client.get(
        f"/api/v1/alterations/{test_alteration.id}",
        headers=auth_headers
    )
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "cancelled"


@pytest.mark.asyncio
async def test_alterations_unauthorized(api_client: AsyncClient):
    """Test that alterations endpoints require authentication."""
    response = await api_client.get("/api/v1/alterations")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_alterations_pagination(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test alterations list pagination."""
    response = await api_client.get(
        "/api/v1/alterations?skip=0&limit=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 10
