from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.core.config import settings
from app.api.routes import health, inventory, sales, clients, reports


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

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["health"])
app.include_router(inventory.router, prefix=f"{settings.API_V1_STR}/inventory", tags=["inventory"])
app.include_router(sales.router, prefix=f"{settings.API_V1_STR}/sales", tags=["sales"])
app.include_router(clients.router, prefix=f"{settings.API_V1_STR}/clients", tags=["clients"])
app.include_router(reports.router, prefix=f"{settings.API_V1_STR}/reports", tags=["reports"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True if settings.ENV == "development" else False
    )
