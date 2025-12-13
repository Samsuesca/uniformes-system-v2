"""
School Service
"""
from uuid import UUID
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.school import School
from app.schemas.school import SchoolCreate, SchoolUpdate, SchoolSummary
from app.services.base import BaseService


class SchoolService(BaseService[School]):
    """Service for School operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(School, db)

    async def create_school(self, school_data: SchoolCreate) -> School:
        """
        Create a new school

        Args:
            school_data: School creation data

        Returns:
            Created school instance

        Raises:
            ValueError: If school code already exists
        """
        # Check if code already exists
        existing = await self.get_by_code(school_data.code)
        if existing:
            raise ValueError(f"School with code '{school_data.code}' already exists")

        # Convert settings to dict if it's a Pydantic model
        data_dict = school_data.model_dump()
        if hasattr(school_data.settings, 'model_dump'):
            data_dict['settings'] = school_data.settings.model_dump()

        return await self.create(data_dict)

    async def update_school(self, school_id: UUID, school_data: SchoolUpdate) -> School | None:
        """
        Update school information

        Args:
            school_id: School UUID
            school_data: School update data

        Returns:
            Updated school or None if not found
        """
        update_dict = school_data.model_dump(exclude_unset=True)
        return await self.update(school_id, update_dict)

    async def get_by_code(self, code: str) -> School | None:
        """
        Get school by code

        Args:
            code: School code

        Returns:
            School instance or None
        """
        result = await self.db.execute(
            select(School).where(School.code == code.upper())
        )
        return result.scalar_one_or_none()

    async def get_by_slug(self, slug: str) -> School | None:
        """
        Get school by slug

        Args:
            slug: School slug (URL-friendly identifier)

        Returns:
            School instance or None
        """
        result = await self.db.execute(
            select(School).where(School.slug == slug.lower())
        )
        return result.scalar_one_or_none()

    async def get_active_schools(self, skip: int = 0, limit: int = 100) -> list[School]:
        """
        Get all active schools

        Args:
            skip: Pagination offset
            limit: Maximum results

        Returns:
            List of active schools
        """
        return await self.get_multi(skip=skip, limit=limit, filters={"is_active": True})

    async def get_school_summary(self, school_id: UUID) -> SchoolSummary | None:
        """
        Get school with summary statistics

        Args:
            school_id: School UUID

        Returns:
            School summary or None if not found
        """
        from app.models.product import Product
        from app.models.client import Client
        from app.models.sale import Sale

        school = await self.get(school_id)
        if not school:
            return None

        # Count related entities
        products_count = await self.db.execute(
            select(func.count(Product.id)).where(Product.school_id == school_id)
        )
        clients_count = await self.db.execute(
            select(func.count(Client.id)).where(Client.school_id == school_id)
        )
        sales_count = await self.db.execute(
            select(func.count(Sale.id)).where(Sale.school_id == school_id)
        )

        return SchoolSummary(
            id=school.id,
            code=school.code,
            name=school.name,
            total_products=products_count.scalar_one(),
            total_clients=clients_count.scalar_one(),
            total_sales=sales_count.scalar_one(),
            is_active=school.is_active
        )

    async def activate_school(self, school_id: UUID) -> School | None:
        """
        Activate a school

        Args:
            school_id: School UUID

        Returns:
            Updated school or None
        """
        return await self.update(school_id, {"is_active": True})

    async def deactivate_school(self, school_id: UUID) -> School | None:
        """
        Deactivate a school (soft delete)

        Args:
            school_id: School UUID

        Returns:
            Updated school or None
        """
        return await self.soft_delete(school_id)

    async def count_active(self) -> int:
        """
        Count active schools

        Returns:
            Number of active schools
        """
        return await self.count(filters={"is_active": True})

    async def search_by_name(self, name: str, limit: int = 10) -> list[School]:
        """
        Search schools by name (case-insensitive, partial match)

        Args:
            name: Search term
            limit: Maximum results

        Returns:
            List of matching schools
        """
        result = await self.db.execute(
            select(School)
            .where(School.name.ilike(f"%{name}%"))
            .limit(limit)
            .order_by(School.name)
        )
        return list(result.scalars().all())
