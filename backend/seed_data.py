"""
Seed Data Script - Populate database with sample data
Run: python seed_data.py
"""
import asyncio
from uuid import UUID
from decimal import Decimal

from app.db.session import AsyncSessionLocal
from app.schemas.user import UserCreate
from app.schemas.school import SchoolCreate, SchoolSettings
from app.services.user import UserService
from app.services.school import SchoolService


async def seed_database():
    """Seed database with sample data"""
    async with AsyncSessionLocal() as db:
        print("🌱 Seeding database...")

        # 1. Create Superuser
        print("\n1️⃣ Creating superuser...")
        user_service = UserService(db)

        try:
            superuser = await user_service.create_user(
                UserCreate(
                    username="admin",
                    email="admin@uniformes.com",
                    full_name="Administrador del Sistema",
                    password="Admin123",
                    is_superuser=True
                )
            )
            print(f"   ✅ Superuser created: {superuser.username}")
        except ValueError:
            print("   ℹ️  Superuser already exists")

        # 2. Create Demo School
        print("\n2️⃣ Creating demo school...")
        school_service = SchoolService(db)

        try:
            school = await school_service.create_school(
                SchoolCreate(
                    code="DEMO-001",
                    name="Colegio Demo",
                    email="contacto@colegiodemo.edu.co",
                    phone="3001234567",
                    address="Calle 123 #45-67, Bogotá",
                    primary_color="#1E40AF",
                    secondary_color="#10B981",
                    settings=SchoolSettings(
                        currency="COP",
                        tax_rate=19.0,
                        commission_per_garment=5000,
                        allow_credit_sales=True,
                        max_credit_days=30
                    )
                )
            )
            print(f"   ✅ School created: {school.name} ({school.code})")
        except ValueError:
            print("   ℹ️  School already exists")

        await db.commit()

        print("\n✅ Database seeded successfully!")
        print("\n📝 Login credentials:")
        print("   Username: admin")
        print("   Password: Admin123")
        print("\n🚀 Start the app:")
        print("   Backend:  uvicorn app.main:app --reload")
        print("   Frontend: cd frontend && npm run tauri:dev")


if __name__ == "__main__":
    asyncio.run(seed_database())
