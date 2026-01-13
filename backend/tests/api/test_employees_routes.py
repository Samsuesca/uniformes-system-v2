"""
Tests for Employees API endpoints.

Tests cover CRUD operations for employee management in the payroll system.
"""
import pytest
from httpx import AsyncClient
from datetime import date
from uuid import uuid4
from decimal import Decimal


@pytest.mark.asyncio
async def test_list_employees(api_client: AsyncClient, auth_headers: dict, test_employee):
    """Test listing employees."""
    response = await api_client.get(
        "/api/v1/employees",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert isinstance(data["items"], list)


@pytest.mark.asyncio
async def test_list_employees_by_status(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test listing employees filtered by status."""
    response = await api_client.get(
        "/api/v1/employees?status=active",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    for item in data["items"]:
        assert item["status"] == "active"


@pytest.mark.asyncio
async def test_list_employees_with_search(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test searching employees by name or position."""
    response = await api_client.get(
        "/api/v1/employees?search=María",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data


@pytest.mark.asyncio
async def test_get_employee_by_id(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test getting a specific employee by ID."""
    response = await api_client.get(
        f"/api/v1/employees/{test_employee.id}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == str(test_employee.id)
    assert data["first_name"] == test_employee.first_name
    assert data["last_name"] == test_employee.last_name
    assert data["position"] == test_employee.position


@pytest.mark.asyncio
async def test_get_employee_not_found(api_client: AsyncClient, auth_headers: dict):
    """Test getting a non-existent employee returns 404."""
    fake_id = uuid4()
    response = await api_client.get(
        f"/api/v1/employees/{fake_id}",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_create_employee(api_client: AsyncClient, auth_headers: dict):
    """Test creating a new employee."""
    employee_data = {
        "first_name": "Carlos",
        "last_name": "Rodríguez",
        "document_type": "CC",
        "document_number": "987654321",
        "phone": "3109876543",
        "email": "carlos@test.com",
        "address": "Carrera 50 #30-20",
        "position": "Vendedor",
        "hire_date": date.today().isoformat(),
        "base_salary": "1400000",
        "payment_frequency": "biweekly",
        "bank_name": "Bancolombia",
        "bank_account": "12345678901"
    }

    response = await api_client.post(
        "/api/v1/employees",
        json=employee_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "Carlos"
    assert data["last_name"] == "Rodríguez"
    assert data["position"] == "Vendedor"
    assert Decimal(data["base_salary"]) == Decimal("1400000")
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_create_employee_minimal_data(api_client: AsyncClient, auth_headers: dict):
    """Test creating an employee with minimal required data."""
    employee_data = {
        "first_name": "Ana",
        "last_name": "Martínez",
        "document_number": "111222333",
        "position": "Auxiliar",
        "hire_date": date.today().isoformat(),
        "base_salary": "1300000"
    }

    response = await api_client.post(
        "/api/v1/employees",
        json=employee_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["first_name"] == "Ana"
    assert data["document_type"] == "CC"  # Default value


@pytest.mark.asyncio
async def test_create_employee_duplicate_document(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test creating an employee with duplicate document number fails."""
    employee_data = {
        "first_name": "Duplicate",
        "last_name": "Employee",
        "document_number": test_employee.document_number,  # Same as existing
        "position": "Test",
        "hire_date": date.today().isoformat(),
        "base_salary": "1000000"
    }

    response = await api_client.post(
        "/api/v1/employees",
        json=employee_data,
        headers=auth_headers
    )

    # Should fail due to unique constraint
    assert response.status_code in [400, 409, 422, 500]


@pytest.mark.asyncio
async def test_create_employee_validation_error(api_client: AsyncClient, auth_headers: dict):
    """Test creating an employee with invalid data returns 422."""
    employee_data = {
        "first_name": "",  # Empty - should fail
        "last_name": "Test",
        "document_number": "123",
        "position": "Test",
        "hire_date": date.today().isoformat(),
        "base_salary": "-1000"  # Negative - should fail
    }

    response = await api_client.post(
        "/api/v1/employees",
        json=employee_data,
        headers=auth_headers
    )

    assert response.status_code == 422


@pytest.mark.asyncio
async def test_update_employee(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test updating an employee."""
    update_data = {
        "phone": "3201112222",
        "position": "Jefe de Costura",
        "base_salary": "1800000"
    }

    response = await api_client.put(
        f"/api/v1/employees/{test_employee.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["phone"] == "3201112222"
    assert data["position"] == "Jefe de Costura"
    assert Decimal(data["base_salary"]) == Decimal("1800000")


@pytest.mark.asyncio
async def test_update_employee_status(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test updating employee status."""
    update_data = {
        "status": "on_leave"
    }

    response = await api_client.put(
        f"/api/v1/employees/{test_employee.id}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "on_leave"


@pytest.mark.asyncio
async def test_deactivate_employee(
    api_client: AsyncClient,
    auth_headers: dict,
    test_employee
):
    """Test deactivating an employee (soft delete)."""
    response = await api_client.delete(
        f"/api/v1/employees/{test_employee.id}",
        headers=auth_headers
    )

    assert response.status_code == 200

    # Verify employee is now inactive
    get_response = await api_client.get(
        f"/api/v1/employees/{test_employee.id}",
        headers=auth_headers
    )
    assert get_response.status_code == 200
    assert get_response.json()["status"] == "inactive"


@pytest.mark.asyncio
async def test_employees_unauthorized(api_client: AsyncClient):
    """Test that employees endpoints require authentication."""
    response = await api_client.get("/api/v1/employees")
    assert response.status_code == 401


@pytest.mark.asyncio
async def test_list_employees_pagination(
    api_client: AsyncClient,
    auth_headers: dict
):
    """Test employees list pagination."""
    response = await api_client.get(
        "/api/v1/employees?skip=0&limit=5",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert len(data["items"]) <= 5
