"""
Sale Service
"""
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.sale import Sale, SaleItem, SaleStatus
from app.models.product import Product
from app.schemas.sale import SaleCreate, SaleUpdate
from app.services.base import SchoolIsolatedService


class SaleService(SchoolIsolatedService[Sale]):
    """Service for Sale operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Sale, db)

    async def create_sale(
        self,
        sale_data: SaleCreate
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
                raise ValueError(f"Product {item_data.product_id} not found")

            # Check inventory
            has_stock = await inv_service.check_availability(
                product.id,
                sale_data.school_id,
                item_data.quantity
            )

            if not has_stock:
                raise ValueError(
                    f"Insufficient stock for product {product.code}"
                )

            # Calculate item totals
            unit_price = product.price
            item_subtotal = unit_price * item_data.quantity

            items_data.append({
                "school_id": sale_data.school_id,
                "product_id": product.id,
                "quantity": item_data.quantity,
                "unit_price": unit_price,
                "subtotal": item_subtotal
            })

            subtotal += item_subtotal

        # Calculate tax (from school settings - 19% default)
        tax_rate = Decimal("0.19")  # TODO: Get from school settings
        tax = subtotal * tax_rate
        total = subtotal + tax

        # Create sale
        sale_dict = sale_data.model_dump(exclude={'items'})
        sale_dict.update({
            "code": code,
            "status": SaleStatus.COMPLETED,
            "subtotal": subtotal,
            "tax": tax,
            "total": total
        })

        sale = Sale(**sale_dict)
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
