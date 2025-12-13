"""
Order Service (Encargos)
"""
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.order import Order, OrderItem, OrderStatus
from app.models.product import GarmentType
from app.schemas.order import OrderCreate, OrderUpdate, OrderPayment
from app.services.base import SchoolIsolatedService


class OrderService(SchoolIsolatedService[Order]):
    """Service for Order (Encargos) operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Order, db)

    async def create_order(
        self,
        order_data: OrderCreate,
        user_id: UUID
    ) -> Order:
        """
        Create a new order with items

        Args:
            order_data: Order creation data including items
            user_id: User creating the order

        Returns:
            Created order with items
        """
        # Generate order code
        code = await self._generate_order_code(order_data.school_id)

        # Calculate totals
        items_data = []
        subtotal = Decimal("0")

        for item_data in order_data.items:
            # Get garment type
            garment = await self.db.execute(
                select(GarmentType).where(
                    GarmentType.id == item_data.garment_type_id,
                    GarmentType.school_id == order_data.school_id,
                    GarmentType.is_active == True
                )
            )
            garment = garment.scalar_one_or_none()

            if not garment:
                raise ValueError(f"Garment type {item_data.garment_type_id} not found")

            # TODO: Calculate price based on garment type, size, customizations
            # For now, use a default price
            unit_price = Decimal("50000")  # Default price
            item_subtotal = unit_price * item_data.quantity

            items_data.append({
                "school_id": order_data.school_id,
                "garment_type_id": garment.id,
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal,
                "size": item_data.size,
                "color": item_data.color,
                "gender": item_data.gender,
                "custom_measurements": item_data.custom_measurements,
                "embroidery_text": item_data.embroidery_text,
                "notes": item_data.notes
            })

            subtotal += item_subtotal

        # Calculate tax (19% IVA)
        tax_rate = Decimal("0.19")
        tax = subtotal * tax_rate
        total = subtotal + tax

        # Determine paid amount
        paid_amount = order_data.advance_payment or Decimal("0")

        # Create order
        order_dict = order_data.model_dump(exclude={'items', 'advance_payment'})
        order_dict.update({
            "code": code,
            "user_id": user_id,
            "status": OrderStatus.PENDING,
            "subtotal": subtotal,
            "tax": tax,
            "total": total,
            "paid_amount": paid_amount
        })

        order = Order(**order_dict)
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)

        # Create order items
        for item_dict in items_data:
            item_dict["order_id"] = order.id
            order_item = OrderItem(**item_dict)
            self.db.add(order_item)

        await self.db.flush()

        return order

    async def get_order_with_items(
        self,
        order_id: UUID,
        school_id: UUID
    ) -> Order | None:
        """Get order with items, client and garment types loaded"""
        result = await self.db.execute(
            select(Order)
            .options(
                selectinload(Order.items).selectinload(OrderItem.garment_type),
                joinedload(Order.client)
            )
            .where(
                Order.id == order_id,
                Order.school_id == school_id
            )
        )
        return result.unique().scalar_one_or_none()

    async def add_payment(
        self,
        order_id: UUID,
        school_id: UUID,
        payment_data: OrderPayment
    ) -> Order | None:
        """
        Add payment to order

        Args:
            order_id: Order UUID
            school_id: School UUID
            payment_data: Payment information

        Returns:
            Updated order
        """
        order = await self.get(order_id, school_id)
        if not order:
            return None

        new_paid_amount = order.paid_amount + payment_data.amount

        if new_paid_amount > order.total:
            raise ValueError("Payment exceeds order total")

        return await self.update(
            order_id,
            school_id,
            {"paid_amount": new_paid_amount}
        )

    async def update_status(
        self,
        order_id: UUID,
        school_id: UUID,
        new_status: OrderStatus
    ) -> Order | None:
        """Update order status"""
        return await self.update(
            order_id,
            school_id,
            {"status": new_status}
        )

    async def create_web_order(
        self,
        order_data: OrderCreate
    ) -> Order:
        """
        Create a new order from web portal (no user_id required)

        Args:
            order_data: Order creation data including items

        Returns:
            Created order with items
        """
        from app.models.sale import SaleSource

        # Generate order code
        code = await self._generate_order_code(order_data.school_id)

        # Calculate totals
        items_data = []
        subtotal = Decimal("0")

        for item_data in order_data.items:
            # Get garment type (or use global)
            garment = await self.db.execute(
                select(GarmentType).where(
                    GarmentType.id == item_data.garment_type_id
                )
            )
            garment = garment.scalar_one_or_none()

            # Use provided unit_price if available, otherwise default
            unit_price = getattr(item_data, 'unit_price', None) or Decimal("50000")
            item_subtotal = unit_price * item_data.quantity

            items_data.append({
                "school_id": order_data.school_id,
                "garment_type_id": item_data.garment_type_id,
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal,
                "size": item_data.size,
                "color": getattr(item_data, 'color', None),
                "gender": getattr(item_data, 'gender', None),
                "custom_measurements": getattr(item_data, 'custom_measurements', None),
                "embroidery_text": getattr(item_data, 'embroidery_text', None),
                "notes": getattr(item_data, 'notes', None)
            })

            subtotal += item_subtotal

        # Calculate tax (19% IVA)
        tax_rate = Decimal("0.19")
        tax = subtotal * tax_rate
        total = subtotal + tax

        # Determine paid amount
        paid_amount = order_data.advance_payment or Decimal("0")

        # Create order without user_id (web portal order)
        order = Order(
            school_id=order_data.school_id,
            client_id=order_data.client_id,
            code=code,
            user_id=None,  # No user for web portal orders
            status=OrderStatus.PENDING,
            source=SaleSource.WEB_PORTAL,  # Mark as web portal order
            subtotal=subtotal,
            tax=tax,
            total=total,
            paid_amount=paid_amount,
            delivery_date=order_data.delivery_date,
            notes=order_data.notes
        )
        self.db.add(order)
        await self.db.flush()
        await self.db.refresh(order)

        # Create order items
        for item_dict in items_data:
            item_dict["order_id"] = order.id
            order_item = OrderItem(**item_dict)
            self.db.add(order_item)

        await self.db.flush()
        await self.db.refresh(order)

        return order

    async def _generate_order_code(self, school_id: UUID) -> str:
        """Generate order code: ENC-YYYY-NNNN"""
        year = datetime.now().year
        prefix = f"ENC-{year}-"

        count = await self.db.execute(
            select(func.count(Order.id)).where(
                Order.school_id == school_id,
                Order.code.like(f"{prefix}%")
            )
        )

        sequence = count.scalar_one() + 1
        return f"{prefix}{sequence:04d}"
