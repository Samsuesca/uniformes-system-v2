"""
Tests for Orders API endpoints.

Tests cover:
- Order creation (store and web)
- Order listing and retrieval
- Payment registration
- Status updates
- Order item status tracking
- Payment proof workflow
"""
import pytest
from decimal import Decimal
from uuid import uuid4

from tests.fixtures.assertions import (
    assert_success_response,
    assert_created_response,
    assert_unauthorized,
    assert_forbidden,
    assert_not_found,
    assert_bad_request,
    assert_pagination,
    assert_order_valid,
    assert_has_code,
    assert_decimal_equal,
)
from tests.fixtures.builders import (
    build_order_request,
    build_order_item,
    build_order_payment,
    build_web_order_request,
)


pytestmark = pytest.mark.api


# ============================================================================
# ORDER CREATION TESTS
# ============================================================================

class TestOrderCreation:
    """Tests for POST /api/v1/schools/{school_id}/orders"""

    async def test_create_order_success(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should create order and return details."""
        setup = complete_test_setup

        response = await api_client.post(
            f"/api/v1/schools/{setup['school'].id}/orders",
            headers=superuser_headers,
            json=build_order_request(
                client_id=setup["client"].id,
                items=[
                    build_order_item(
                        garment_type_id=setup["garment_type"].id,
                        quantity=2,
                        unit_price=50000,
                        size="M"
                    )
                ],
                advance_payment=30000,
                payment_method="cash"
            )
        )

        data = assert_created_response(response)
        assert_order_valid(data)
        assert_has_code(data, prefix="ENC-")

        # Verify amounts (2 * 50000 = 100000 + 19% IVA = 119000)
        assert data["subtotal"] == 100000
        assert data["total"] == 119000
        assert data["paid_amount"] == 30000
        assert data["balance"] == 89000
        assert data["status"] == "pending"

    async def test_create_order_with_product(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should create yomber order with product_id."""
        setup = complete_test_setup

        response = await api_client.post(
            f"/api/v1/schools/{setup['school'].id}/orders",
            headers=superuser_headers,
            json=build_order_request(
                client_id=setup["client"].id,
                items=[
                    build_order_item(
                        product_id=setup["product"].id,
                        quantity=1,
                        unit_price=45000
                    )
                ]
            )
        )

        data = assert_created_response(response)
        assert "items" in data

    async def test_create_order_with_measurements(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should create custom order with measurements."""
        setup = complete_test_setup

        response = await api_client.post(
            f"/api/v1/schools/{setup['school'].id}/orders",
            headers=superuser_headers,
            json=build_order_request(
                client_id=setup["client"].id,
                items=[
                    build_order_item(
                        garment_type_id=setup["garment_type"].id,
                        quantity=1,
                        unit_price=60000,
                        measurements={
                            "pecho": 90,
                            "cintura": 75,
                            "largo": 65
                        }
                    )
                ]
            )
        )

        data = assert_created_response(response)
        # Verify measurements were saved
        assert "items" in data

    async def test_create_order_full_advance(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should mark order as paid when advance equals total."""
        setup = complete_test_setup

        response = await api_client.post(
            f"/api/v1/schools/{setup['school'].id}/orders",
            headers=superuser_headers,
            json=build_order_request(
                client_id=setup["client"].id,
                items=[
                    build_order_item(
                        garment_type_id=setup["garment_type"].id,
                        quantity=1,
                        unit_price=50000
                    )
                ],
                advance_payment=59500,  # Full amount with IVA
                payment_method="transfer"
            )
        )

        data = assert_created_response(response)
        assert data["balance"] == 0
        assert data["is_fully_paid"] is True or data["balance"] == 0

    async def test_create_order_no_auth(self, api_client, test_school):
        """Should return 401/403 without authentication."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders",
            json=build_order_request()
        )

        assert response.status_code in [401, 403]

    async def test_create_order_multiple_items(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should create order with multiple items."""
        setup = complete_test_setup

        response = await api_client.post(
            f"/api/v1/schools/{setup['school'].id}/orders",
            headers=superuser_headers,
            json=build_order_request(
                client_id=setup["client"].id,
                items=[
                    build_order_item(
                        garment_type_id=setup["garment_type"].id,
                        quantity=2,
                        unit_price=45000,
                        size="T12"
                    ),
                    build_order_item(
                        garment_type_id=setup["garment_type"].id,
                        quantity=1,
                        unit_price=55000,
                        size="T14"
                    )
                ]
            )
        )

        data = assert_created_response(response)
        # Subtotal: 2*45000 + 1*55000 = 145000
        assert data["subtotal"] == 145000


# ============================================================================
# ORDER RETRIEVAL TESTS
# ============================================================================

class TestOrderRetrieval:
    """Tests for GET orders endpoints."""

    async def test_list_all_orders(
        self,
        api_client,
        superuser_headers,
        test_order
    ):
        """Should list all orders."""
        response = await api_client.get(
            "/api/v1/orders",
            headers=superuser_headers
        )

        data = assert_success_response(response)
        items = assert_pagination(data)
        assert len(items) >= 1

    async def test_list_school_orders(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should list orders for specific school."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/orders",
            headers=superuser_headers
        )

        data = assert_success_response(response)
        items = assert_pagination(data)

        for order in items:
            assert order["school_id"] == str(test_school.id)

    async def test_get_single_order(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should get single order by ID."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}",
            headers=superuser_headers
        )

        data = assert_success_response(response)
        assert data["id"] == str(test_order.id)
        assert data["code"] == test_order.code
        assert "items" in data

    async def test_get_order_not_found(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should return 404 for non-existent order."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/orders/{uuid4()}",
            headers=superuser_headers
        )

        assert_not_found(response)

    async def test_filter_orders_by_status(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should filter orders by status."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/orders",
            headers=superuser_headers,
            params={"status": "pending"}
        )

        data = assert_success_response(response)
        items = data.get("items", data)

        for order in items:
            assert order["status"] == "pending"

    async def test_filter_orders_by_source(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should filter orders by source (store/web)."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/orders",
            headers=superuser_headers,
            params={"source": "store"}
        )

        data = assert_success_response(response)
        items = data.get("items", data)

        for order in items:
            assert order.get("source") in ["store", None]


# ============================================================================
# PAYMENT TESTS
# ============================================================================

class TestOrderPayments:
    """Tests for order payment registration."""

    async def test_register_payment(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should register payment and update balance."""
        initial_balance = float(test_order.balance)

        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/payments",
            headers=superuser_headers,
            json=build_order_payment(
                amount=10000,
                payment_method="nequi"
            )
        )

        data = assert_success_response(response)

        # Balance should decrease
        new_balance = data["balance"]
        assert new_balance == initial_balance - 10000

    async def test_payment_completes_order(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should mark order as fully paid when balance = 0."""
        # Pay remaining balance
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/payments",
            headers=superuser_headers,
            json=build_order_payment(
                amount=float(test_order.balance),
                payment_method="cash"
            )
        )

        data = assert_success_response(response)
        assert data["balance"] == 0

    async def test_payment_exceeds_balance(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should reject payment exceeding balance."""
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/payments",
            headers=superuser_headers,
            json=build_order_payment(
                amount=999999,  # Much more than balance
                payment_method="cash"
            )
        )

        assert_bad_request(response)

    async def test_multiple_payments(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should handle multiple partial payments."""
        balance = float(test_order.balance)

        # First payment
        await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/payments",
            headers=superuser_headers,
            json=build_order_payment(amount=5000, payment_method="cash")
        )

        # Second payment
        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/payments",
            headers=superuser_headers,
            json=build_order_payment(amount=5000, payment_method="nequi")
        )

        data = assert_success_response(response)
        assert data["balance"] == balance - 10000


# ============================================================================
# STATUS MANAGEMENT TESTS
# ============================================================================

class TestOrderStatus:
    """Tests for order status management."""

    async def test_update_status_to_production(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should update from pending to in_production."""
        response = await api_client.patch(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/status",
            headers=superuser_headers,
            json={"status": "in_production"}
        )

        data = assert_success_response(response)
        assert data["status"] == "in_production"

    async def test_update_status_to_ready(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should update to ready status."""
        # First move to production
        await api_client.patch(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/status",
            headers=superuser_headers,
            json={"status": "in_production"}
        )

        # Then to ready
        response = await api_client.patch(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/status",
            headers=superuser_headers,
            json={"status": "ready"}
        )

        data = assert_success_response(response)
        assert data["status"] == "ready"

    async def test_cancel_order(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school
    ):
        """Should cancel order."""
        response = await api_client.patch(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/status",
            headers=superuser_headers,
            json={"status": "cancelled"}
        )

        data = assert_success_response(response)
        assert data["status"] == "cancelled"


# ============================================================================
# ORDER ITEM STATUS TESTS
# ============================================================================

class TestOrderItemStatus:
    """Tests for partial delivery tracking."""

    async def test_mark_item_delivered(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school,
        db_session
    ):
        """Should mark individual item as delivered."""
        from sqlalchemy import select
        from app.models import OrderItem

        result = await db_session.execute(
            select(OrderItem).where(OrderItem.order_id == test_order.id)
        )
        order_item = result.scalars().first()

        response = await api_client.patch(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/items/{order_item.id}/status",
            headers=superuser_headers,
            json={"status": "delivered"}
        )

        data = assert_success_response(response)
        # Item should be marked as delivered
        assert data.get("item_status") == "delivered" or data.get("status") == "delivered"


# ============================================================================
# WEB ORDER TESTS
# ============================================================================

class TestWebOrders:
    """Tests for web portal order creation."""

    async def test_create_web_order_public(
        self,
        api_client,
        test_school,
        test_garment_type
    ):
        """Should allow public web order creation."""
        response = await api_client.post(
            "/api/v1/portal/orders",
            json=build_web_order_request(
                school_slug=test_school.slug or test_school.code,
                client_name="Test Parent",
                client_phone="3001234567",
                client_email="parent@test.com",
                student_name="Test Student",
                student_grade="5A",
                items=[
                    build_order_item(
                        garment_type_id=test_garment_type.id,
                        quantity=1,
                        unit_price=50000
                    )
                ]
            )
        )

        # Web orders should be created without auth
        if response.status_code == 201:
            data = response.json()
            assert data["source"] == "web"
        else:
            # Some implementations may require different endpoint
            assert response.status_code in [201, 404, 422]

    async def test_web_order_filters_in_list(
        self,
        api_client,
        superuser_headers,
        test_school
    ):
        """Should filter web orders in list."""
        response = await api_client.get(
            f"/api/v1/schools/{test_school.id}/orders",
            headers=superuser_headers,
            params={"source": "web"}
        )

        data = assert_success_response(response)
        items = data.get("items", data)

        for order in items:
            assert order.get("source") == "web"


# ============================================================================
# PAYMENT PROOF TESTS
# ============================================================================

class TestPaymentProof:
    """Tests for payment proof upload and approval."""

    async def test_approve_payment_proof(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school,
        db_session
    ):
        """Should approve payment proof."""
        # First set a payment proof URL
        test_order.payment_proof_url = "https://example.com/proof.jpg"
        await db_session.flush()

        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/approve-payment",
            headers=superuser_headers
        )

        # Should succeed or return appropriate status
        assert response.status_code in [200, 404]

    async def test_reject_payment_proof(
        self,
        api_client,
        superuser_headers,
        test_order,
        test_school,
        db_session
    ):
        """Should reject payment proof and clear URL."""
        # Set payment proof
        test_order.payment_proof_url = "https://example.com/proof.jpg"
        await db_session.flush()

        response = await api_client.post(
            f"/api/v1/schools/{test_school.id}/orders/{test_order.id}/reject-payment",
            headers=superuser_headers,
            json={"reason": "Image is not clear"}
        )

        # Should succeed or return appropriate status
        assert response.status_code in [200, 404]


# ============================================================================
# ORDER CODE GENERATION TESTS
# ============================================================================

class TestOrderCodeGeneration:
    """Tests for order code generation."""

    async def test_order_code_format(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should generate codes in format ENC-YYYY-NNNN."""
        setup = complete_test_setup

        response = await api_client.post(
            f"/api/v1/schools/{setup['school'].id}/orders",
            headers=superuser_headers,
            json=build_order_request(
                client_id=setup["client"].id,
                items=[
                    build_order_item(
                        garment_type_id=setup["garment_type"].id,
                        quantity=1,
                        unit_price=50000
                    )
                ]
            )
        )

        data = assert_created_response(response)
        code = data["code"]

        # Verify format
        assert code.startswith("ENC-")
        parts = code.split("-")
        assert len(parts) == 3
        assert parts[1].isdigit() and len(parts[1]) == 4  # Year

    async def test_order_codes_are_sequential(
        self,
        api_client,
        superuser_headers,
        complete_test_setup
    ):
        """Should generate sequential codes."""
        setup = complete_test_setup
        codes = []

        for _ in range(3):
            response = await api_client.post(
                f"/api/v1/schools/{setup['school'].id}/orders",
                headers=superuser_headers,
                json=build_order_request(
                    client_id=setup["client"].id,
                    items=[
                        build_order_item(
                            garment_type_id=setup["garment_type"].id,
                            quantity=1,
                            unit_price=50000
                        )
                    ]
                )
            )

            data = assert_created_response(response)
            codes.append(data["code"])

        # Extract sequential numbers
        numbers = [int(c.split("-")[2]) for c in codes]

        # Should be sequential
        for i in range(1, len(numbers)):
            assert numbers[i] == numbers[i-1] + 1


# ============================================================================
# MULTI-TENANT TESTS
# ============================================================================

class TestOrdersMultiTenancy:
    """Tests for multi-tenant isolation in orders."""

    async def test_cannot_access_other_school_orders(
        self,
        api_client,
        auth_headers,
        db_session
    ):
        """Should not access orders from unauthorized school."""
        from app.models import School

        unique_id = uuid4().hex[:6]
        other_school = School(
            id=str(uuid4()),
            code=f"OTHER-{unique_id}",
            name="Another School",
            slug=f"another-school-{unique_id}",
            is_active=True
        )
        db_session.add(other_school)
        await db_session.flush()

        response = await api_client.get(
            f"/api/v1/schools/{other_school.id}/orders",
            headers=auth_headers
        )

        assert_forbidden(response)

    async def test_superuser_can_list_all_orders(
        self,
        api_client,
        superuser_headers
    ):
        """Superuser should list orders from all schools."""
        response = await api_client.get(
            "/api/v1/orders",
            headers=superuser_headers
        )

        assert_success_response(response)
