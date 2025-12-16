"""
Order Service (Encargos)

Contabilidad de Encargos:
- Sin IVA (tax = 0, total = subtotal)
- Al crear con anticipo: registra transacción de ingreso + cuenta por cobrar
- Al agregar abono: registra transacción de ingreso + actualiza cuenta por cobrar
- Cuando se cancela totalmente: la cuenta por cobrar queda saldada
"""
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.models.order import Order, OrderItem, OrderStatus, OrderItemStatus
from app.models.product import GarmentType, Product
from app.models.accounting import Transaction, TransactionType, AccPaymentMethod, AccountsReceivable
from app.schemas.order import OrderCreate, OrderUpdate, OrderPayment
from app.schemas.accounting import AccountsReceivableCreate
from app.services.base import SchoolIsolatedService

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
        payment_method = getattr(order_data, 'payment_method', None) or AccPaymentMethod.CASH

        # Create order
        order_dict = order_data.model_dump(exclude={'items', 'advance_payment', 'payment_method'})
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
        """Update order status"""
        return await self.update(
            order_id,
            school_id,
            {"status": new_status}
        )

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

        return await self.update(order_id, school_id, update_data)

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

            else:  # "custom"
                if not getattr(item_data, 'unit_price', None):
                    raise ValueError("unit_price requerido para encargos personalizados")
                unit_price = item_data.unit_price + additional_price

            item_subtotal = unit_price * item_data.quantity

            items_data.append({
                "school_id": order_data.school_id,
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

        # === CONTABILIDAD ===
        # Para pedidos web, el anticipo es generalmente 0 (pago contra entrega)
        # Si hay anticipo, crear transacción de ingreso + actualizar balance
        if paid_amount > Decimal("0"):
            transaction = Transaction(
                school_id=order_data.school_id,
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

        Returns:
            Dictionary with stock verification results
        """
        from app.models.product import Product, Inventory

        order = await self.get_order_with_items(order_id, school_id)
        if not order:
            raise ValueError("Pedido no encontrado")

        items_info = []
        items_in_stock = 0
        items_partial = 0
        items_to_produce = 0

        for item in order.items:
            # Skip cancelled items
            if item.item_status == OrderItemStatus.CANCELLED:
                continue

            # Try to find matching product
            product_query = (
                select(Product, Inventory.quantity)
                .outerjoin(Inventory, Product.id == Inventory.product_id)
                .where(
                    Product.school_id == school_id,
                    Product.garment_type_id == item.garment_type_id,
                    Product.is_active == True
                )
            )

            # Match by size if specified
            if item.size:
                product_query = product_query.where(Product.size == item.size)

            # Match by color if specified
            if item.color:
                product_query = product_query.where(Product.color == item.color)

            result = await self.db.execute(product_query)
            matches = result.all()

            # Find best match (with stock if possible)
            best_match = None
            best_stock = 0

            for product, inv_qty in matches:
                stock = inv_qty or 0
                if stock > best_stock:
                    best_match = product
                    best_stock = stock

            # If no exact match found, try to find any product of same garment type
            if not best_match:
                fallback_query = (
                    select(Product, Inventory.quantity)
                    .outerjoin(Inventory, Product.id == Inventory.product_id)
                    .where(
                        Product.school_id == school_id,
                        Product.garment_type_id == item.garment_type_id,
                        Product.is_active == True
                    )
                    .order_by(Inventory.quantity.desc().nullslast())
                    .limit(1)
                )
                result = await self.db.execute(fallback_query)
                row = result.first()
                if row:
                    best_match, best_stock = row
                    best_stock = best_stock or 0

            # Determine fulfillment
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

            # Has custom measurements? Always produce
            if item.custom_measurements:
                suggested_action = "produce"
                quantity_from_stock = 0
                quantity_to_produce = item.quantity
                items_to_produce += 1
                if can_fulfill or items_partial > 0:
                    items_in_stock = max(0, items_in_stock - 1)
                    items_partial = max(0, items_partial - 1)

            items_info.append({
                "item_id": str(item.id),
                "garment_type_id": str(item.garment_type_id),
                "garment_type_name": item.garment_type.name if item.garment_type else "Unknown",
                "size": item.size,
                "color": item.color,
                "quantity_requested": item.quantity,
                "product_id": str(best_match.id) if best_match else None,
                "product_code": best_match.code if best_match else None,
                "stock_available": best_stock,
                "can_fulfill_from_stock": can_fulfill and not item.custom_measurements,
                "quantity_from_stock": quantity_from_stock if not item.custom_measurements else 0,
                "quantity_to_produce": quantity_to_produce if not item.custom_measurements else item.quantity,
                "suggested_action": suggested_action,
                "has_custom_measurements": bool(item.custom_measurements),
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
