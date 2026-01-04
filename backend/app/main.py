from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path

from app.core.config import settings
from app.api.routes import health, auth, schools, products, clients, sales, orders, inventory, users, reports, accounting, global_products, global_accounting, contacts, payment_accounts, delivery_zones


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Uniformes System API")
    yield
    # Shutdown
    print("🛑 Shutting down Uniformes System API")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="2.0.0",
    description="Sistema de Gestión de Uniformes - API REST",
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    lifespan=lifespan
)

# CORS - Allow specific origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}")
app.include_router(schools.router, prefix=f"{settings.API_V1_STR}")
app.include_router(users.router, prefix=f"{settings.API_V1_STR}")
app.include_router(products.router, prefix=f"{settings.API_V1_STR}")  # Multi-school products
app.include_router(products.school_router, prefix=f"{settings.API_V1_STR}")  # School-specific products
app.include_router(clients.router, prefix=f"{settings.API_V1_STR}")
app.include_router(clients.web_router, prefix=f"{settings.API_V1_STR}")  # Web portal client endpoints
app.include_router(sales.router, prefix=f"{settings.API_V1_STR}")  # Multi-school sales
app.include_router(sales.school_router, prefix=f"{settings.API_V1_STR}")  # School-specific sales
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}")  # Multi-school orders
app.include_router(orders.school_router, prefix=f"{settings.API_V1_STR}")  # School-specific orders
app.include_router(orders.web_router, prefix=f"{settings.API_V1_STR}")  # Web portal orders
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}")
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}")
app.include_router(accounting.router, prefix=f"{settings.API_V1_STR}")
app.include_router(global_accounting.router, prefix=f"{settings.API_V1_STR}")  # Global accounting endpoints
app.include_router(global_products.router, prefix=f"{settings.API_V1_STR}")
app.include_router(contacts.router, prefix=f"{settings.API_V1_STR}")  # PQRS Contact messages
app.include_router(payment_accounts.router, prefix=f"{settings.API_V1_STR}")  # Payment accounts (bank accounts, QR)
app.include_router(delivery_zones.router, prefix=f"{settings.API_V1_STR}")  # Delivery zones for web orders

# Mount static files for uploads (payment proofs, etc.)
# Use environment-based path: production uses /var/www/..., development uses relative path
if settings.ENV == "production":
    uploads_dir = Path("/var/www/uniformes-system-v2/uploads")
else:
    # Use relative path for development/testing
    uploads_dir = Path(__file__).parent.parent / "uploads"

try:
    uploads_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/uploads", StaticFiles(directory=str(uploads_dir)), name="uploads")
except PermissionError:
    # Skip mounting if we can't create the directory (e.g., in tests)
    print(f"⚠️ Could not create uploads directory at {uploads_dir}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True if settings.ENV == "development" else False
    )
