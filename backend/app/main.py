from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import health, auth, schools, products, clients, sales, orders, inventory, users, reports, accounting


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

# CORS - Allow all origins in development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["Health"])
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}")
app.include_router(schools.router, prefix=f"{settings.API_V1_STR}")
app.include_router(users.router, prefix=f"{settings.API_V1_STR}")
app.include_router(products.router, prefix=f"{settings.API_V1_STR}")
app.include_router(clients.router, prefix=f"{settings.API_V1_STR}")
app.include_router(sales.router, prefix=f"{settings.API_V1_STR}")
app.include_router(orders.router, prefix=f"{settings.API_V1_STR}")
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}")
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}")
app.include_router(accounting.router, prefix=f"{settings.API_V1_STR}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.BACKEND_HOST,
        port=settings.BACKEND_PORT,
        reload=True if settings.ENV == "development" else False
    )
