"""
Client Service
"""
from uuid import UUID
from decimal import Decimal
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.client import Client
from app.models.sale import Sale
from app.models.order import Order
from app.schemas.client import (
    ClientCreate,
    ClientUpdate,
    ClientSummary,
)
from app.services.base import SchoolIsolatedService


class ClientService(SchoolIsolatedService[Client]):
    """Service for Client operations"""

    def __init__(self, db: AsyncSession):
        super().__init__(Client, db)

    async def create_client(
        self,
        client_data: ClientCreate
    ) -> Client:
        """
        Create a new client with auto-generated code

        Args:
            client_data: Client creation data

        Returns:
            Created client
        """
        # Generate client code
        code = await self._generate_client_code(client_data.school_id)

        client_dict = client_data.model_dump()
        client_dict['code'] = code

        return await self.create(client_dict)

    async def update_client(
        self,
        client_id: UUID,
        school_id: UUID,
        client_data: ClientUpdate
    ) -> Client | None:
        """
        Update client

        Args:
            client_id: Client UUID
            school_id: School UUID
            client_data: Update data

        Returns:
            Updated client or None
        """
        update_dict = client_data.model_dump(exclude_unset=True)
        return await self.update(client_id, school_id, update_dict)

    async def get_active_clients(
        self,
        school_id: UUID,
        skip: int = 0,
        limit: int = 100
    ) -> list[Client]:
        """
        Get active clients for a school

        Args:
            school_id: School UUID
            skip: Pagination offset
            limit: Maximum results

        Returns:
            List of active clients
        """
        return await self.get_multi(
            school_id=school_id,
            skip=skip,
            limit=limit,
            filters={"is_active": True}
        )

    async def search_clients(
        self,
        school_id: UUID,
        search_term: str,
        limit: int = 20
    ) -> list[Client]:
        """
        Search clients by code, name, email, phone, or student name

        Args:
            school_id: School UUID
            search_term: Search term
            limit: Maximum results

        Returns:
            List of matching clients
        """
        result = await self.db.execute(
            select(Client).where(
                Client.school_id == school_id,
                Client.is_active == True,
                (
                    Client.code.ilike(f"%{search_term}%") |
                    Client.name.ilike(f"%{search_term}%") |
                    Client.email.ilike(f"%{search_term}%") |
                    Client.phone.ilike(f"%{search_term}%") |
                    Client.student_name.ilike(f"%{search_term}%")
                )
            ).limit(limit).order_by(Client.name)
        )
        return list(result.scalars().all())

    async def get_by_document(
        self,
        school_id: UUID,
        document_type: str,
        document_number: str
    ) -> Client | None:
        """
        Get client by document

        Args:
            school_id: School UUID
            document_type: Document type (CC, CE, TI, etc.)
            document_number: Document number

        Returns:
            Client or None
        """
        result = await self.db.execute(
            select(Client).where(
                Client.school_id == school_id,
                Client.document_type == document_type.upper(),
                Client.document_number == document_number
            )
        )
        return result.scalar_one_or_none()

    async def get_by_email(
        self,
        school_id: UUID,
        email: str
    ) -> Client | None:
        """
        Get client by email

        Args:
            school_id: School UUID
            email: Email address

        Returns:
            Client or None
        """
        result = await self.db.execute(
            select(Client).where(
                Client.school_id == school_id,
                Client.email == email.lower()
            )
        )
        return result.scalar_one_or_none()

    async def get_by_phone(
        self,
        school_id: UUID,
        phone: str
    ) -> Client | None:
        """
        Get client by phone number

        Args:
            school_id: School UUID
            phone: Phone number

        Returns:
            Client or None
        """
        result = await self.db.execute(
            select(Client).where(
                Client.school_id == school_id,
                Client.phone == phone
            )
        )
        return result.scalar_one_or_none()

    async def get_client_summary(
        self,
        client_id: UUID,
        school_id: UUID
    ) -> ClientSummary | None:
        """
        Get client with purchase statistics

        Args:
            client_id: Client UUID
            school_id: School UUID

        Returns:
            ClientSummary or None
        """
        client = await self.get(client_id, school_id)
        if not client:
            return None

        # Count total purchases (completed sales)
        total_purchases = await self.db.execute(
            select(func.count(Sale.id)).where(
                Sale.client_id == client_id,
                Sale.school_id == school_id,
                Sale.status == "completed"
            )
        )

        # Sum total spent
        total_spent = await self.db.execute(
            select(func.coalesce(func.sum(Sale.total), 0)).where(
                Sale.client_id == client_id,
                Sale.school_id == school_id,
                Sale.status == "completed"
            )
        )

        # Count pending orders
        pending_orders = await self.db.execute(
            select(func.count(Order.id)).where(
                Order.client_id == client_id,
                Order.school_id == school_id,
                Order.status.in_(["pending", "in_production"])
            )
        )

        # Get last purchase date
        last_purchase = await self.db.execute(
            select(Sale.created_at).where(
                Sale.client_id == client_id,
                Sale.school_id == school_id,
                Sale.status == "completed"
            ).order_by(Sale.created_at.desc()).limit(1)
        )

        last_purchase_date = last_purchase.scalar_one_or_none()

        return ClientSummary(
            id=client.id,
            code=client.code,
            name=client.name,
            phone=client.phone,
            email=client.email,
            student_name=client.student_name,
            total_purchases=total_purchases.scalar_one(),
            total_spent=float(total_spent.scalar_one()),
            pending_orders=pending_orders.scalar_one(),
            last_purchase_date=last_purchase_date.isoformat() if last_purchase_date else None
        )

    async def get_clients_by_grade(
        self,
        school_id: UUID,
        student_grade: str
    ) -> list[Client]:
        """
        Get clients by student grade

        Args:
            school_id: School UUID
            student_grade: Student grade (e.g., "5to Grado")

        Returns:
            List of clients
        """
        result = await self.db.execute(
            select(Client).where(
                Client.school_id == school_id,
                Client.student_grade == student_grade,
                Client.is_active == True
            ).order_by(Client.student_name)
        )
        return list(result.scalars().all())

    async def _generate_client_code(self, school_id: UUID) -> str:
        """
        Generate unique client code for school

        Format: CLI-{sequence:04d}
        Example: CLI-0001, CLI-0002, etc.

        Args:
            school_id: School UUID

        Returns:
            Generated client code
        """
        # Get count of clients in school
        count = await self.count(school_id)

        # Generate code with padding
        sequence = count + 1
        code = f"CLI-{sequence:04d}"

        # Verify uniqueness (in case of deletions)
        existing = await self.get_by_code(code, school_id)
        if existing:
            # Find next available number
            result = await self.db.execute(
                select(func.max(Client.code)).where(
                    Client.school_id == school_id,
                    Client.code.like("CLI-%")
                )
            )
            max_code = result.scalar_one_or_none()

            if max_code:
                try:
                    last_num = int(max_code.split('-')[1])
                    code = f"CLI-{last_num + 1:04d}"
                except (IndexError, ValueError):
                    code = f"CLI-{sequence:04d}"

        return code

    async def get_top_clients(
        self,
        school_id: UUID,
        limit: int = 10
    ) -> list[ClientSummary]:
        """
        Get top clients by total spent

        Args:
            school_id: School UUID
            limit: Number of clients to return

        Returns:
            List of top clients
        """
        # Get clients with total spent
        result = await self.db.execute(
            select(
                Client.id,
                Client.code,
                Client.name,
                Client.phone,
                Client.email,
                Client.student_name,
                func.coalesce(func.sum(Sale.total), 0).label('total_spent'),
                func.count(Sale.id).label('total_purchases')
            )
            .outerjoin(Sale, Sale.client_id == Client.id)
            .where(
                Client.school_id == school_id,
                Client.is_active == True
            )
            .group_by(Client.id)
            .order_by(func.coalesce(func.sum(Sale.total), 0).desc())
            .limit(limit)
        )

        top_clients = []
        for row in result.all():
            top_clients.append(
                ClientSummary(
                    id=row.id,
                    code=row.code,
                    name=row.name,
                    phone=row.phone,
                    email=row.email,
                    student_name=row.student_name,
                    total_purchases=row.total_purchases,
                    total_spent=float(row.total_spent),
                    pending_orders=0,  # Could be calculated if needed
                    last_purchase_date=None
                )
            )

        return top_clients
