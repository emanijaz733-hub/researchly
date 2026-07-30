import jwt
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, rate_limited
from app.core.cache import is_jti_revoked, revoke_jti
from app.core.database import get_session
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models import User, Workspace
from app.schemas.api import LoginRequest, RefreshRequest, RegisterRequest, TokenPair, UserOut

from fastapi.security import HTTPBearer

_bearer = HTTPBearer(auto_error=False)

router = APIRouter(prefix="/auth", tags=["auth"], dependencies=[Depends(rate_limited)])


@router.post("/register", response_model=TokenPair, status_code=201)
async def register(body: RegisterRequest, session: AsyncSession = Depends(get_session)):
    existing = await session.scalar(select(User).where(User.email == body.email))
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")
    user = User(email=body.email, name=body.name, password_hash=hash_password(body.password))
    session.add(user)
    await session.flush()
    session.add(Workspace(name="My research", owner_id=user.id))
    await session.commit()
    return TokenPair(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
    )


@router.post("/login", response_model=TokenPair)
async def login(body: LoginRequest, session: AsyncSession = Depends(get_session)):
    user = await session.scalar(select(User).where(User.email == body.email))
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Incorrect email or password")
    return TokenPair(
        access_token=create_access_token(user.id, user.role),
        refresh_token=create_refresh_token(user.id, user.role),
    )


@router.post("/refresh", response_model=TokenPair)
async def refresh(body: RefreshRequest):
    """Rotate the refresh token: the presented token is revoked and a new
    pair is issued, so a stolen refresh token can be used at most once."""
    try:
        payload = decode_token(body.refresh_token, "refresh")
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired refresh token")
    if await is_jti_revoked(payload["jti"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token has been revoked")
    await revoke_jti(payload["jti"], _remaining_ttl(payload))
    return TokenPair(
        access_token=create_access_token(payload["sub"], payload.get("role", "user")),
        refresh_token=create_refresh_token(payload["sub"], payload.get("role", "user")),
    )


@router.post("/logout", status_code=204)
async def logout(body: RefreshRequest, creds=Depends(_bearer)):
    """Revoke the refresh token, and the access token if one was sent."""
    try:
        payload = decode_token(body.refresh_token, "refresh")
        await revoke_jti(payload["jti"], _remaining_ttl(payload))
    except jwt.PyJWTError:
        pass  # already invalid/expired: logout is idempotent
    if creds is not None:
        try:
            access = decode_token(creds.credentials, "access")
            await revoke_jti(access["jti"], _remaining_ttl(access))
        except jwt.PyJWTError:
            pass


def _remaining_ttl(payload: dict) -> int:
    import datetime as dt
    now = dt.datetime.now(dt.timezone.utc).timestamp()
    return max(int(payload["exp"] - now), 1)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return UserOut(id=user.id, email=user.email, name=user.name, role=user.role)
