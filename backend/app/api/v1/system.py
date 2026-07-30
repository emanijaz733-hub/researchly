"""Health and lightweight metrics."""
import time

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import require_admin
from app.core.database import get_session
from app.models import SearchRecord, User

router = APIRouter(tags=["system"])
_started = time.monotonic()


@router.get("/health")
async def health():
    return {"status": "ok", "uptime_seconds": int(time.monotonic() - _started)}


@router.get("/metrics", dependencies=[Depends(require_admin)])
async def metrics(session: AsyncSession = Depends(get_session)):
    searches = await session.scalar(select(func.count(SearchRecord.id)))
    users = await session.scalar(select(func.count(User.id)))
    avg_latency = await session.scalar(select(func.avg(SearchRecord.latency_ms)))
    recent = await session.scalars(
        select(SearchRecord).order_by(SearchRecord.created_at.desc()).limit(20))
    return {
        "total_searches": searches or 0,
        "total_users": users or 0,
        "avg_search_latency_ms": round(avg_latency or 0, 1),
        "recent_searches": [
            {"query": s.query, "providers": s.providers, "results": s.result_count,
             "latency_ms": s.latency_ms, "at": str(s.created_at)}
            for s in recent
        ],
    }
