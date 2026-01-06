"""
Order Service (Encargos)

Contabilidad de Encargos:
- Sin IVA (tax = 0, total = subtotal)
- Al crear con anticipo: registra transacción de ingreso + cuenta por cobrar
- Al agregar abono: registra transacción de ingreso + actualiza cuenta por cobrar
- Cuando se cancela totalmente: la cuenta por cobrar queda saldada
"""
from uuid import UUID
from datetime import datetime, date, timedelta
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.order import Order, OrderItem, OrderStatus, OrderItemStatus
from app.models.product import GarmentType, Product
from app.models.accounting import Transaction, TransactionType, AccPaymentMethod, AccountsReceivable
from app.models.client import Client
from app.schemas.order import OrderCreate, OrderUpdate, OrderPayment
from app.schemas.accounting import AccountsReceivableCreate
from app.services.base import SchoolIsolatedService
from app.services.email import send_activation_email
import secrets

# Required measurements for yomber orders
YOMBER_REQUIRED_MEASUREMENTS = ['delantero', 'trasero', 'cintura', 'largo']


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

            # Get order type and additional price
            order_type = getattr(item_data, 'order_type', 'custom')
            additional_price = getattr(item_data, 'additional_price', None) or Decimal("0")
            product_id = None
            item_size = item_data.size
            item_color = item_data.color

            if order_type == "catalog":
                # CATALOG: Price from selected product
                if not item_data.product_id:
                    raise ValueError("product_id requerido para encargos de catálogo")

                product_result = await self.db.execute(
                    select(Product).where(
                        Product.id == item_data.product_id,
                        Product.school_id == order_data.school_id,
                        Product.is_active == True
                    )
                )
                product = product_result.scalar_one_or_none()

                if not product:
                    raise ValueError(f"Product {item_data.product_id} not found")

                unit_price = Decimal(str(product.price)) + additional_price
                product_id = product.id
                # Use product's size/color if not specified
                item_size = item_data.size or product.size
                item_color = item_data.color or product.color

            elif order_type == "yomber":
                # YOMBER: Validate measurements + get base price
                if not item_data.custom_measurements:
                    raise ValueError("Medidas personalizadas requeridas para encargos de yomber")

                missing = [f for f in YOMBER_REQUIRED_MEASUREMENTS
                          if f not in item_data.custom_measurements]
                if missing:
                    raise ValueError(f"Medidas faltantes para yomber: {', '.join(missing)}")

                # Get price from product or manual
                if item_data.product_id:
                    product_result = await self.db.execute(
                        select(Product).where(
                            Product.id == item_data.product_id,
                            Product.school_id == order_data.school_id,
                            Product.is_active == True
                        )
                    )
                    product = product_result.scalar_one_or_none()

                    if not product:
                        raise ValueError(f"Product {item_data.product_id} not found")

                    unit_price = Decimal(str(product.price)) + additional_price
                    product_id = product.id
                elif item_data.unit_price:
                    unit_price = item_data.unit_price + additional_price
                else:
                    raise ValueError("Precio requerido para yomber (product_id o unit_price)")

            else:  # "custom"
                # CUSTOM: Manual price required
                if not item_data.unit_price:
                    raise ValueError("unit_price requerido para encargos personalizados")
                unit_price = item_data.unit_price + additional_price

            item_subtotal = unit_price * item_data.quantity

            items_data.append({
                "school_id": order_data.school_id,
                "garment_type_id": garment.id,
                "product_id": product_id,
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal,
                "size": item_size,
                "color": item_color,
                "gender": item_data.gender,
                "custom_measurements": item_data.custom_measurements,
                "embroidery_text": item_data.embroidery_text,
                "notes": item_data.notes
            })

            subtotal += item_subtotal

        # Sin IVA para encargos (tax = 0)
        tax = Decimal("0")
        total = subtotal

        # Determine paid amount (anticipo)
        paid_amount = order_data.advance_payment or Decimal("0")

        # Get payment method for advance payment, convert string to enum if needed
        raw_method = getattr(order_data, 'advance_payment_method', None) or 'cash'
        try:
            payment_method = AccPaymentMethod(raw_method) if isinstance(raw_method, str) else raw_method
        except ValueError:
            payment_method = AccPaymentMethod.CASH

        # Create order
        # Exclude fields that are not in Order model or are handled separately
        order_dict = order_data.model_dump(exclude={
            'items', 'advance_payment', 'advance_payment_method',
            'custom_school_name'  # Not in Order model, only used for school resolution
        })
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

        # === CONTABILIDAD ===
        # Si hay anticipo, crear transacción de ingreso + actualizar balance
        if paid_amount > Decimal("0"):
            transaction = Transaction(
                school_id=order_data.school_id,
                type=TransactionType.INCOME,
                amount=paid_amount,
                payment_method=payment_method,
                description=f"Anticipo encargo {order.code}",
                category="orders",
                reference_code=order.code,
                transaction_date=date.today(),
                order_id=order.id,
                created_by=user_id
            )
            self.db.add(transaction)
            await self.db.flush()

            # Apply balance integration (agrega a Caja/Banco)
            from app.services.balance_integration import BalanceIntegrationService
            balance_service = BalanceIntegrationService(self.db)
            await balance_service.apply_transaction_to_balance(transaction, user_id)

        # Crear cuenta por cobrar por el saldo pendiente
        balance = total - paid_amount
        if balance > Decimal("0"):
            receivable = AccountsReceivable(
                school_id=order_data.school_id,
                client_id=order_data.client_id,
                order_id=order.id,
                amount=balance,
                description=f"Saldo pendiente encargo {order.code}",
                invoice_date=date.today(),
                due_date=order_data.delivery_date,
                created_by=user_id
            )
            self.db.add(receivable)

        await self.db.flush()

        # === ENVIAR EMAIL DE ACTIVACIÓN AL CLIENTE ===
        # Si el cliente tiene email y no está verificado, enviar invitación
        if order_data.client_id:
            await self._send_activation_email_if_needed(order_data.client_id, order.code)

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
        payment_data: OrderPayment,
        user_id: UUID | None = None
    ) -> Order | None:
        """
        Add payment (abono) to order

        Args:
            order_id: Order UUID
            school_id: School UUID
            payment_data: Payment information
            user_id: User making the payment

        Returns:
            Updated order
        """
        order = await self.get(order_id, school_id)
        if not order:
            return None

        new_paid_amount = order.paid_amount + payment_data.amount

        if new_paid_amount > order.total:
            raise ValueError("El abono excede el total del encargo")

        # Update order paid amount
        order.paid_amount = new_paid_amount
        await self.db.flush()

        # Get payment method (default to CASH if not provided)
        # Convert string to enum if needed
        raw_method = getattr(payment_data, 'payment_method', None) or 'cash'
        try:
            payment_method = AccPaymentMethod(raw_method) if isinstance(raw_method, str) else raw_method
        except ValueError:
            payment_method = AccPaymentMethod.CASH

        # === CONTABILIDAD ===
        # Crear transacción de ingreso por el abono
        transaction = Transaction(
            school_id=school_id,
            type=TransactionType.INCOME,
            amount=payment_data.amount,
            payment_method=payment_method,
            description=f"Abono encargo {order.code}",
            category="orders",
            reference_code=order.code,
            transaction_date=date.today(),
            order_id=order.id,
            created_by=user_id
        )
        self.db.add(transaction)
        await self.db.flush()

        # Apply balance integration (agrega a Caja/Banco)
        from app.services.balance_integration import BalanceIntegrationService
        balance_service = BalanceIntegrationService(self.db)
        await balance_service.apply_transaction_to_balance(transaction, user_id)

        # Actualizar cuenta por cobrar si existe
        result = await self.db.execute(
            select(AccountsReceivable).where(
                AccountsReceivable.order_id == order_id,
                AccountsReceivable.school_id == school_id,
                AccountsReceivable.is_paid == False
            )
        )
        receivable = result.scalar_one_or_none()

        if receivable:
            receivable.amount_paid = receivable.amount_paid + payment_data.amount
            # Marcar como pagada si el monto pagado >= monto total
            if receivable.amount_paid >= receivable.amount:
                receivable.is_paid = True

        await self.db.flush()
        await self.db.refresh(order)

        return order

    async def update_status(
        self,
        order_id: UUID,
        school_id: UUID,
        new_status: OrderStatus
    ) -> Order | None:
        """Update order status and sync item statuses"""
        order = await self.update(
            order_id,
            school_id,
            {"status": new_status}
        )

        # Sync item statuses when order is marked as DELIVERED
        if order and new_status == OrderStatus.DELIVERED:
            await self._sync_item_statuses_from_order(order_id, school_id, new_status)

        return order

    async def update_order(
        self,
        order_id: UUID,
        school_id: UUID,
        order_update: OrderUpdate
    ) -> Order | None:
        """
        Update order details (delivery_date, notes, status)

        Args:
            order_id: Order UUID
            school_id: School UUID
            order_update: Update data

        Returns:
            Updated order
        """
        update_data = order_update.model_dump(exclude_unset=True)
        if not update_data:
            # No updates, just return the order
            return await self.get(order_id, school_id)

        order = await self.update(order_id, school_id, update_data)

        # Sync item statuses if status was changed to DELIVERED
        if order and 'status' in update_data and update_data['status'] == OrderStatus.DELIVERED:
            await self._sync_item_statuses_from_order(order_id, school_id, OrderStatus.DELIVERED)

        return order

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
        from app.models.school import School
        import uuid as uuid_lib
        from slugify import slugify

        # Resolve school_id - handle custom school names
        school_id = order_data.school_id
        if order_data.custom_school_name:
            # Search for existing school (case-insensitive)
            existing_school_result = await self.db.execute(
                select(School).where(
                    func.lower(School.name) == order_data.custom_school_name.lower(),
                    School.is_active == True
                )
            )
            existing_school = existing_school_result.scalar_one_or_none()

            if existing_school:
                # School exists, use its ID
                school_id = existing_school.id
            else:
                # Create new school with "+" prefix
                new_school_name = f"+{order_data.custom_school_name}"
                new_school_slug = slugify(new_school_name)

                # Generate unique code
                school_code = f"TEMP-{uuid_lib.uuid4().hex[:8].upper()}"

                new_school = School(
                    id=uuid_lib.uuid4(),
                    code=school_code,
                    name=new_school_name,
                    slug=new_school_slug,
                    is_active=False,  # Inactive until verified
                    settings={"needs_verification": True, "is_custom": True}
                )
                self.db.add(new_school)
                await self.db.flush()
                school_id = new_school.id

        # Generate order code
        code = await self._generate_order_code(school_id)

        # Calculate totals
        items_data = []
        subtotal = Decimal("0")

        for item_data in order_data.items:
            # Get garment type
            garment = await self.db.execute(
                select(GarmentType).where(
                    GarmentType.id == item_data.garment_type_id
                )
            )
            garment = garment.scalar_one_or_none()

            # Get order type and additional price
            order_type = getattr(item_data, 'order_type', 'catalog')  # Default to catalog for web
            additional_price = getattr(item_data, 'additional_price', None) or Decimal("0")
            product_id = None
            item_size = item_data.size
            item_color = getattr(item_data, 'color', None)

            if order_type == "catalog":
                # CATALOG: Price from selected product
                if not item_data.product_id:
                    raise ValueError("product_id requerido para encargos de catálogo")

                product_result = await self.db.execute(
                    select(Product).where(
                        Product.id == item_data.product_id,
                        Product.school_id == order_data.school_id,
                        Product.is_active == True
                    )
                )
                product = product_result.scalar_one_or_none()

                if not product:
                    raise ValueError(f"Product {item_data.product_id} not found")

                unit_price = Decimal(str(product.price)) + additional_price
                product_id = product.id
                item_size = item_data.size or product.size
                item_color = getattr(item_data, 'color', None) or product.color

            elif order_type == "yomber":
                # YOMBER: Validate measurements
                measurements = getattr(item_data, 'custom_measurements', None)
                if not measurements:
                    raise ValueError("Medidas personalizadas requeridas para encargos de yomber")

                missing = [f for f in YOMBER_REQUIRED_MEASUREMENTS if f not in measurements]
                if missing:
                    raise ValueError(f"Medidas faltantes para yomber: {', '.join(missing)}")

                if item_data.product_id:
                    product_result = await self.db.execute(
                        select(Product).where(
                            Product.id == item_data.product_id,
                            Product.school_id == order_data.school_id,
                            Product.is_active == True
                        )
                    )
                    product = product_result.scalar_one_or_none()
                    if product:
                        unit_price = Decimal(str(product.price)) + additional_price
                        product_id = product.id
                    else:
                        raise ValueError(f"Product {item_data.product_id} not found")
                elif getattr(item_data, 'unit_price', None):
                    unit_price = item_data.unit_price + additional_price
                else:
                    raise ValueError("Precio requerido para yomber")

            elif order_type == "web_custom":
                # WEB_CUSTOM: Items from web portal needing quotation
                needs_quotation = getattr(item_data, 'needs_quotation', False)
                if needs_quotation:
                    # Price is 0, will be assigned later
                    unit_price = Decimal("0") + additional_price

                    # If no garment_type_id provided, create a generic one for custom products
                    if not item_data.garment_type_id:
                        # Try to find or create a generic "Producto Personalizado" garment type
                        generic_gt_result = await self.db.execute(
                            select(GarmentType).where(
                                GarmentType.school_id == school_id,
                                GarmentType.name == "Producto Personalizado"
                            )
                        )
                        generic_gt = generic_gt_result.scalar_one_or_none()

                        if not generic_gt:
                            generic_gt = GarmentType(
                                id=uuid_lib.uuid4(),
                                school_id=school_id,
                                name="Producto Personalizado",
                                description="Producto personalizado creado desde el portal web",
                                is_active=True
                            )
                            self.db.add(generic_gt)
                            await self.db.flush()

                        item_data.garment_type_id = generic_gt.id

                elif getattr(item_data, 'unit_price', None):
                    unit_price = item_data.unit_price + additional_price
                else:
                    # Default to 0 for web custom orders
                    unit_price = Decimal("0") + additional_price

            else:  # "custom"
                if not getattr(item_data, 'unit_price', None):
                    raise ValueError("unit_price requerido para encargos personalizados")
                unit_price = item_data.unit_price + additional_price

            item_subtotal = unit_price * item_data.quantity

            items_data.append({
                "school_id": school_id,  # Use resolved school_id
                "garment_type_id": item_data.garment_type_id,
                "product_id": product_id,
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal,
                "size": item_size,
                "color": item_color,
                "gender": getattr(item_data, 'gender', None),
                "custom_measurements": getattr(item_data, 'custom_measurements', None),
                "embroidery_text": getattr(item_data, 'embroidery_text', None),
                "notes": getattr(item_data, 'notes', None)
            })

            subtotal += item_subtotal

        # Sin IVA para encargos (tax = 0)
        tax = Decimal("0")
        total = subtotal

        # Determine paid amount (anticipo)
        paid_amount = order_data.advance_payment or Decimal("0")

        # Calculate delivery fee if delivery type is specified
        from app.models.delivery_zone import DeliveryZone
        from app.models.order import DeliveryType

        delivery_fee = Decimal("0")
        delivery_type = getattr(order_data, 'delivery_type', DeliveryType.PICKUP)

        if delivery_type == DeliveryType.DELIVERY and getattr(order_data, 'delivery_zone_id', None):
            # Fetch delivery zone to get fee
            zone_result = await self.db.execute(
                select(DeliveryZone).where(
                    DeliveryZone.id == order_data.delivery_zone_id,
                    DeliveryZone.is_active == True
                )
            )
            zone = zone_result.scalar_one_or_none()
            if zone:
                delivery_fee = Decimal(str(zone.delivery_fee))
                total = subtotal + delivery_fee  # Add delivery fee to total

        # Create order without user_id (web portal order)
        order = Order(
            school_id=school_id,  # Use resolved school_id
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
            notes=order_data.notes,
            # Delivery fields
            delivery_type=delivery_type,
            delivery_address=getattr(order_data, 'delivery_address', None),
            delivery_neighborhood=getattr(order_data, 'delivery_neighborhood', None),
            delivery_city=getattr(order_data, 'delivery_city', None),
            delivery_references=getattr(order_data, 'delivery_references', None),
            delivery_zone_id=getattr(order_data, 'delivery_zone_id', None),
            delivery_fee=delivery_fee,
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

        # === CONTABILIDAD ===
        # Para pedidos web, el anticipo es generalmente 0 (pago contra entrega)
        # Si hay anticipo, crear transacción de ingreso + actualizar balance
        if paid_amount > Decimal("0"):
            transaction = Transaction(
                school_id=school_id,  # Use resolved school_id
                type=TransactionType.INCOME,
                amount=paid_amount,
                payment_method=AccPaymentMethod.TRANSFER,  # Web orders typically via transfer
                description=f"Anticipo encargo web {order.code}",
                category="orders",
                reference_code=order.code,
                transaction_date=date.today(),
                order_id=order.id,
                created_by=None
            )
            self.db.add(transaction)
            await self.db.flush()

            # Apply balance integration (agrega a Banco para transferencias web)
            from app.services.balance_integration import BalanceIntegrationService
            balance_service = BalanceIntegrationService(self.db)
            await balance_service.apply_transaction_to_balance(transaction, None)

        # Crear cuenta por cobrar por el saldo pendiente
        balance = total - paid_amount
        if balance > Decimal("0"):
            receivable = AccountsReceivable(
                school_id=order_data.school_id,
                client_id=order_data.client_id,
                order_id=order.id,
                amount=balance,
                description=f"Saldo pendiente encargo web {order.code}",
                invoice_date=date.today(),
                due_date=order_data.delivery_date,
                created_by=None
            )
            self.db.add(receivable)

        await self.db.flush()
        await self.db.refresh(order)

        return order

    async def _generate_order_code(self, school_id: UUID) -> str:
        """
        Generate unique order code: ENC-YYYY-NNNN

        Uses MAX() + 1 strategy with retry logic to handle race conditions.
        If duplicate is detected, retries with incremented sequence.
        """
        year = datetime.now().year
        prefix = f"ENC-{year}-"

        # Get highest existing sequence number for this year
        max_code_result = await self.db.execute(
            select(func.max(Order.code)).where(
                Order.school_id == school_id,
                Order.code.like(f"{prefix}%")
            )
        )
        max_code = max_code_result.scalar_one_or_none()

        if max_code:
            # Extract sequence number from code (e.g., "ENC-2025-0003" -> 3)
            try:
                sequence = int(max_code.split('-')[-1]) + 1
            except (ValueError, IndexError):
                sequence = 1
        else:
            sequence = 1

        # Try up to 10 times to find an unused code
        for attempt in range(10):
            code = f"{prefix}{sequence:04d}"

            # Check if this code already exists
            existing = await self.db.execute(
                select(func.count(Order.id)).where(
                    Order.school_id == school_id,
                    Order.code == code
                )
            )

            if existing.scalar_one() == 0:
                return code

            # Code exists, try next sequence number
            sequence += 1

        # Fallback: use timestamp-based suffix if all retries fail
        from time import time
        timestamp_suffix = int(time() * 1000) % 10000
        return f"{prefix}{timestamp_suffix:04d}"

    async def update_item_status(
        self,
        order_id: UUID,
        item_id: UUID,
        school_id: UUID,
        new_status: OrderItemStatus,
        user_id: UUID | None = None
    ) -> OrderItem | None:
        """
        Update status of an individual order item

        Args:
            order_id: Order UUID
            item_id: OrderItem UUID
            school_id: School UUID
            new_status: New status for the item
            user_id: User making the change

        Returns:
            Updated OrderItem or None if not found
        """
        # Get the item
        result = await self.db.execute(
            select(OrderItem).where(
                OrderItem.id == item_id,
                OrderItem.order_id == order_id,
                OrderItem.school_id == school_id
            )
        )
        item = result.scalar_one_or_none()

        if not item:
            return None

        # Don't allow changes to finalized items
        if item.item_status in [OrderItemStatus.DELIVERED, OrderItemStatus.CANCELLED]:
            raise ValueError(f"No se puede cambiar estado de item {item.item_status.value}")

        # Update item status
        item.item_status = new_status
        item.status_updated_at = datetime.utcnow()

        await self.db.flush()

        # Auto-sync order status based on items
        await self._sync_order_status_from_items(order_id, school_id)

        await self.db.refresh(item)
        return item

    async def _sync_order_status_from_items(
        self,
        order_id: UUID,
        school_id: UUID
    ) -> None:
        """
        Synchronize Order status based on item statuses

        Rules:
        - If ANY item is in_production → Order = in_production
        - If ALL active items are ready or delivered → Order = ready
        - If ALL active items are delivered → Order = delivered
        - If ALL items are pending → Order = pending
        """
        order = await self.get_order_with_items(order_id, school_id)
        if not order or order.status == OrderStatus.CANCELLED:
            return

        items = order.items
        active_items = [i for i in items if i.item_status != OrderItemStatus.CANCELLED]

        if not active_items:
            # All items cancelled - cancel the order
            order.status = OrderStatus.CANCELLED
            await self.db.flush()
            return

        all_delivered = all(i.item_status == OrderItemStatus.DELIVERED for i in active_items)
        all_ready_or_delivered = all(
            i.item_status in [OrderItemStatus.READY, OrderItemStatus.DELIVERED]
            for i in active_items
        )
        any_in_production = any(i.item_status == OrderItemStatus.IN_PRODUCTION for i in active_items)

        if all_delivered:
            order.status = OrderStatus.DELIVERED
        elif all_ready_or_delivered:
            order.status = OrderStatus.READY
        elif any_in_production:
            order.status = OrderStatus.IN_PRODUCTION
        else:
            order.status = OrderStatus.PENDING

        await self.db.flush()

    async def _sync_item_statuses_from_order(
        self,
        order_id: UUID,
        school_id: UUID,
        new_order_status: OrderStatus
    ) -> None:
        """
        Synchronize all item statuses when order status changes to DELIVERED.

        This provides reverse synchronization (order → items), complementing
        the existing _sync_order_status_from_items() (items → order).

        Rule: If order is marked as DELIVERED, all active items become DELIVERED.
        """
        if new_order_status != OrderStatus.DELIVERED:
            return  # Only sync when order becomes DELIVERED

        order = await self.get_order_with_items(order_id, school_id)
        if not order:
            return

        for item in order.items:
            # Only update items that are not already finalized
            if item.item_status not in [OrderItemStatus.DELIVERED, OrderItemStatus.CANCELLED]:
                item.item_status = OrderItemStatus.DELIVERED
                item.status_updated_at = datetime.utcnow()

        await self.db.flush()

    async def get_item(
        self,
        item_id: UUID,
        order_id: UUID,
        school_id: UUID
    ) -> OrderItem | None:
        """Get a single order item"""
        result = await self.db.execute(
            select(OrderItem)
            .options(selectinload(OrderItem.garment_type))
            .where(
                OrderItem.id == item_id,
                OrderItem.order_id == order_id,
                OrderItem.school_id == school_id
            )
        )
        return result.scalar_one_or_none()

    # =========================================================================
    # Stock Verification and Smart Approval for Web Orders
    # =========================================================================

    async def verify_order_stock(
        self,
        order_id: UUID,
        school_id: UUID
    ) -> dict:
        """
        Verify stock availability for all items in an order.

        For each item, tries to find a matching product in inventory
        based on garment_type, size, and color.

        IMPORTANT: Tracks "virtual consumption" of stock so that if multiple
        items need the same product, the available stock is correctly reduced.

        Returns:
            Dictionary with stock verification results
        """
        from app.models.product import Product, Inventory

        order = await self.get_order_with_items(order_id, school_id)
        if not order:
            raise ValueError("Pedido no encontrado")

        # First, load all products with their stock for this school
        all_products_query = (
            select(Product, Inventory.quantity)
            .outerjoin(Inventory, Product.id == Inventory.product_id)
            .where(
                Product.school_id == school_id,
                Product.is_active == True
            )
        )
        result = await self.db.execute(all_products_query)
        all_products = result.all()

        # Build a map of product_id -> (product, available_stock)
        # This will track "virtual" stock as we assign items
        product_stock_map: dict[UUID, tuple[Product, int]] = {}
        for product, inv_qty in all_products:
            product_stock_map[product.id] = (product, inv_qty or 0)

        items_info = []
        items_in_stock = 0
        items_partial = 0
        items_to_produce = 0

        for item in order.items:
            # Skip cancelled items
            if item.item_status == OrderItemStatus.CANCELLED:
                continue

            # Has custom measurements? Always produce (yomber)
            if item.custom_measurements:
                items_to_produce += 1
                items_info.append({
                    "item_id": str(item.id),
                    "garment_type_id": str(item.garment_type_id),
                    "garment_type_name": item.garment_type.name if item.garment_type else "Unknown",
                    "size": item.size,
                    "color": item.color,
                    "quantity_requested": item.quantity,
                    "product_id": None,
                    "product_code": None,
                    "stock_available": 0,
                    "can_fulfill_from_stock": False,
                    "quantity_from_stock": 0,
                    "quantity_to_produce": item.quantity,
                    "suggested_action": "produce",
                    "has_custom_measurements": True,
                    "item_status": item.item_status.value
                })
                continue

            # Find matching products by garment_type, size, color
            matching_products = []
            for product_id, (product, stock) in product_stock_map.items():
                if product.garment_type_id != item.garment_type_id:
                    continue
                # Match size if specified
                if item.size and product.size != item.size:
                    continue
                # Match color if specified
                if item.color and product.color != item.color:
                    continue
                matching_products.append((product, stock))

            # Sort by available stock descending to pick best match
            matching_products.sort(key=lambda x: x[1], reverse=True)

            # Pick the best match (most stock available)
            best_match = None
            best_stock = 0
            if matching_products:
                best_match, best_stock = matching_products[0]

            # If no exact match, try any product of same garment type (fallback)
            if not best_match:
                fallback_products = [
                    (p, s) for pid, (p, s) in product_stock_map.items()
                    if p.garment_type_id == item.garment_type_id
                ]
                fallback_products.sort(key=lambda x: x[1], reverse=True)
                if fallback_products:
                    best_match, best_stock = fallback_products[0]

            # Determine fulfillment based on CURRENT virtual stock
            can_fulfill = best_stock >= item.quantity
            quantity_from_stock = min(best_stock, item.quantity)
            quantity_to_produce = item.quantity - quantity_from_stock

            # Determine suggested action
            if can_fulfill:
                suggested_action = "fulfill"
                items_in_stock += 1
            elif quantity_from_stock > 0:
                suggested_action = "partial"
                items_partial += 1
            else:
                suggested_action = "produce"
                items_to_produce += 1

            # IMPORTANT: Virtually consume the stock for this item
            # so next items see the reduced availability
            if best_match and quantity_from_stock > 0:
                current_product, current_stock = product_stock_map[best_match.id]
                product_stock_map[best_match.id] = (current_product, current_stock - quantity_from_stock)

            items_info.append({
                "item_id": str(item.id),
                "garment_type_id": str(item.garment_type_id),
                "garment_type_name": item.garment_type.name if item.garment_type else "Unknown",
                "size": item.size,
                "color": item.color,
                "quantity_requested": item.quantity,
                "product_id": str(best_match.id) if best_match else None,
                "product_code": best_match.code if best_match else None,
                "stock_available": best_stock,  # Stock BEFORE this item's consumption
                "can_fulfill_from_stock": can_fulfill,
                "quantity_from_stock": quantity_from_stock,
                "quantity_to_produce": quantity_to_produce,
                "suggested_action": suggested_action,
                "has_custom_measurements": False,
                "item_status": item.item_status.value
            })

        # Determine overall suggestion
        total_items = len(items_info)
        can_fulfill_completely = items_in_stock == total_items and items_partial == 0 and items_to_produce == 0

        if can_fulfill_completely:
            suggested_action = "approve_all"
        elif items_to_produce == total_items:
            suggested_action = "produce_all"
        elif items_in_stock > 0 or items_partial > 0:
            suggested_action = "partial"
        else:
            suggested_action = "review"

        return {
            "order_id": str(order.id),
            "order_code": order.code,
            "order_status": order.status.value,
            "items": items_info,
            "total_items": total_items,
            "items_in_stock": items_in_stock,
            "items_partial": items_partial,
            "items_to_produce": items_to_produce,
            "can_fulfill_completely": can_fulfill_completely,
            "suggested_action": suggested_action
        }

    async def approve_order_with_stock(
        self,
        order_id: UUID,
        school_id: UUID,
        user_id: UUID,
        auto_fulfill: bool = True,
        item_actions: list[dict] | None = None
    ) -> Order:
        """
        Approve/process a web order with intelligent stock handling.

        For items with stock available:
        - Marks as READY
        - Decrements inventory
        - Links product to item

        For items without stock:
        - Marks as IN_PRODUCTION

        Args:
            order_id: Order UUID
            school_id: School UUID
            user_id: User approving the order
            auto_fulfill: If True, automatically fulfill items with stock
            item_actions: Optional list of specific actions per item

        Returns:
            Updated order
        """
        from app.models.product import Inventory

        order = await self.get_order_with_items(order_id, school_id)
        if not order:
            raise ValueError("Pedido no encontrado")

        if order.status not in [OrderStatus.PENDING]:
            raise ValueError(f"Solo se pueden aprobar pedidos pendientes. Estado actual: {order.status.value}")

        # Get stock verification
        stock_info = await self.verify_order_stock(order_id, school_id)

        # Build action map from item_actions if provided
        action_map = {}
        if item_actions:
            for action in item_actions:
                action_map[action.get("item_id")] = action

        # Process each item
        for item_info in stock_info["items"]:
            item_id = item_info["item_id"]

            # Get custom action if provided
            custom_action = action_map.get(item_id, {})
            action = custom_action.get("action", "auto")

            # Determine final action
            if action == "auto":
                if auto_fulfill and item_info["can_fulfill_from_stock"]:
                    action = "fulfill"
                else:
                    action = "produce"

            # Get the item
            result = await self.db.execute(
                select(OrderItem).where(OrderItem.id == item_id)
            )
            item = result.scalar_one_or_none()
            if not item:
                continue

            if action == "fulfill":
                # Fulfill from stock
                product_id = custom_action.get("product_id") or item_info.get("product_id")
                qty_from_stock = custom_action.get("quantity_from_stock") or item_info.get("quantity_from_stock", 0)

                if product_id and qty_from_stock > 0:
                    # Decrement inventory
                    inv_result = await self.db.execute(
                        select(Inventory).where(Inventory.product_id == product_id)
                    )
                    inventory = inv_result.scalar_one_or_none()

                    if inventory and inventory.quantity >= qty_from_stock:
                        inventory.quantity -= qty_from_stock
                        inventory.last_updated = datetime.utcnow()

                        # Link product to item
                        item.product_id = UUID(product_id) if isinstance(product_id, str) else product_id

                        # Mark as READY (available for delivery)
                        item.item_status = OrderItemStatus.READY
                        item.status_updated_at = datetime.utcnow()
                    else:
                        # Not enough stock, send to production
                        item.item_status = OrderItemStatus.IN_PRODUCTION
                        item.status_updated_at = datetime.utcnow()
                else:
                    # No product match, send to production
                    item.item_status = OrderItemStatus.IN_PRODUCTION
                    item.status_updated_at = datetime.utcnow()

            else:  # action == "produce"
                # Send to production
                item.item_status = OrderItemStatus.IN_PRODUCTION
                item.status_updated_at = datetime.utcnow()

        await self.db.flush()

        # Sync order status based on items
        await self._sync_order_status_from_items(order_id, school_id)

        # Reload and return
        await self.db.refresh(order)
        return order

    async def _send_activation_email_if_needed(
        self,
        client_id: UUID,
        order_code: str
    ) -> bool:
        """
        Send activation email to client if they have email and are not verified.

        This allows clients created from internal UI to activate their account
        and see their order status in the web portal.

        Args:
            client_id: Client UUID
            order_code: Order code for context in email

        Returns:
            True if email was sent, False otherwise
        """
        # Get client
        result = await self.db.execute(
            select(Client).where(Client.id == client_id)
        )
        client = result.scalar_one_or_none()

        if not client:
            return False

        # Check if client has email and is not already verified
        if not client.email:
            print(f"[ORDER] Client {client.name} has no email, skipping activation")
            return False

        if client.is_verified:
            print(f"[ORDER] Client {client.name} already verified, skipping activation")
            return False

        # Check if token already exists and is valid
        if client.verification_token and client.verification_token_expires:
            if client.verification_token_expires > datetime.utcnow():
                print(f"[ORDER] Client {client.name} has valid token, skipping new email")
                return False

        # Generate new activation token (64 chars hex)
        activation_token = secrets.token_hex(32)

        # Set token expiration to 7 days
        client.verification_token = activation_token
        client.verification_token_expires = datetime.utcnow() + timedelta(days=7)

        await self.db.flush()

        # Send activation email
        try:
            sent = send_activation_email(
                email=client.email,
                token=activation_token,
                name=client.name
            )
            if sent:
                print(f"✅ [ORDER] Activation email sent to {client.email} for order {order_code}")
            else:
                print(f"⚠️ [ORDER] Failed to send activation email to {client.email}")
            return sent
        except Exception as e:
            print(f"❌ [ORDER] Error sending activation email: {e}")
            return False
