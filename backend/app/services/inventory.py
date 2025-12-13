"""
Inventory Service
"""
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.product import Inventory, Product
from app.schemas.product import (
    InventoryCreate,
    InventoryUpdate,
    InventoryAdjust,
    LowStockProduct,
    InventoryReport,
)
from app.services.base import SchoolIsolatedService


class InventoryService(SchoolIsolatedService[Inventory]):
    """Service for Inventory operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Inventory, db)

    async def create_inventory(
        self,
        inventory_data: InventoryCreate
    ) -> Inventory:
        """
        Create inventory for a product

        Args:
            inventory_data: Inventory creation data

        Returns:
            Created inventory

        Raises:
            ValueError: If inventory already exists for product
        """
        # Check if inventory already exists for this product
        existing = await self.get_by_product(
            inventory_data.product_id,
            inventory_data.school_id
        )
        if existing:
            raise ValueError("Inventory already exists for this product")

        # Verify product exists and belongs to school
        product = await self.db.execute(
            select(Product).where(
                Product.id == inventory_data.product_id,
                Product.school_id == inventory_data.school_id
            )
        )
        if not product.scalar_one_or_none():
            raise ValueError("Product not found or does not belong to this school")

        return await self.create(inventory_data.model_dump())

    async def update_inventory(
        self,
        inventory_id: UUID,
        school_id: UUID,
        inventory_data: InventoryUpdate
    ) -> Inventory | None:
        """
        Update inventory

        Args:
            inventory_id: Inventory UUID
            school_id: School UUID
            inventory_data: Update data

        Returns:
            Updated inventory or None
        """
        update_dict = inventory_data.model_dump(exclude_unset=True)
        return await self.update(inventory_id, school_id, update_dict)

    async def get_by_product(
        self,
        product_id: UUID,
        school_id: UUID
    ) -> Inventory | None:
        """
        Get inventory by product

        Args:
            product_id: Product UUID
            school_id: School UUID

        Returns:
            Inventory or None
        """
        result = await self.db.execute(
            select(Inventory).where(
                Inventory.product_id == product_id,
                Inventory.school_id == school_id
            )
        )
        return result.scalar_one_or_none()

    async def adjust_quantity(
        self,
        product_id: UUID,
        school_id: UUID,
        adjust_data: InventoryAdjust
    ) -> Inventory | None:
        """
        Adjust inventory quantity

        Args:
            product_id: Product UUID
            school_id: School UUID
            adjust_data: Adjustment data (positive or negative)

        Returns:
            Updated inventory or None

        Raises:
            ValueError: If adjustment would result in negative quantity
        """
        inventory = await self.get_by_product(product_id, school_id)
        if not inventory:
            raise ValueError("Inventory not found for this product")

        new_quantity = inventory.quantity + adjust_data.adjustment

        if new_quantity < 0:
            raise ValueError(
                f"Insufficient inventory. Current: {inventory.quantity}, "
                f"Requested: {abs(adjust_data.adjustment)}"
            )

        # Update quantity directly on the model
        inventory.quantity = new_quantity
        await self.db.flush()
        await self.db.refresh(inventory)
        return inventory

    async def add_stock(
        self,
        product_id: UUID,
        school_id: UUID,
        quantity: int,
        reason: str | None = None
    ) -> Inventory | None:
        """
        Add stock to inventory

        Args:
            product_id: Product UUID
            school_id: School UUID
            quantity: Quantity to add (must be positive)
            reason: Optional reason for adding stock

        Returns:
            Updated inventory
        """
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        return await self.adjust_quantity(
            product_id,
            school_id,
            InventoryAdjust(adjustment=quantity, reason=reason)
        )

    async def remove_stock(
        self,
        product_id: UUID,
        school_id: UUID,
        quantity: int,
        reason: str | None = None
    ) -> Inventory | None:
        """
        Remove stock from inventory

        Args:
            product_id: Product UUID
            school_id: School UUID
            quantity: Quantity to remove (must be positive)
            reason: Optional reason for removing stock

        Returns:
            Updated inventory

        Raises:
            ValueError: If insufficient stock
        """
        if quantity <= 0:
            raise ValueError("Quantity must be positive")

        return await self.adjust_quantity(
            product_id,
            school_id,
            InventoryAdjust(adjustment=-quantity, reason=reason)
        )

    async def get_low_stock_products(
        self,
        school_id: UUID
    ) -> list[LowStockProduct]:
        """
        Get products with stock below minimum

        Args:
            school_id: School UUID

        Returns:
            List of low stock products
        """
        result = await self.db.execute(
            select(Inventory, Product)
            .join(Product, Inventory.product_id == Product.id)
            .where(
                Inventory.school_id == school_id,
                Inventory.quantity < Inventory.min_stock_alert,
                Product.is_active == True
            )
            .order_by(Inventory.quantity)
        )

        low_stock = []
        for inv, product in result.all():
            low_stock.append(
                LowStockProduct(
                    product_id=product.id,
                    product_code=product.code,
                    product_name=product.name,
                    size=product.size,
                    color=product.color,
                    current_quantity=inv.quantity,
                    min_stock_alert=inv.min_stock_alert,
                    difference=inv.min_stock_alert - inv.quantity
                )
            )

        return low_stock

    async def get_out_of_stock_products(
        self,
        school_id: UUID
    ) -> list[Product]:
        """
        Get products with zero stock

        Args:
            school_id: School UUID

        Returns:
            List of out of stock products
        """
        result = await self.db.execute(
            select(Product)
            .join(Inventory, Inventory.product_id == Product.id)
            .where(
                Inventory.school_id == school_id,
                Inventory.quantity == 0,
                Product.is_active == True
            )
            .order_by(Product.code)
        )

        return list(result.scalars().all())

    async def get_inventory_report(
        self,
        school_id: UUID
    ) -> InventoryReport:
        """
        Get complete inventory report for a school

        Args:
            school_id: School UUID

        Returns:
            InventoryReport with statistics
        """
        # Total products with inventory
        total_products = await self.db.execute(
            select(func.count(Inventory.id)).where(
                Inventory.school_id == school_id
            )
        )

        # Total stock value (quantity * cost)
        stock_value = await self.db.execute(
            select(func.sum(Inventory.quantity * Product.cost))
            .select_from(Inventory)
            .join(Product, Inventory.product_id == Product.id)
            .where(
                Inventory.school_id == school_id,
                Product.cost.isnot(None)
            )
        )

        # Low stock count
        low_stock_count = await self.db.execute(
            select(func.count(Inventory.id)).where(
                Inventory.school_id == school_id,
                Inventory.quantity < Inventory.min_stock_alert,
                Inventory.quantity > 0
            )
        )

        # Out of stock count
        out_of_stock_count = await self.db.execute(
            select(func.count(Inventory.id)).where(
                Inventory.school_id == school_id,
                Inventory.quantity == 0
            )
        )

        # Get low stock products
        low_stock_products = await self.get_low_stock_products(school_id)

        return InventoryReport(
            total_products=total_products.scalar_one(),
            total_stock_value=Decimal(stock_value.scalar_one() or 0),
            low_stock_count=low_stock_count.scalar_one(),
            out_of_stock_count=out_of_stock_count.scalar_one(),
            low_stock_products=low_stock_products
        )

    async def check_availability(
        self,
        product_id: UUID,
        school_id: UUID,
        quantity: int
    ) -> bool:
        """
        Check if product has enough stock

        Args:
            product_id: Product UUID
            school_id: School UUID
            quantity: Required quantity

        Returns:
            True if available, False otherwise
        """
        inventory = await self.get_by_product(product_id, school_id)
        if not inventory:
            return False

        return inventory.quantity >= quantity

    async def reserve_stock(
        self,
        product_id: UUID,
        school_id: UUID,
        quantity: int
    ) -> Inventory | None:
        """
        Reserve stock for a sale/order (decreases inventory)

        Args:
            product_id: Product UUID
            school_id: School UUID
            quantity: Quantity to reserve

        Returns:
            Updated inventory

        Raises:
            ValueError: If insufficient stock
        """
        return await self.remove_stock(
            product_id,
            school_id,
            quantity,
            reason="Reserved for sale/order"
        )

    async def release_stock(
        self,
        product_id: UUID,
        school_id: UUID,
        quantity: int
    ) -> Inventory | None:
        """
        Release reserved stock (increases inventory)
        Used when sale/order is cancelled

        Args:
            product_id: Product UUID
            school_id: School UUID
            quantity: Quantity to release

        Returns:
            Updated inventory
        """
        return await self.add_stock(
            product_id,
            school_id,
            quantity,
            reason="Released from cancelled sale/order"
        )
