"""
FastAPI Dependencies for authentication and database access
"""
from typing import Annotated
from uuid import UUID
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.user import TokenData
from app.services.user import UserService


# Security scheme for JWT Bearer tokens
security = HTTPBearer()


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(security)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """
    Dependency to get current authenticated user from JWT token

    Args:
        credentials: Bearer token from Authorization header
        db: Database session

    Returns:
        Current authenticated user

    Raises:
        HTTPException: 401 if token invalid or user not found
    """
    # Extract token
    token = credentials.credentials

    # Decode token
    user_service = UserService(db)
    token_data: TokenData | None = user_service.decode_token(token)

    if not token_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Get user from database
    user = await user_service.get(token_data.user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Dependency to ensure user is active

    Args:
        current_user: Current user from get_current_user

    Returns:
        Active user

    Raises:
        HTTPException: 403 if user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


async def get_current_superuser(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Dependency to ensure user is superuser

    Args:
        current_user: Current user from get_current_user

    Returns:
        Superuser

    Raises:
        HTTPException: 403 if user is not superuser
    """
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user


def require_school_access(required_role: UserRole | None = None):
    """
    Dependency factory to verify user has access to a school

    Args:
        required_role: Minimum required role (optional)

    Returns:
        Dependency function

    Usage:
        @router.get("/products")
        async def get_products(
            school_id: UUID,
            current_user: User = Depends(get_current_user),
            _: None = Depends(require_school_access(UserRole.VIEWER))
        ):
            ...
    """
    async def verify_school_access(
        school_id: UUID,
        current_user: Annotated[User, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)]
    ) -> None:
        """Verify user has access to school with required role"""
        # Superusers have access to everything
        if current_user.is_superuser:
            return

        # Check user has role in this school
        from app.services.user import UserService
        user_service = UserService(db)

        user_roles = await user_service.get_user_schools(current_user.id)
        school_role = next(
            (r for r in user_roles if r.school_id == school_id),
            None
        )

        if not school_role:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No access to this school"
            )

        # Check role level if required
        if required_role:
            role_hierarchy = {
                UserRole.VIEWER: 1,
                UserRole.SELLER: 2,
                UserRole.ADMIN: 3,
                UserRole.OWNER: 4
            }

            user_level = role_hierarchy.get(school_role.role, 0)
            required_level = role_hierarchy.get(required_role, 0)

            if user_level < required_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires {required_role.value} role or higher"
                )

    return verify_school_access


# Type aliases for common dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
CurrentSuperuser = Annotated[User, Depends(get_current_superuser)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]
