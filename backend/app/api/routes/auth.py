"""
Authentication Endpoints
"""
from fastapi import APIRouter, HTTPException, status

from app.api.dependencies import DatabaseSession, CurrentUser
from app.schemas.user import LoginRequest, LoginResponse, Token, UserResponse, PasswordChange
from app.services.user import UserService


router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    login_data: LoginRequest,
    db: DatabaseSession
):
    """
    Login with username/email and password

    Returns JWT access token and user information
    """
    user_service = UserService(db)

    # Authenticate user
    user = await user_service.authenticate(
        login_data.username,
        login_data.password
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    # Create access token
    token = user_service.create_access_token(
        user_id=user.id,
        username=user.username
    )

    return LoginResponse(
        token=token,
        user=UserResponse.model_validate(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(
    current_user: CurrentUser
):
    """
    Get current authenticated user information
    """
    return UserResponse.model_validate(current_user)


@router.post("/change-password")
async def change_password(
    password_data: PasswordChange,
    current_user: CurrentUser,
    db: DatabaseSession
):
    """
    Change current user's password
    """
    user_service = UserService(db)

    try:
        success = await user_service.change_password(
            current_user.id,
            password_data
        )

        if not success:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to change password"
            )

        await db.commit()

        return {"message": "Password changed successfully"}

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
