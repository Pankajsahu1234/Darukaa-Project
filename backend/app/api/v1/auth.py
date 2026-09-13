from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.user import (
    RefreshTokenRequest,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserOut,
)
from app.services.auth_service import auth_service

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new platform user",
)
async def register(
    user_in: UserCreate,
    db: AsyncSession = Depends(get_db),
):
    """Register an administrator or viewer user with email, password, and full name."""
    return await auth_service.register(db, user_in)


@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive JWT tokens",
)
async def login(
    credentials: UserLogin,
    db: AsyncSession = Depends(get_db),
):
    """Login with email and password to receive JWT access and refresh tokens."""
    return await auth_service.login(db, credentials)


@router.post(
    "/refresh",
    response_model=TokenResponse,
    summary="Rotate refresh token and get fresh access token",
)
async def refresh_token(
    refresh_in: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
):
    """Provide a valid refresh token to obtain a fresh access token without re-authenticating."""
    return await auth_service.refresh_tokens(db, refresh_in.refresh_token)


@router.get(
    "/me",
    response_model=UserOut,
    summary="Get current authenticated user profile",
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    """Return the profile details of the authenticated bearer token holder."""
    return UserOut.model_validate(current_user)
