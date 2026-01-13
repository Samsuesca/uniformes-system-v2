import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from contextlib import asynccontextmanager
from pathlib import Path
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.limiter import limiter

logger = logging.getLogger(__name__)
from app.api.routes import health, auth, schools, products, clients, sales, orders, inventory, users, reports, accounting, global_products, global_accounting, contacts, payment_accounts, delivery_zones, dashboard, documents, fixed_expenses, employees, payroll, alterations, notifications


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
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.ENV != "production" else None,
    docs_url="/docs" if settings.ENV != "production" else None,
    redoc_url="/redoc" if settings.ENV != "production" else None,
    lifespan=lifespan
)

# Rate limiter - asignar al estado de la app
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Exception handler to log validation errors
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    logger.error(f"Validation error on {request.method} {request.url}: {exc.errors()}")
    return JSONResponse(
        status_code=400,
        content={"detail": exc.errors()}
    )


# Catch-all exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.exception(f"Unhandled exception on {request.method} {request.url}: {exc}")
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )


# Middleware to log requests for debugging
from starlette.middleware.base import BaseHTTPMiddleware

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # Log document upload requests (using print to ensure it shows)
        if request.url.path == "/api/v1/documents" and request.method == "POST":
            content_type = request.headers.get("content-type", "none")
            print(f"📄 Document upload request: content-type={content_type}")

        response = await call_next(request)

        # Log failed document uploads
        if request.url.path == "/api/v1/documents" and request.method == "POST" and response.status_code >= 400:
            logger.error(f"Document upload failed: status={response.status_code}")

        return response

# Logging middleware (added first so it runs after CORS)
app.add_middleware(RequestLoggingMiddleware)

# CORS - Allow specific origins
# NOTE: In FastAPI middleware is processed in LIFO order (last added = first executed)
# CORS middleware must be added LAST so it runs FIRST and handles preflight requests
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
app.include_router(fixed_expenses.router, prefix=f"{settings.API_V1_STR}")  # Fixed/recurring expenses
app.include_router(employees.router, prefix=f"{settings.API_V1_STR}")  # Employee management
app.include_router(payroll.router, prefix=f"{settings.API_V1_STR}")  # Payroll runs
app.include_router(global_products.router, prefix=f"{settings.API_V1_STR}")
app.include_router(contacts.router, prefix=f"{settings.API_V1_STR}")  # PQRS Contact messages
app.include_router(payment_accounts.router, prefix=f"{settings.API_V1_STR}")  # Payment accounts (bank accounts, QR)
app.include_router(delivery_zones.router, prefix=f"{settings.API_V1_STR}")  # Delivery zones for web orders
app.include_router(dashboard.router, prefix=f"{settings.API_V1_STR}")  # Global dashboard stats
app.include_router(documents.router, prefix=f"{settings.API_V1_STR}")  # Enterprise documents (superuser only)
app.include_router(alterations.router, prefix=f"{settings.API_V1_STR}")  # Alterations/repairs portal (global)
app.include_router(notifications.router, prefix=f"{settings.API_V1_STR}")  # User notifications

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
