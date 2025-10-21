"""
Sale Service
"""
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sale import Sale, SaleItem, SaleStatus, SaleChange, ChangeStatus, ChangeType
from app.models.product import Product
from app.schemas.sale import SaleCreate, SaleUpdate, SaleChangeCreate, SaleChangeUpdate
from app.services.base import SchoolIsolatedService


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
        Create a new sale with items

        Args:
            sale_data: Sale creation data including items

        Returns:
            Created sale with items

        Raises:
            ValueError: If products not found or insufficient inventory
        """
        from app.services.inventory import InventoryService

        inv_service = InventoryService(self.db)

        # Generate sale code
        code = await self._generate_sale_code(sale_data.school_id)

        # Calculate totals and validate products
        items_data = []
        subtotal = Decimal("0")

        for item_data in sale_data.items:
            # Get product
            product = await self.db.execute(
                select(Product).where(
                    Product.id == item_data.product_id,
                    Product.school_id == sale_data.school_id,
                    Product.is_active == True
                )
            )
            product = product.scalar_one_or_none()

            if not product:
                raise ValueError(f"Producto {item_data.product_id} no encontrado")

            # Check inventory
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
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal
            })

            subtotal += item_subtotal

        # Total = subtotal (no tax for now)
        total = subtotal

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
            notes=sale_data.notes
        )

        self.db.add(sale)
        await self.db.flush()
        await self.db.refresh(sale)

        # Create sale items and reserve inventory
        for item_dict in items_data:
            item_dict["sale_id"] = sale.id
            sale_item = SaleItem(**item_dict)
            self.db.add(sale_item)

            # Reserve stock
            await inv_service.reserve_stock(
                item_dict["product_id"],
                sale_data.school_id,
                item_dict["quantity"]
            )

        await self.db.flush()

        return sale

    async def get_sale_with_items(
        self,
        sale_id: UUID,
        school_id: UUID
    ) -> Sale | None:
        """
        Get sale with items loaded

        Args:
            sale_id: Sale UUID
            school_id: School UUID

        Returns:
            Sale with items or None
        """
        result = await self.db.execute(
            select(Sale)
            .options(selectinload(Sale.items))
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
        school_id: UUID
    ) -> SaleChange:
        """
        Approve a sale change and execute inventory adjustments

        Args:
            change_id: SaleChange UUID
            school_id: School UUID

        Returns:
            Approved SaleChange

        Raises:
            ValueError: If change not found or already processed
        """
        from app.services.inventory import InventoryService

        inv_service = InventoryService(self.db)

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
        await inv_service.adjust_stock(
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

            await inv_service.adjust_stock(
                change.new_product_id,
                school_id,
                -change.new_quantity,
                f"Entrega - Cambio #{change.id}"
            )

        # 3. Update change status
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
