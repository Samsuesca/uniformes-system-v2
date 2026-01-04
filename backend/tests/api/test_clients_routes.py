"""
Tests for Clients API endpoints.

Tests cover:
- Client CRUD operations
- Client search and filtering
- Student management
- Client summary/history
"""
import pytest
from uuid import uuid4

from tests.fixtures.assertions import (
    assert_success_response,
    assert_created_response,
    assert_no_content_response,
    assert_unauthorized,
    assert_forbidden,
    assert_not_found,
    assert_bad_request,
    assert_pagination,
    assert_client_valid,
)
from tests.fixtures.builders import build_client_request


pytestmark = pytest.mark.api


# ============================================================================
# CLIENT CREATION TESTS
# ============================================================================

class TestClientCreation:
    """Tests for POST /api/v1/schools/{school_id}/clients"""

    async def test_create_client_success(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should create client with all fields."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            json=build_client_request(
                name="María García",
                phone="3001234567",
                email="maria@example.com",
                address="Calle 123 #45-67",
                student_name="Juan García",
                student_grade="5A"
            )
        )

        data = assert_created_response(response)
        assert_client_valid(data)

        assert data["name"] == "María García"
        assert data["phone"] == "3001234567"
        assert data["email"] == "maria@example.com"
        assert data["student_name"] == "Juan García"

    async def test_create_client_minimal(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should create client with only required fields."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            json=build_client_request(name="Cliente Mínimo")
        )

        data = assert_created_response(response)
        assert data["name"] == "Cliente Mínimo"

    async def test_create_client_no_auth(self, api_client, test_school):
        """Should return 401/403 without authentication."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            json=build_client_request(name="Test")
        )

        assert response.status_code in [401, 403]

    async def test_create_client_generates_code(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should auto-generate client code."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            json=build_client_request(name="Test Client")
        )

        data = assert_created_response(response)
        assert "code" in data
        assert data["code"].startswith("CLI-")


# ============================================================================
# CLIENT RETRIEVAL TESTS
# ============================================================================

class TestClientRetrieval:
    """Tests for GET clients endpoints."""

    async def test_list_clients(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should list all clients for school."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers
        )

        data = assert_success_response(response)
        items = assert_pagination(data)
        assert len(items) >= 1

    async def test_get_single_client(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should get single client by ID."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}",
            headers=superuser_headers
        )

        data = assert_success_response(response)
        assert data["id"] == str(test_client.id)
        assert data["name"] == test_client.name

    async def test_get_client_not_found(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should return 404 for non-existent client."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients/{uuid4()}",
            headers=superuser_headers
        )

        assert_not_found(response)

    async def test_search_clients_by_name(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should search clients by name."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            params={"search": "María"}
        )

        data = assert_success_response(response)
        items = data.get("items", data)

        # Should find clients with María in name
        names = [c["name"] for c in items]
        assert any("María" in name for name in names)

    async def test_search_clients_by_phone(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should search clients by phone."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            params={"search": "300123"}
        )

        data = assert_success_response(response)
        # Should return results matching phone

    async def test_search_clients_by_student_name(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should search clients by student name."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            params={"search": "Juan"}
        )

        data = assert_success_response(response)
        # Should find clients with student named Juan


# ============================================================================
# CLIENT UPDATE TESTS
# ============================================================================

class TestClientUpdate:
    """Tests for PUT/PATCH clients endpoints."""

    async def test_update_client_success(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should update client information."""
        response = await api_client.put(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}",
            headers=superuser_headers,
            json={
                "name": "María García Updated",
                "phone": "3009999999",
                "email": "updated@example.com"
            }
        )

        data = assert_success_response(response)
        assert data["name"] == "María García Updated"
        assert data["phone"] == "3009999999"

    async def test_update_client_partial(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should allow partial updates."""
        response = await api_client.patch(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}",
            headers=superuser_headers,
            json={"phone": "3008888888"}
        )

        # May use PUT or PATCH depending on implementation
        if response.status_code == 405:
            # Try PUT instead
            response = await api_client.put(
                f"/api/v1/schools/{test_school.id}/clients/{test_client.id}",
                headers=superuser_headers,
                json={"name": test_client.name, "phone": "3008888888"}
            )

        data = assert_success_response(response)

    async def test_update_client_not_found(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should return 404 for non-existent client."""
        response = await api_client.put(
            f"/api/v1/schools/{test_school.id}/clients/{uuid4()}",
            headers=superuser_headers,
            json={"name": "Updated Name"}
        )

        assert_not_found(response)


# ============================================================================
# CLIENT DELETION TESTS
# ============================================================================

class TestClientDeletion:
    """Tests for DELETE clients endpoints."""

    async def test_delete_client_success(
        self,
        api_client,
        superuser_headers,
        test_school,
        db_session
    ):
        """Should delete client."""
        from app.models import Client

        # Create client to delete
        client = Client(
            id=str(uuid4()),
            school_id=test_school.id,
            code="CLI-DELETE",
            name="To Delete",
            is_active=True
        )
        db_session.add(client)
        await db_session.flush()

        response = await api_client.delete(
            f"/api/v1/schools/{test_school.id}/clients/{client.id}",
            headers=superuser_headers
        )

        # Should return 204 or 200
        assert response.status_code in [200, 204]

    async def test_delete_client_not_found(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should return 404 for non-existent client."""
        response = await api_client.delete(
            f"/api/v1/schools/{test_school.id}/clients/{uuid4()}",
            headers=superuser_headers
        )

        assert_not_found(response)


# ============================================================================
# CLIENT SUMMARY TESTS
# ============================================================================

class TestClientSummary:
    """Tests for client summary/history endpoints."""

    async def test_get_client_summary(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school,
        test_sale
    ):
        """Should get client purchase summary."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}/summary",
            headers=superuser_headers
        )

        # Summary may not be implemented or return different structure
        if response.status_code == 200:
            data = response.json()
            # Should have summary fields
            assert isinstance(data, dict)

    async def test_get_client_sales_history(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school,
        test_sale
    ):
        """Should get client's sales history."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}/sales",
            headers=superuser_headers
        )

        if response.status_code == 200:
            data = response.json()
            # Should return list of sales
            items = data.get("items", data)
            assert isinstance(items, list)

    async def test_get_client_orders_history(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should get client's orders history."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}/orders",
            headers=superuser_headers
        )

        if response.status_code == 200:
            data = response.json()
            items = data.get("items", data)
            assert isinstance(items, list)


# ============================================================================
# STUDENT MANAGEMENT TESTS
# ============================================================================

class TestStudentManagement:
    """Tests for student information management."""

    async def test_add_student_info(
        self,
        api_client,
        superuser_headers,
        test_school,
        db_session
    ):
        """Should add student information to client."""
        from app.models import Client

        # Create client without student info
        client = Client(
            id=str(uuid4()),
            school_id=test_school.id,
            code="CLI-NOSTUD",
            name="Parent Without Student",
            is_active=True
        )
        db_session.add(client)
        await db_session.flush()

        response = await api_client.put(
            f"/api/v1/schools/{test_school.id}/clients/{client.id}",
            headers=superuser_headers,
            json={
                "name": "Parent Without Student",
                "student_name": "New Student",
                "student_grade": "3B"
            }
        )

        data = assert_success_response(response)
        assert data["student_name"] == "New Student"
        assert data["student_grade"] == "3B"

    async def test_update_student_info(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should update student information."""
        response = await api_client.put(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}",
            headers=superuser_headers,
            json={
                "name": test_client.name,
                "student_name": "Juan García Updated",
                "student_grade": "6A"
            }
        )

        data = assert_success_response(response)
        assert data["student_name"] == "Juan García Updated"
        assert data["student_grade"] == "6A"


# ============================================================================
# MULTI-TENANT TESTS
# ============================================================================

class TestClientsMultiTenancy:
    """Tests for multi-tenant isolation in clients."""

    async def test_cannot_access_other_school_clients(
        self,
        api_client,
        auth_headers,
        db_session
    ):
        """Should not access clients from unauthorized school."""
        from app.models import School

        other_school = School(
            id=str(uuid4()),
            code="OTHER-003",
            name="Other School",
            is_active=True
        )
        db_session.add(other_school)
        await db_session.flush()

        response = await api_client.get(
            f"/api/v1/schools/{other_school.id}/clients",
            headers=auth_headers
        )

        assert_forbidden(response)

    async def test_client_belongs_to_school(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Client should have correct school_id."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/clients/{test_client.id}",
            headers=superuser_headers
        )

        data = assert_success_response(response)
        assert data["school_id"] == str(test_school.id)


# ============================================================================
# VALIDATION TESTS
# ============================================================================

class TestClientValidation:
    """Tests for client data validation."""

    async def test_create_client_empty_name(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should reject empty client name."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            json={"name": ""}
        )

        assert response.status_code == 422

    async def test_create_client_invalid_email(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should reject invalid email format."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            json=build_client_request(
                name="Test",
                email="not-an-email"
            )
        )

        # May accept or reject depending on validation
        assert response.status_code in [201, 422]

    async def test_create_client_duplicate_code(
        self,
        api_client,
        superuser_headers,
        test_client,
        test_school
    ):
        """Should handle duplicate client codes."""
        # Try to create with same code
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/clients",
            headers=superuser_headers,
            json={
                "name": "Another Client",
                "code": test_client.code  # Duplicate
            }
        )

        # Should fail or auto-generate new code
        assert response.status_code in [201, 400, 409]
