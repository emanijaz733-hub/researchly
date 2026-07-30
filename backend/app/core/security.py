"""Password hashing and JWT access/refresh tokens."""
import datetime as dt
import uuid

import bcrypt
import jwt

from app.core.config import get_settings

ALGORITHM = "HS256"


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except ValueError:
        return False


def _create_token(subject: str, token_type: str, lifetime: dt.timedelta, role: str) -> str:
    settings = get_settings()
    now = dt.datetime.now(dt.timezone.utc)
    payload = {
        "sub": subject,
        "type": token_type,
        "role": role,
        "iat": now,
        "exp": now + lifetime,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def create_access_token(user_id: str, role: str = "user") -> str:
    settings = get_settings()
    return _create_token(user_id, "access", dt.timedelta(minutes=settings.access_token_minutes), role)


def create_refresh_token(user_id: str, role: str = "user") -> str:
    settings = get_settings()
    return _create_token(user_id, "refresh", dt.timedelta(days=settings.refresh_token_days), role)


def decode_token(token: str, expected_type: str) -> dict:
    """Decode and validate a token. Raises jwt exceptions on failure."""
    settings = get_settings()
    payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
    if payload.get("type") != expected_type:
        raise jwt.InvalidTokenError(f"expected {expected_type} token")
    return payload
