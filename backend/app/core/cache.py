"""Cache and rate limiting with Redis, falling back to in-memory stores.

The fallback keeps local development zero-dependency; docker-compose wires
Redis in via NEXUS_REDIS_URL.
"""
import time

from app.core.config import get_settings

try:
    import redis.asyncio as aioredis
except ImportError:  # pragma: no cover
    aioredis = None

_redis = None
_memory_cache: dict[str, tuple[float, str]] = {}
_memory_hits: dict[str, list[float]] = {}


async def _get_redis():
    global _redis
    settings = get_settings()
    if settings.redis_url and aioredis and _redis is None:
        _redis = aioredis.from_url(settings.redis_url, decode_responses=True)
    return _redis


async def cache_get(key: str) -> str | None:
    r = await _get_redis()
    if r:
        try:
            return await r.get(key)
        except Exception:
            pass
    entry = _memory_cache.get(key)
    if entry and entry[0] > time.monotonic():
        return entry[1]
    _memory_cache.pop(key, None)
    return None


async def cache_set(key: str, value: str, ttl: int) -> None:
    r = await _get_redis()
    if r:
        try:
            await r.set(key, value, ex=ttl)
            return
        except Exception:
            pass
    _memory_cache[key] = (time.monotonic() + ttl, value)


async def rate_limit_allow(identity: str) -> bool:
    """Sliding-window rate limit. Returns True if the request is allowed."""
    settings = get_settings()
    window = settings.rate_limit_window_seconds
    limit = settings.rate_limit_requests
    r = await _get_redis()
    if r:
        try:
            key = f"rl:{identity}"
            count = await r.incr(key)
            if count == 1:
                await r.expire(key, window)
            return count <= limit
        except Exception:
            pass
    now = time.monotonic()
    hits = [t for t in _memory_hits.get(identity, []) if t > now - window]
    hits.append(now)
    _memory_hits[identity] = hits
    return len(hits) <= limit


_memory_revoked: dict[str, float] = {}


async def revoke_jti(jti: str, ttl: int) -> None:
    """Mark a token id as revoked until it would have expired anyway."""
    r = await _get_redis()
    if r:
        try:
            await r.set(f"revoked:{jti}", "1", ex=max(ttl, 1))
            return
        except Exception:
            pass
    _memory_revoked[jti] = time.monotonic() + ttl


async def is_jti_revoked(jti: str) -> bool:
    r = await _get_redis()
    if r:
        try:
            return await r.get(f"revoked:{jti}") is not None
        except Exception:
            pass
    expiry = _memory_revoked.get(jti)
    if expiry is None:
        return False
    if expiry <= time.monotonic():
        _memory_revoked.pop(jti, None)
        return False
    return True
