"""
FastAPI Dependencies for authentication, authorization, and database access

Role Hierarchy (highest to lowest):
- OWNER (4): Full access + user management + school settings
- ADMIN (3): Full business data (sales, inventory, accounting, reports)
- SELLER (2): Create/read sales, read inventory, manage clients/orders
- VIEWER (1): Read-only access

Superusers (is_superuser=True) bypass ALL role checks.
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


# Role hierarchy levels for permission checking
ROLE_HIERARCHY = {
    UserRole.VIEWER: 1,
    UserRole.SELLER: 2,
    UserRole.ADMIN: 3,
    UserRole.OWNER: 4
}

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
    Dependency factory to verify user has access to a school with required role.

    Args:
        required_role: Minimum required role. If None, only checks school access.

    Returns:
        Dependency function that validates access

    Usage:
        @router.get("/products")
        async def get_products(
            school_id: UUID,
            current_user: User = Depends(get_current_user),
            _: None = Depends(require_school_access(UserRole.VIEWER))
        ):
            ...

    Role requirements by operation type:
        - Read operations: VIEWER or higher
        - Create sales/orders: SELLER or higher
        - Update inventory/prices: ADMIN or higher
        - Delete/cancel operations: ADMIN or higher
        - User management: OWNER or higher
        - School settings: OWNER or higher
    """
    async def verify_school_access(
        school_id: UUID,
        current_user: Annotated[User, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)]
    ) -> None:
        """Verify user has access to school with required role"""
        # Superusers bypass ALL role checks
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
            user_level = ROLE_HIERARCHY.get(school_role.role, 0)
            required_level = ROLE_HIERARCHY.get(required_role, 0)

            if user_level < required_level:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires {required_role.value} role or higher"
                )

    return verify_school_access


def require_any_role(*roles: UserRole):
    """
    Dependency factory to verify user has ANY of the specified roles.

    Useful when multiple roles can perform an action but not in hierarchy order.

    Args:
        *roles: Roles that can access this resource

    Usage:
        @router.post("/changes/approve")
        async def approve_change(
            school_id: UUID,
            _: None = Depends(require_any_role(UserRole.ADMIN, UserRole.OWNER))
        ):
            ...
    """
    async def verify_role(
        school_id: UUID,
        current_user: Annotated[User, Depends(get_current_user)],
        db: Annotated[AsyncSession, Depends(get_db)]
    ) -> None:
        """Verify user has one of the specified roles"""
        # Superusers bypass ALL role checks
        if current_user.is_superuser:
            return

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

        if school_role.role not in roles:
            role_names = ", ".join(r.value for r in roles)
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of: {role_names}"
            )

    return verify_role


async def get_user_school_role(
    school_id: UUID,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> UserRole | None:
    """
    Get the user's role for a specific school.

    Returns:
        UserRole if user has access, None otherwise.
        For superusers, returns OWNER (highest level).
    """
    if current_user.is_superuser:
        return UserRole.OWNER

    from app.services.user import UserService
    user_service = UserService(db)

    user_roles = await user_service.get_user_schools(current_user.id)
    school_role = next(
        (r for r in user_roles if r.school_id == school_id),
        None
    )

    return school_role.role if school_role else None


# Type aliases for common dependencies
CurrentUser = Annotated[User, Depends(get_current_user)]
CurrentActiveUser = Annotated[User, Depends(get_current_active_user)]
CurrentSuperuser = Annotated[User, Depends(get_current_superuser)]
DatabaseSession = Annotated[AsyncSession, Depends(get_db)]


# Permission check helpers
def can_manage_users(role: UserRole | None) -> bool:
    """Check if role can manage users (OWNER only)"""
    return role == UserRole.OWNER


def can_access_accounting(role: UserRole | None) -> bool:
    """Check if role can access accounting (ADMIN or higher)"""
    if role is None:
        return False
    return ROLE_HIERARCHY.get(role, 0) >= ROLE_HIERARCHY[UserRole.ADMIN]


def can_modify_inventory(role: UserRole | None) -> bool:
    """Check if role can modify inventory (ADMIN or higher)"""
    if role is None:
        return False
    return ROLE_HIERARCHY.get(role, 0) >= ROLE_HIERARCHY[UserRole.ADMIN]


def can_create_sales(role: UserRole | None) -> bool:
    """Check if role can create sales (SELLER or higher)"""
    if role is None:
        return False
    return ROLE_HIERARCHY.get(role, 0) >= ROLE_HIERARCHY[UserRole.SELLER]


def can_delete_records(role: UserRole | None) -> bool:
    """Check if role can delete records (ADMIN or higher)"""
    if role is None:
        return False
    return ROLE_HIERARCHY.get(role, 0) >= ROLE_HIERARCHY[UserRole.ADMIN]
