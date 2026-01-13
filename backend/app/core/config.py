from pydantic_settings import BaseSettings
from typing import List, Optional
import os


class Settings(BaseSettings):
    # Project
    PROJECT_NAME: str = "Uniformes System API"
    VERSION: str = "2.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Environment
    ENV: str = "development"
    DEBUG: bool = True
    
    # Database
    DATABASE_URL: str = "postgresql+asyncpg://uniformes_user:dev_password@localhost:5432/uniformes_db"
    
    # Redis
    REDIS_URL: str = "redis://localhost:6379"
    
    # Security
    SECRET_KEY: str = "your-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Server
    BACKEND_HOST: str = "0.0.0.0"  # Listen on all interfaces
    BACKEND_PORT: int = 8000

    # CORS - Lista restringida de origenes permitidos
    BACKEND_CORS_ORIGINS: List[str] = [
        # Desktop app (Tauri)
        "tauri://localhost",
        # Desarrollo local
        "http://localhost:3000",   # Web portal dev
        "http://localhost:3001",   # Admin portal dev
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
        # Produccion
        "https://uniformesconsuelorios.com",
        "https://www.uniformesconsuelorios.com",
        "https://api.uniformesconsuelorios.com",
        "https://admin.uniformesconsuelorios.com",
    ]

    # Email (Resend)
    RESEND_API_KEY: Optional[str] = None
    EMAIL_FROM: str = "Uniformes <noreply@resend.dev>"
    FRONTEND_URL: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
