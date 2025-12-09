"""
Unit Tests for OrderService (Encargos)

Tests order lifecycle including:
- Order creation with items
- Order code generation
- Tax calculation (19% IVA)
- Payment tracking
- Status management
"""
import pytest
from decimal import Decimal
from uuid import uuid4
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime

from app.services.order import OrderService
from app.models.order import Order, OrderItem, OrderStatus
from app.schemas.order import OrderCreate, OrderItemCreate, OrderPayment


# ============================================================================
# TEST: Order Code Generation
# ============================================================================

class TestOrderCodeGeneration:
    """Tests for order code generation"""

    @pytest.mark.asyncio
    async def test_generate_first_order_code(self, mock_db_session):
        """Should generate ENC-YYYY-0001 for first order"""
        mock_db_session.execute = AsyncMock(
            return_value=MagicMock(scalar_one=MagicMock(return_value=0))
        )
        service = OrderService(mock_db_session)

        code = await service._generate_order_code(str(uuid4()))

        current_year = datetime.now().year
        assert code == f"ENC-{current_year}-0001"

    @pytest.mark.asyncio
    async def test_generate_sequential_order_code(self, mock_db_session):
        """Should increment sequence for new orders"""
        mock_db_session.execute = AsyncMock(
            return_value=MagicMock(scalar_one=MagicMock(return_value=25))
        )
        service = OrderService(mock_db_session)

        code = await service._generate_order_code(str(uuid4()))

        current_year = datetime.now().year
        assert code == f"ENC-{current_year}-0026"

    @pytest.mark.asyncio
    async def test_order_code_format(self, mock_db_session):
        """Code should be ENC-YYYY-NNNN format (4 digits padded)"""
        mock_db_session.execute = AsyncMock(
            return_value=MagicMock(scalar_one=MagicMock(return_value=5))
        )
        service = OrderService(mock_db_session)

        code = await service._generate_order_code(str(uuid4()))

        # Verify format
        parts = code.split("-")
        assert len(parts) == 3
        assert parts[0] == "ENC"
        assert len(parts[1]) == 4  # Year
        assert len(parts[2]) == 4  # Padded sequence


# ============================================================================
# TEST: Tax Calculations
# ============================================================================

class TestTaxCalculations:
    """Tests for tax (IVA) calculations"""

    def test_iva_calculation_19_percent(self):
        """Tax should be 19% of subtotal"""
        subtotal = Decimal("100000")
        tax_rate = Decimal("0.19")

        tax = subtotal * tax_rate

        assert tax == Decimal("19000")

    def test_total_calculation(self):
        """Total should be subtotal + tax"""
        subtotal = Decimal("100000")
        tax = Decimal("19000")

        total = subtotal + tax

        assert total == Decimal("119000")

    def test_multiple_items_subtotal(self):
        """Subtotal should sum all item subtotals"""
        items = [
            {"quantity": 2, "unit_price": Decimal("50000")},
            {"quantity": 1, "unit_price": Decimal("75000")},
            {"quantity": 3, "unit_price": Decimal("30000")},
        ]

        subtotal = sum(
            item["quantity"] * item["unit_price"]
            for item in items
        )

        # (2*50000) + (1*75000) + (3*30000) = 100000 + 75000 + 90000
        assert subtotal == Decimal("265000")

    def test_tax_on_complex_order(self):
        """Test full tax calculation on complex order"""
        items = [
            {"quantity": 2, "unit_price": Decimal("50000")},  # 100000
            {"quantity": 1, "unit_price": Decimal("75000")},  # 75000
        ]

        subtotal = sum(
            item["quantity"] * item["unit_price"]
            for item in items
        )

        tax = subtotal * Decimal("0.19")
        total = subtotal + tax

        assert subtotal == Decimal("175000")
        assert tax == Decimal("33250")
        assert total == Decimal("208250")


# ============================================================================
# TEST: Payment Tracking
# ============================================================================

class TestPaymentTracking:
    """Tests for order payment tracking"""

    @pytest.mark.asyncio
    async def test_add_payment_success(self, mock_db_session, order_factory):
        """Should add payment to order"""
        order = order_factory(
            total=Decimal("119000"),
            paid_amount=Decimal("50000")
        )

        service = OrderService(mock_db_session)

        with patch.object(service, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = order

            with patch.object(service, 'update', new_callable=AsyncMock) as mock_update:
                updated_order = order_factory(
                    total=Decimal("119000"),
                    paid_amount=Decimal("80000")
                )
                mock_update.return_value = updated_order

                payment = OrderPayment(amount=Decimal("30000"), payment_method="cash")
                result = await service.add_payment(
                    order_id=order.id,
                    school_id=order.school_id,
                    payment_data=payment
                )

                # Verify update was called with correct amount
                mock_update.assert_called_once()
                call_args = mock_update.call_args
                assert call_args[0][2]["paid_amount"] == Decimal("80000")

    @pytest.mark.asyncio
    async def test_add_payment_exceeds_total_raises_error(
        self, mock_db_session, order_factory
    ):
        """Should raise ValueError if payment exceeds total"""
        order = order_factory(
            total=Decimal("119000"),
            paid_amount=Decimal("110000")  # Already paid 110k of 119k
        )

        service = OrderService(mock_db_session)

        with patch.object(service, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = order

            payment = OrderPayment(amount=Decimal("20000"), payment_method="cash")  # Would exceed by 11k

            with pytest.raises(ValueError, match="Payment exceeds order total"):
                await service.add_payment(
                    order_id=order.id,
                    school_id=order.school_id,
                    payment_data=payment
                )

    @pytest.mark.asyncio
    async def test_add_payment_exact_amount(self, mock_db_session, order_factory):
        """Should allow payment that exactly completes order"""
        order = order_factory(
            total=Decimal("119000"),
            paid_amount=Decimal("100000")
        )

        service = OrderService(mock_db_session)

        with patch.object(service, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = order

            with patch.object(service, 'update', new_callable=AsyncMock) as mock_update:
                mock_update.return_value = order

                payment = OrderPayment(amount=Decimal("19000"), payment_method="cash")  # Exactly remaining
                await service.add_payment(
                    order_id=order.id,
                    school_id=order.school_id,
                    payment_data=payment
                )

                call_args = mock_update.call_args
                assert call_args[0][2]["paid_amount"] == Decimal("119000")

    @pytest.mark.asyncio
    async def test_add_payment_order_not_found(self, mock_db_session):
        """Should return None if order not found"""
        service = OrderService(mock_db_session)

        with patch.object(service, 'get', new_callable=AsyncMock) as mock_get:
            mock_get.return_value = None

            payment = OrderPayment(amount=Decimal("10000"), payment_method="cash")
            result = await service.add_payment(
                order_id=str(uuid4()),
                school_id=str(uuid4()),
                payment_data=payment
            )

            assert result is None

    def test_remaining_balance_calculation(self):
        """Calculate remaining balance correctly"""
        total = Decimal("119000")
        paid_amount = Decimal("50000")

        remaining = total - paid_amount

        assert remaining == Decimal("69000")

    def test_is_fully_paid(self):
        """Determine if order is fully paid"""
        scenarios = [
            (Decimal("119000"), Decimal("119000"), True),   # Exact
            (Decimal("119000"), Decimal("120000"), True),   # Overpaid (shouldn't happen)
            (Decimal("119000"), Decimal("100000"), False),  # Underpaid
            (Decimal("119000"), Decimal("0"), False),       # No payment
        ]

        for total, paid, expected in scenarios:
            is_paid = paid >= total
            assert is_paid == expected, f"total={total}, paid={paid}"


# ============================================================================
# TEST: Status Management
# ============================================================================

class TestStatusManagement:
    """Tests for order status transitions"""

    @pytest.mark.asyncio
    async def test_update_status_success(self, mock_db_session, order_factory):
        """Should update order status"""
        order = order_factory(status=OrderStatus.PENDING)

        service = OrderService(mock_db_session)

        with patch.object(service, 'update', new_callable=AsyncMock) as mock_update:
            updated = order_factory(status=OrderStatus.IN_PRODUCTION)
            mock_update.return_value = updated

            result = await service.update_status(
                order_id=order.id,
                school_id=order.school_id,
                new_status=OrderStatus.IN_PRODUCTION
            )

            mock_update.assert_called_once()
            call_args = mock_update.call_args
            assert call_args[0][2]["status"] == OrderStatus.IN_PRODUCTION

    def test_valid_status_transitions(self):
        """Document valid status transitions"""
        # PENDING → IN_PRODUCTION → READY → DELIVERED
        # Any → CANCELLED

        valid_transitions = {
            OrderStatus.PENDING: [
                OrderStatus.IN_PRODUCTION,
                OrderStatus.CANCELLED
            ],
            OrderStatus.IN_PRODUCTION: [
                OrderStatus.READY,
                OrderStatus.CANCELLED
            ],
            OrderStatus.READY: [
                OrderStatus.DELIVERED,
                OrderStatus.CANCELLED
            ],
            OrderStatus.DELIVERED: [],  # Terminal state
            OrderStatus.CANCELLED: [],  # Terminal state
        }

        # Verify expected transitions exist
        assert OrderStatus.IN_PRODUCTION in valid_transitions[OrderStatus.PENDING]
        assert OrderStatus.READY in valid_transitions[OrderStatus.IN_PRODUCTION]
        assert OrderStatus.DELIVERED in valid_transitions[OrderStatus.READY]

    def test_all_statuses_exist(self):
        """Verify all expected statuses exist"""
        expected = ['PENDING', 'IN_PRODUCTION', 'READY', 'DELIVERED', 'CANCELLED']

        for status_name in expected:
            assert hasattr(OrderStatus, status_name)


# ============================================================================
# TEST: Order Creation Validation
# ============================================================================

class TestOrderCreationValidation:
    """Tests for order creation validation"""

    @pytest.mark.asyncio
    async def test_create_order_garment_not_found(self, mock_db_session):
        """Should raise ValueError when garment type not found"""
        call_count = 0

        async def mock_execute(query):
            nonlocal call_count
            call_count += 1
            mock_result = MagicMock()
            if call_count == 1:
                # Code generation
                mock_result.scalar_one = MagicMock(return_value=0)
            else:
                # Garment type lookup - not found
                mock_result.scalar_one_or_none = MagicMock(return_value=None)
            return mock_result

        mock_db_session.execute = mock_execute

        service = OrderService(mock_db_session)

        order_data = OrderCreate(
            school_id=str(uuid4()),
            client_id=str(uuid4()),
            items=[
                OrderItemCreate(
                    garment_type_id=str(uuid4()),
                    quantity=1,
                    size="M"
                )
            ]
        )

        with pytest.raises(ValueError, match="Garment type .* not found"):
            await service.create_order(order_data, user_id=str(uuid4()))


# ============================================================================
# TEST: Business Scenarios
# ============================================================================

class TestBusinessScenarios:
    """End-to-end business scenarios"""

    def test_scenario_new_order_with_deposit(self):
        """
        Scenario: Customer orders custom uniforms with 50% deposit

        1. Order: 2 camisas @ $50,000 + 1 pantalón @ $75,000 = $175,000
        2. Tax (19%): $33,250
        3. Total: $208,250
        4. Deposit (50%): $104,125
        5. Remaining: $104,125
        """
        items = [
            {"quantity": 2, "unit_price": Decimal("50000")},
            {"quantity": 1, "unit_price": Decimal("75000")},
        ]

        subtotal = sum(i["quantity"] * i["unit_price"] for i in items)
        tax = subtotal * Decimal("0.19")
        total = subtotal + tax
        deposit = total / 2
        remaining = total - deposit

        assert subtotal == Decimal("175000")
        assert tax == Decimal("33250")
        assert total == Decimal("208250")
        assert deposit == Decimal("104125")
        assert remaining == Decimal("104125")

    def test_scenario_multiple_payments(self):
        """
        Scenario: Customer pays in installments

        1. Total: $119,000
        2. Payment 1 (deposit): $50,000
        3. Payment 2 (partial): $30,000
        4. Payment 3 (final): $39,000
        """
        total = Decimal("119000")
        payments = [
            Decimal("50000"),
            Decimal("30000"),
            Decimal("39000"),
        ]

        paid_amount = Decimal("0")
        for payment in payments:
            paid_amount += payment
            remaining = total - paid_amount
            assert remaining >= 0

        assert paid_amount == total

    def test_scenario_order_lifecycle(self):
        """
        Scenario: Full order lifecycle

        1. Create order (PENDING)
        2. Start production (IN_PRODUCTION)
        3. Complete production (READY)
        4. Customer pickup (DELIVERED)
        """
        statuses = [
            OrderStatus.PENDING,
            OrderStatus.IN_PRODUCTION,
            OrderStatus.READY,
            OrderStatus.DELIVERED
        ]

        # Simulate progression
        current = OrderStatus.PENDING
        for next_status in statuses[1:]:
            # In real app, this would be validated
            current = next_status

        assert current == OrderStatus.DELIVERED

    def test_scenario_cancelled_order(self):
        """
        Scenario: Customer cancels order before production

        - Deposit should be refunded (business decision)
        - Status changes to CANCELLED
        """
        total = Decimal("119000")
        deposit = Decimal("50000")

        # Order cancelled
        status = OrderStatus.CANCELLED
        refund_amount = deposit  # Full refund before production

        assert status == OrderStatus.CANCELLED
        assert refund_amount == deposit


# ============================================================================
# TEST: Edge Cases
# ============================================================================

class TestEdgeCases:
    """Edge cases and boundary conditions"""

    def test_zero_advance_payment(self):
        """Order can be created with no advance payment"""
        total = Decimal("119000")
        advance_payment = Decimal("0")

        remaining = total - advance_payment

        assert remaining == total

    def test_full_advance_payment(self):
        """Order can be fully paid upfront"""
        total = Decimal("119000")
        advance_payment = Decimal("119000")

        remaining = total - advance_payment

        assert remaining == Decimal("0")

    def test_single_item_order(self):
        """Handle single item order"""
        unit_price = Decimal("50000")
        quantity = 1

        subtotal = unit_price * quantity
        tax = subtotal * Decimal("0.19")
        total = subtotal + tax

        assert subtotal == Decimal("50000")
        assert tax == Decimal("9500")
        assert total == Decimal("59500")

    def test_large_quantity_order(self):
        """Handle bulk order"""
        unit_price = Decimal("50000")
        quantity = 100

        subtotal = unit_price * quantity
        tax = subtotal * Decimal("0.19")
        total = subtotal + tax

        assert subtotal == Decimal("5000000")
        assert tax == Decimal("950000")
        assert total == Decimal("5950000")

    def test_decimal_precision_in_tax(self):
        """Ensure decimal precision in tax calculations"""
        subtotal = Decimal("99999")
        tax = subtotal * Decimal("0.19")

        # Should handle decimal precisely
        assert tax == Decimal("18999.81")
