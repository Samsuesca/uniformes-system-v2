"""
User Management Endpoints
"""
from uuid import UUID
from fastapi import APIRouter, HTTPException, status, Query, Depends

from app.api.dependencies import DatabaseSession, CurrentUser, CurrentSuperuser
from app.models.user import UserRole
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse,
    UserSchoolRoleCreate, UserSchoolRoleUpdate, UserSchoolRoleResponse
)
from app.services.user import UserService


router = APIRouter(prefix="/users", tags=["Users"])


# ==========================================
# User CRUD (Superuser only)
# ==========================================

@router.post(
    "",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
async def create_user(
    user_data: UserCreate,
    db: DatabaseSession,
    _: CurrentSuperuser
):
    """Create a new user (superuser only)"""
    user_service = UserService(db)

    try:
        user = await user_service.create_user(user_data)
        await db.commit()
        return UserResponse.model_validate(user)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get(
    "",
    response_model=list[UserResponse]
)
async def list_users(
    db: DatabaseSession,
    _: CurrentSuperuser,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100)
):
    """List all users (superuser only)"""
    user_service = UserService(db)
    users = await user_service.get_multi(skip=skip, limit=limit)

    return [UserResponse.model_validate(u) for u in users]


@router.get(
    "/{user_id}",
    response_model=UserResponse
)
async def get_user(
    user_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Get user by ID

    Users can see their own profile, superusers can see any user
    """
    # Check if user is requesting their own info or is superuser
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    user_service = UserService(db)
    user = await user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return UserResponse.model_validate(user)


@router.put(
    "/{user_id}",
    response_model=UserResponse
)
async def update_user(
    user_id: UUID,
    user_data: UserUpdate,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Update user information

    Users can update their own profile, superusers can update any user
    """
    # Check permissions
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    user_service = UserService(db)
    user = await user_service.update_user(user_id, user_data)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    await db.commit()
    return UserResponse.model_validate(user)


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
async def delete_user(
    user_id: UUID,
    db: DatabaseSession,
    current_user: CurrentSuperuser
):
    """
    Delete a user (superuser only)

    Note: Cannot delete yourself
    """
    # Prevent self-deletion
    if current_user.id == user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )

    user_service = UserService(db)
    user = await user_service.get(user_id)

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Delete user (cascade will remove school roles)
    await user_service.delete(user_id)
    await db.commit()


# ==========================================
# User-School Roles
# ==========================================

@router.post(
    "/{user_id}/schools/{school_id}/role",
    response_model=UserSchoolRoleResponse,
    status_code=status.HTTP_201_CREATED
)
async def add_user_school_role(
    user_id: UUID,
    school_id: UUID,
    role: UserRole,
    db: DatabaseSession,
    _: CurrentSuperuser
):
    """Add user role for a school (superuser only)"""
    user_service = UserService(db)

    try:
        school_role = await user_service.add_school_role(user_id, school_id, role)
        await db.commit()
        return UserSchoolRoleResponse.model_validate(school_role)

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.put(
    "/{user_id}/schools/{school_id}/role",
    response_model=UserSchoolRoleResponse
)
async def update_user_school_role(
    user_id: UUID,
    school_id: UUID,
    role: UserRole,
    db: DatabaseSession,
    _: CurrentSuperuser
):
    """Update user role for a school (superuser only)"""
    user_service = UserService(db)

    school_role = await user_service.update_school_role(user_id, school_id, role)

    if not school_role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User role not found for this school"
        )

    await db.commit()
    return UserSchoolRoleResponse.model_validate(school_role)


@router.delete(
    "/{user_id}/schools/{school_id}/role",
    status_code=status.HTTP_204_NO_CONTENT
)
async def remove_user_school_role(
    user_id: UUID,
    school_id: UUID,
    db: DatabaseSession,
    _: CurrentSuperuser
):
    """Remove user access from a school (superuser only)"""
    user_service = UserService(db)

    success = await user_service.remove_school_role(user_id, school_id)

    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User role not found for this school"
        )

    await db.commit()


@router.get(
    "/{user_id}/schools",
    response_model=list[UserSchoolRoleResponse]
)
async def get_user_schools(
    user_id: UUID,
    db: DatabaseSession,
    current_user: CurrentUser
):
    """
    Get all schools where user has access

    Users can see their own schools, superusers can see any user's schools
    """
    if current_user.id != user_id and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )

    user_service = UserService(db)
    school_roles = await user_service.get_user_schools(user_id)

    return [UserSchoolRoleResponse.model_validate(sr) for sr in school_roles]


@router.get(
    "/schools/{school_id}/users",
    response_model=list[UserSchoolRoleResponse]
)
async def get_school_users(
    school_id: UUID,
    db: DatabaseSession,
    _: CurrentSuperuser
):
    """Get all users with access to a school (superuser only)"""
    user_service = UserService(db)
    school_roles = await user_service.get_school_users(school_id)

    return [UserSchoolRoleResponse.model_validate(sr) for sr in school_roles]
