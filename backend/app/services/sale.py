"""
Sale Service

Contabilidad de Ventas:
- Las ventas efectivas (CASH, TRANSFER, CARD) crean transacción de ingreso + actualizan balance
- Las ventas a crédito (CREDIT) solo crean cuenta por cobrar, no afectan Caja/Banco
- Las ventas históricas pueden saltarse la creación de transacciones
"""
from uuid import UUID
from datetime import datetime, date
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sale import Sale, SaleItem, SalePayment, SaleStatus, SaleChange, ChangeStatus, ChangeType, PaymentMethod
from app.models.product import Product, GlobalProduct
from app.models.client import Client
from app.models.accounting import Transaction, TransactionType, AccPaymentMethod, AccountsReceivable
from app.schemas.sale import SaleCreate, SaleUpdate, SaleChangeCreate, SaleChangeUpdate, AddPaymentToSale
from app.services.base import SchoolIsolatedService
from app.services.global_product import GlobalInventoryService
from app.services.email import send_welcome_with_activation_email
import secrets
from datetime import timedelta


class SaleService(SchoolIsolatedService[Sale]):
    """Service for Sale operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Sale, db)

    async def create_sale(
        self,
        sale_data: SaleCreate,
        user_id: UUID | None = None
    ) -> Sale:
        """
        Create a new sale with items (supports both school and global products)

        Args:
            sale_data: Sale creation data including items

        Returns:
            Created sale with items

        Raises:
            ValueError: If products not found or insufficient inventory
        """
        from app.services.inventory import InventoryService
        from app.schemas.product import GlobalInventoryAdjust

        inv_service = InventoryService(self.db)
        global_inv_service = GlobalInventoryService(self.db)

        # Check if this is a historical sale (migration)
        is_historical = sale_data.is_historical

        # Debug logging for historical sales
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"Creating sale - is_historical: {is_historical}, sale_date from request: {sale_data.sale_date}")

        # Generate sale code
        code = await self._generate_sale_code(sale_data.school_id)

        # Calculate totals and validate products
        items_data = []
        subtotal = Decimal("0")

        for item_data in sale_data.items:
            if item_data.is_global:
                # Handle global product
                result = await self.db.execute(
                    select(GlobalProduct).where(
                        GlobalProduct.id == item_data.product_id,
                        GlobalProduct.is_active == True
                    )
                )
                global_product = result.scalar_one_or_none()

                if not global_product:
                    raise ValueError(f"Producto global {item_data.product_id} no encontrado")

                # Check global inventory ONLY for non-historical sales
                if not is_historical:
                    global_inv = await global_inv_service.get_by_product(global_product.id)
                    if not global_inv or global_inv.quantity < item_data.quantity:
                        raise ValueError(
                            f"Stock insuficiente para el producto global {global_product.code}"
                        )

                # Calculate item totals
                unit_price = global_product.price
                item_subtotal = unit_price * item_data.quantity

                items_data.append({
                    "global_product_id": global_product.id,
                    "product_id": None,
                    "is_global_product": True,
                    "quantity": item_data.quantity,
                    "unit_price": unit_price,
                    "subtotal": item_subtotal
                })

                subtotal += item_subtotal
            else:
                # Handle school product (original logic)
                result = await self.db.execute(
                    select(Product).where(
                        Product.id == item_data.product_id,
                        Product.school_id == sale_data.school_id,
                        Product.is_active == True
                    )
                )
                product = result.scalar_one_or_none()

                if not product:
                    raise ValueError(f"Producto {item_data.product_id} no encontrado")

                # Check inventory ONLY for non-historical sales
                if not is_historical:
                    has_stock = await inv_service.check_availability(
                        product.id,
                        sale_data.school_id,
                        item_data.quantity
                    )

                    if not has_stock:
                        raise ValueError(
                            f"Stock insuficiente para el producto {product.code}"
                        )

                # Calculate item totals
                unit_price = product.price
                item_subtotal = unit_price * item_data.quantity

                items_data.append({
                    "product_id": product.id,
                    "global_product_id": None,
                    "is_global_product": False,
                    "quantity": item_data.quantity,
                    "unit_price": unit_price,
                    "subtotal": item_subtotal
                })

                subtotal += item_subtotal

        # Total = subtotal (no tax for now)
        total = subtotal

        # Determine sale date (use custom date for historical sales)
        # Colombia timezone is UTC-5
        from datetime import timezone, timedelta
        colombia_tz = timezone(timedelta(hours=-5))

        if is_historical and sale_data.sale_date:
            # Use the date provided for historical sales (keep as-is, it's already a date)
            sale_date = sale_data.sale_date
            logger.info(f"Using custom sale_date for historical sale: {sale_date}")
        else:
            # For current sales, use Colombia time
            sale_date = datetime.now(colombia_tz).replace(tzinfo=None)
            logger.info(f"Using Colombia datetime: {sale_date} (is_historical={is_historical}, sale_data.sale_date={sale_data.sale_date})")

        # Create sale (only use fields that exist in the model)
        sale = Sale(
            school_id=sale_data.school_id,
            code=code,
            client_id=sale_data.client_id,
            user_id=user_id or sale_data.school_id,  # Use provided user_id or fallback
            status=SaleStatus.COMPLETED,
            payment_method=sale_data.payment_method,
            total=total,
            paid_amount=total,  # Assuming full payment
            is_historical=is_historical,
            sale_date=sale_date,
            notes=sale_data.notes
        )

        self.db.add(sale)
        await self.db.flush()
        await self.db.refresh(sale)

        # Create sale items and reserve inventory (SKIP inventory for historical sales)
        for item_dict in items_data:
            item_dict["sale_id"] = sale.id
            sale_item = SaleItem(**item_dict)
            self.db.add(sale_item)

            # Only adjust inventory for NON-historical sales
            if not is_historical:
                if item_dict["is_global_product"]:
                    # Reserve global stock
                    await global_inv_service.adjust_quantity(
                        item_dict["global_product_id"],
                        GlobalInventoryAdjust(
                            adjustment=-item_dict["quantity"],
                            reason=f"Venta {code}"
                        )
                    )
                else:
                    # Reserve school stock
                    await inv_service.reserve_stock(
                        item_dict["product_id"],
                        sale_data.school_id,
                        item_dict["quantity"]
                    )

        await self.db.flush()

        # === PAGOS MÚLTIPLES ===
        # Si se proporcionan pagos múltiples, crearlos
        if sale_data.payments:
            # Validar que la suma de pagos iguale el total
            total_payments = sum(p.amount for p in sale_data.payments)
            if total_payments != total:
                raise ValueError(
                    f"La suma de pagos ({total_payments}) no coincide con el total ({total})"
                )

            for payment_data in sale_data.payments:
                payment = SalePayment(
                    sale_id=sale.id,
                    amount=payment_data.amount,
                    payment_method=payment_data.payment_method,
                    notes=payment_data.notes
                )
                self.db.add(payment)

            await self.db.flush()

        # === CONTABILIDAD ===
        # Solo para ventas no históricas
        if not is_historical and sale.total > Decimal("0"):
            # Mapear payment_method de Sale a AccPaymentMethod
            payment_method_map = {
                PaymentMethod.CASH: AccPaymentMethod.CASH,
                PaymentMethod.NEQUI: AccPaymentMethod.NEQUI,
                PaymentMethod.TRANSFER: AccPaymentMethod.TRANSFER,
                PaymentMethod.CARD: AccPaymentMethod.CARD,
                PaymentMethod.CREDIT: AccPaymentMethod.CREDIT,
            }

            # Determinar pagos a procesar
            # Si hay múltiples pagos, procesarlos individualmente
            # Si hay un solo payment_method, usarlo para toda la venta
            payments_to_process = []

            if sale_data.payments:
                # Múltiples pagos - procesar cada uno
                for payment_data in sale_data.payments:
                    payments_to_process.append({
                        "amount": payment_data.amount,
                        "method": payment_data.payment_method
                    })
            elif sale.payment_method:
                # Pago único tradicional
                payments_to_process.append({
                    "amount": sale.total,
                    "method": sale.payment_method
                })

            # Validar que hay pagos para procesar
            if not payments_to_process:
                raise ValueError(
                    "No se proporcionaron pagos válidos. Use 'payments' con montos > 0 "
                    "o especifique 'payment_method'"
                )

            # Procesar cada pago
            credit_total = Decimal("0")
            for payment_info in payments_to_process:
                acc_payment_method = payment_method_map.get(
                    payment_info["method"],
                    AccPaymentMethod.CASH
                )

                # CREDIT no afecta cuentas de balance - solo genera cuenta por cobrar
                if payment_info["method"] == PaymentMethod.CREDIT:
                    credit_total += payment_info["amount"]
                else:
                    # Ventas efectivas: crear transacción de ingreso
                    transaction = Transaction(
                        school_id=sale.school_id,
                        type=TransactionType.INCOME,
                        amount=payment_info["amount"],
                        payment_method=acc_payment_method,
                        description=f"Venta {sale.code}" + (f" ({payment_info['method'].value if hasattr(payment_info['method'], 'value') else payment_info['method']})" if len(payments_to_process) > 1 else ""),
                        category="sales",
                        reference_code=sale.code,
                        transaction_date=sale.sale_date.date() if hasattr(sale.sale_date, 'date') else sale.sale_date,
                        sale_id=sale.id,
                        created_by=user_id
                    )
                    self.db.add(transaction)
                    await self.db.flush()

                    # Apply balance integration (agrega a Caja/Banco)
                    # Wrapped in try-catch so sales don't fail if balance integration has issues
                    try:
                        from app.services.balance_integration import BalanceIntegrationService
                        balance_service = BalanceIntegrationService(self.db)
                        await balance_service.apply_transaction_to_balance(transaction, user_id)
                    except Exception as e:
                        # Log the error but don't fail the sale
                        import logging
                        logging.error(f"Balance integration failed for sale {sale.code}: {e}")

            # Crear cuenta por cobrar si hay monto a crédito
            if credit_total > Decimal("0"):
                receivable = AccountsReceivable(
                    school_id=sale.school_id,
                    client_id=sale.client_id,
                    sale_id=sale.id,
                    amount=credit_total,
                    description=f"Venta a crédito {sale.code}",
                    invoice_date=sale.sale_date.date() if hasattr(sale.sale_date, 'date') else sale.sale_date,
                    due_date=None,  # Sin fecha de vencimiento definida
                    created_by=user_id
                )
                self.db.add(receivable)

        await self.db.flush()

        # Refresh sale with items and payments loaded
        await self.db.refresh(sale, ["items", "payments"])

        # === ENVIAR EMAIL DE BIENVENIDA EN PRIMERA TRANSACCIÓN ===
        # Solo para ventas no históricas con cliente asociado
        if not is_historical and sale.client_id:
            await self._send_welcome_email_if_first_transaction(sale.client_id, sale.code)

        return sale

    async def get_sale_with_items(
        self,
        sale_id: UUID,
        school_id: UUID
    ) -> Sale | None:
        """
        Get sale with items and payments loaded (including product relationships)

        Args:
            sale_id: Sale UUID
            school_id: School UUID

        Returns:
            Sale with items and payments or None
        """
        from app.models.sale import SaleItem
        from app.models.product import Product, GlobalProduct

        result = await self.db.execute(
            select(Sale)
            .options(
                selectinload(Sale.items).selectinload(SaleItem.product),
                selectinload(Sale.items).selectinload(SaleItem.global_product),
                selectinload(Sale.payments)
            )
            .where(
                Sale.id == sale_id,
                Sale.school_id == school_id
            )
        )
        return result.scalar_one_or_none()

    async def _generate_sale_code(self, school_id: UUID) -> str:
        """Generate sale code: VNT-YYYY-NNNN"""
        year = datetime.now().year
        prefix = f"VNT-{year}-"

        # Count sales for this year
        count = await self.db.execute(
            select(func.count(Sale.id)).where(
                Sale.school_id == school_id,
                Sale.code.like(f"{prefix}%")
            )
        )

        sequence = count.scalar_one() + 1
        return f"{prefix}{sequence:04d}"

    # ============================================
    # Sale Changes (Cambios y Devoluciones)
    # ============================================

    async def create_sale_change(
        self,
        sale_id: UUID,
        school_id: UUID,
        user_id: UUID,
        change_data: SaleChangeCreate
    ) -> SaleChange:
        """
        Create a sale change request (size change, product change, return, defect)

        Args:
            sale_id: Sale UUID
            school_id: School UUID
            user_id: User creating the change
            change_data: Change request data

        Returns:
            Created SaleChange

        Raises:
            ValueError: If validation fails
        """
        from app.services.inventory import InventoryService

        inv_service = InventoryService(self.db)

        # 1. Validate sale exists and belongs to school
        sale = await self.get(sale_id, school_id)
        if not sale:
            raise ValueError("Venta no encontrada")

        if sale.status == SaleStatus.CANCELLED:
            raise ValueError("No se puede modificar una venta cancelada")

        # 2. Get original sale item
        original_item_result = await self.db.execute(
            select(SaleItem)
            .options(selectinload(SaleItem.product))
            .where(
                SaleItem.id == change_data.original_item_id,
                SaleItem.sale_id == sale_id
            )
        )
        original_item = original_item_result.scalar_one_or_none()

        if not original_item:
            raise ValueError("Producto original de la venta no encontrado")

        if change_data.returned_quantity > original_item.quantity:
            raise ValueError("La cantidad a devolver no puede exceder la cantidad original")

        # 3. Initialize change record
        new_unit_price = None
        price_adjustment = Decimal("0")
        new_product = None

        # 4. Handle change types that require new product
        if change_data.change_type != ChangeType.RETURN:
            if not change_data.new_product_id:
                raise ValueError(f"{change_data.change_type.value} requiere un nuevo producto")

            # Get new product
            new_product_result = await self.db.execute(
                select(Product).where(
                    Product.id == change_data.new_product_id,
                    Product.school_id == school_id,
                    Product.is_active == True
                )
            )
            new_product = new_product_result.scalar_one_or_none()

            if not new_product:
                raise ValueError("Nuevo producto no encontrado o inactivo")

            # Check stock availability
            has_stock = await inv_service.check_availability(
                new_product.id,
                school_id,
                change_data.new_quantity
            )

            if not has_stock:
                raise ValueError(f"Stock insuficiente para el producto {new_product.code}")

            # Calculate price adjustment
            new_unit_price = new_product.price
            price_adjustment = (
                (new_unit_price * change_data.new_quantity) -
                (original_item.unit_price * change_data.returned_quantity)
            )
        else:
            # Pure return - negative price adjustment (refund)
            price_adjustment = -(original_item.unit_price * change_data.returned_quantity)

        # 5. Create change record
        change = SaleChange(
            sale_id=sale_id,
            original_item_id=original_item.id,
            user_id=user_id,
            change_type=change_data.change_type,
            returned_quantity=change_data.returned_quantity,
            new_product_id=change_data.new_product_id,
            new_quantity=change_data.new_quantity,
            new_unit_price=new_unit_price,
            price_adjustment=price_adjustment,
            reason=change_data.reason,
            status=ChangeStatus.PENDING
        )

        self.db.add(change)
        await self.db.flush()
        await self.db.refresh(change)

        return change

    async def approve_sale_change(
        self,
        change_id: UUID,
        school_id: UUID,
        payment_method: PaymentMethod = PaymentMethod.CASH,
        approved_by: UUID | None = None
    ) -> SaleChange:
        """
        Approve a sale change and execute inventory + accounting adjustments

        Args:
            change_id: SaleChange UUID
            school_id: School UUID
            payment_method: Payment method for price adjustment (refund/additional payment)
            approved_by: User ID who approved the change

        Returns:
            Approved SaleChange

        Raises:
            ValueError: If change not found or already processed

        Accounting Logic:
            - price_adjustment > 0: Customer pays more → INCOME transaction
            - price_adjustment < 0: Refund to customer → EXPENSE transaction
            - price_adjustment = 0: No financial transaction needed
        """
        from app.services.inventory import InventoryService
        from app.services.balance_integration import BalanceIntegrationService

        inv_service = InventoryService(self.db)
        balance_service = BalanceIntegrationService(self.db)

        # Get change with related data
        result = await self.db.execute(
            select(SaleChange)
            .options(
                selectinload(SaleChange.sale),
                selectinload(SaleChange.original_item).selectinload(SaleItem.product)
            )
            .where(SaleChange.id == change_id)
        )
        change = result.scalar_one_or_none()

        if not change:
            raise ValueError("Solicitud de cambio no encontrada")

        if change.sale.school_id != school_id:
            raise ValueError("El cambio no pertenece a este colegio")

        if change.status != ChangeStatus.PENDING:
            raise ValueError(f"Change already {change.status.value}")

        # Execute inventory adjustments
        # 1. Return original product to inventory
        await inv_service.add_stock(
            change.original_item.product_id,
            school_id,
            change.returned_quantity,
            f"Devolución - Cambio #{change.id}"
        )

        # 2. Deduct new product from inventory (if applicable)
        if change.new_product_id:
            # Double-check stock before finalizing
            has_stock = await inv_service.check_availability(
                change.new_product_id,
                school_id,
                change.new_quantity
            )

            if not has_stock:
                raise ValueError("Stock ya no disponible para el nuevo producto")

            await inv_service.remove_stock(
                change.new_product_id,
                school_id,
                change.new_quantity,
                f"Entrega - Cambio #{change.id}"
            )

        # 3. Create accounting transaction if there's a price adjustment
        # Convert payment_method to string for comparison (handles both enum and string)
        payment_method_str = payment_method.value if hasattr(payment_method, 'value') else str(payment_method)
        if change.price_adjustment != 0 and payment_method_str != 'credit':
            # Map to AccPaymentMethod (accepts string value like 'cash', 'nequi', etc.)
            acc_payment_method = AccPaymentMethod(payment_method_str)

            if change.price_adjustment > 0:
                # Customer pays more → INCOME
                transaction = Transaction(
                    school_id=school_id,
                    type=TransactionType.INCOME,
                    amount=Decimal(str(abs(change.price_adjustment))),
                    payment_method=acc_payment_method,
                    description=f"Diferencia cobrada - Cambio venta {change.sale.code}",
                    category="sale_changes",
                    reference_code=f"CHG-{change.sale.code}",
                    transaction_date=date.today(),
                    sale_id=change.sale_id,
                    created_by=approved_by
                )
            else:
                # Refund to customer → EXPENSE
                transaction = Transaction(
                    school_id=school_id,
                    type=TransactionType.EXPENSE,
                    amount=Decimal(str(abs(change.price_adjustment))),
                    payment_method=acc_payment_method,
                    description=f"Reembolso - Cambio venta {change.sale.code}",
                    category="sale_changes",
                    reference_code=f"CHG-{change.sale.code}",
                    transaction_date=date.today(),
                    sale_id=change.sale_id,
                    created_by=approved_by
                )

            self.db.add(transaction)
            await self.db.flush()

            # Update balance account (Caja/Banco)
            await balance_service.apply_transaction_to_balance(transaction, approved_by)

        # 4. Update change status
        change.status = ChangeStatus.APPROVED
        await self.db.flush()
        await self.db.refresh(change)

        return change

    async def reject_sale_change(
        self,
        change_id: UUID,
        school_id: UUID,
        rejection_reason: str
    ) -> SaleChange:
        """
        Reject a sale change request

        Args:
            change_id: SaleChange UUID
            school_id: School UUID
            rejection_reason: Reason for rejection

        Returns:
            Rejected SaleChange

        Raises:
            ValueError: If change not found or already processed
        """
        result = await self.db.execute(
            select(SaleChange)
            .options(selectinload(SaleChange.sale))
            .where(SaleChange.id == change_id)
        )
        change = result.scalar_one_or_none()

        if not change:
            raise ValueError("Solicitud de cambio no encontrada")

        if change.sale.school_id != school_id:
            raise ValueError("El cambio no pertenece a este colegio")

        if change.status != ChangeStatus.PENDING:
            raise ValueError(f"Change already {change.status.value}")

        change.status = ChangeStatus.REJECTED
        change.rejection_reason = rejection_reason

        await self.db.flush()
        await self.db.refresh(change)

        return change

    async def get_sale_changes(
        self,
        sale_id: UUID,
        school_id: UUID
    ) -> list[SaleChange]:
        """
        Get all changes for a sale

        Args:
            sale_id: Sale UUID
            school_id: School UUID

        Returns:
            List of SaleChanges
        """
        # Verify sale belongs to school
        sale = await self.get(sale_id, school_id)
        if not sale:
            raise ValueError("Venta no encontrada")

        result = await self.db.execute(
            select(SaleChange)
            .where(SaleChange.sale_id == sale_id)
            .order_by(SaleChange.created_at.desc())
        )

        return list(result.scalars().all())

    # ============================================
    # Add Payment to Existing Sale
    # ============================================

    async def add_payment_to_sale(
        self,
        sale_id: UUID,
        school_id: UUID,
        payment_data: AddPaymentToSale,
        user_id: UUID
    ) -> SalePayment:
        """
        Add a payment to an existing sale (for fixing sales without payment records)

        Args:
            sale_id: Sale UUID
            school_id: School UUID
            payment_data: Payment data including amount, method, and accounting flag
            user_id: User adding the payment

        Returns:
            Created SalePayment

        Raises:
            ValueError: If sale not found or payment exceeds remaining balance
        """
        import logging
        logger = logging.getLogger(__name__)

        # Get sale with payments
        result = await self.db.execute(
            select(Sale)
            .options(selectinload(Sale.payments))
            .where(
                Sale.id == sale_id,
                Sale.school_id == school_id
            )
        )
        sale = result.scalar_one_or_none()

        if not sale:
            raise ValueError("Venta no encontrada")

        # Calculate existing payments total
        existing_payments_total = sum(p.amount for p in sale.payments)
        remaining_balance = sale.total - existing_payments_total

        # Validate payment amount doesn't exceed remaining
        if payment_data.amount > remaining_balance:
            raise ValueError(
                f"El monto ({payment_data.amount}) excede el saldo pendiente ({remaining_balance})"
            )

        # Create SalePayment record
        payment = SalePayment(
            sale_id=sale.id,
            amount=payment_data.amount,
            payment_method=payment_data.payment_method,
            notes=payment_data.notes
        )
        self.db.add(payment)
        await self.db.flush()

        # Apply accounting if requested
        if payment_data.apply_accounting and payment_data.amount > Decimal("0"):
            payment_method_map = {
                PaymentMethod.CASH: AccPaymentMethod.CASH,
                PaymentMethod.NEQUI: AccPaymentMethod.NEQUI,
                PaymentMethod.TRANSFER: AccPaymentMethod.TRANSFER,
                PaymentMethod.CARD: AccPaymentMethod.CARD,
                PaymentMethod.CREDIT: AccPaymentMethod.CREDIT,
            }

            acc_payment_method = payment_method_map.get(
                payment_data.payment_method,
                AccPaymentMethod.CASH
            )

            if payment_data.payment_method == PaymentMethod.CREDIT:
                # Credit payment → Create AccountsReceivable
                receivable = AccountsReceivable(
                    school_id=sale.school_id,
                    client_id=sale.client_id,
                    sale_id=sale.id,
                    amount=payment_data.amount,
                    description=f"Pago agregado a venta {sale.code} (crédito)",
                    invoice_date=sale.sale_date.date() if hasattr(sale.sale_date, 'date') else sale.sale_date,
                    due_date=None,
                    created_by=user_id
                )
                self.db.add(receivable)
                logger.info(f"Created AccountsReceivable for sale {sale.code}: {payment_data.amount}")
            else:
                # Effective payment → Create Transaction + Update Balance
                transaction = Transaction(
                    school_id=sale.school_id,
                    type=TransactionType.INCOME,
                    amount=payment_data.amount,
                    payment_method=acc_payment_method,
                    description=f"Pago agregado a venta {sale.code}",
                    category="sales",
                    reference_code=sale.code,
                    transaction_date=sale.sale_date.date() if hasattr(sale.sale_date, 'date') else sale.sale_date,
                    sale_id=sale.id,
                    created_by=user_id
                )
                self.db.add(transaction)
                await self.db.flush()

                # Link transaction to payment
                payment.transaction_id = transaction.id

                # Apply balance integration
                try:
                    from app.services.balance_integration import BalanceIntegrationService
                    balance_service = BalanceIntegrationService(self.db)
                    await balance_service.apply_transaction_to_balance(transaction, user_id)
                    logger.info(f"Applied balance for sale {sale.code}: {payment_data.amount} via {acc_payment_method.value}")
                except Exception as e:
                    logger.error(f"Balance integration failed for payment on sale {sale.code}: {e}")
                    raise ValueError(f"Error al aplicar contabilidad: {str(e)}")

        await self.db.flush()
        await self.db.refresh(payment)

        # Update sale's paid_amount
        sale.paid_amount = existing_payments_total + payment_data.amount
        await self.db.flush()

        return payment

    # ============================================
    # Welcome Email on First Transaction
    # ============================================

    async def _send_welcome_email_if_first_transaction(
        self,
        client_id: UUID,
        sale_code: str
    ) -> bool:
        """
        Send welcome email with activation link on client's FIRST transaction.

        This is the preferred approach:
        - NOT sent when client is created
        - SENT when client has their first order or sale
        - Includes activation link, portal instructions, and business contact info

        Args:
            client_id: Client UUID
            sale_code: Sale code for context in email

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

        # Check if client has email
        if not client.email:
            print(f"[SALE] Client {client.name} has no email, skipping welcome email")
            return False

        # Check if welcome email was already sent (not first transaction)
        if client.welcome_email_sent:
            print(f"[SALE] Client {client.name} already received welcome email, skipping")
            return False

        # Generate new activation token (64 chars hex)
        activation_token = secrets.token_hex(32)

        # Set token expiration to 7 days
        client.verification_token = activation_token
        client.verification_token_expires = datetime.utcnow() + timedelta(days=7)

        # Mark welcome email as sent
        client.welcome_email_sent = True
        client.welcome_email_sent_at = datetime.utcnow()

        await self.db.flush()

        # Send welcome email with activation link
        try:
            sent = send_welcome_with_activation_email(
                email=client.email,
                token=activation_token,
                name=client.name,
                transaction_type="compra"
            )
            if sent:
                print(f"✅ [SALE] Welcome email sent to {client.email} for sale {sale_code}")
            else:
                print(f"⚠️ [SALE] Failed to send welcome email to {client.email}")
                # Rollback the flag if email failed
                client.welcome_email_sent = False
                client.welcome_email_sent_at = None
                await self.db.flush()
            return sent
        except Exception as e:
            print(f"❌ [SALE] Error sending welcome email: {e}")
            # Rollback the flag if email failed
            client.welcome_email_sent = False
            client.welcome_email_sent_at = None
            await self.db.flush()
            return False
