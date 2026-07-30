"""Search endpoints: JSON results and an SSE stream that interleaves
provider status, ranked results, and the AI answer."""
import json

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.answer import generate_followups, stream_answer
from app.api.deps import get_optional_user, rate_limited
from app.core.cache import cache_get, cache_set
from app.core.config import get_settings
from app.core.database import get_session
from app.models import SearchRecord, User
from app.providers.registry import all_providers, get_providers
from app.schemas.api import ProviderStatus, ResultOut, SearchRequest
from app.search.orchestrator import SearchOrchestrator

router = APIRouter(prefix="/search", tags=["search"], dependencies=[Depends(rate_limited)])


def _result_out(r) -> dict:
    return ResultOut(
        id=r.id, title=r.title, url=r.url, snippet=r.snippet,
        provider=r.provider, score=r.score, published_at=r.published_at,
    ).model_dump()


@router.get("/providers")
async def list_providers():
    return [
        {"name": p.name, "description": p.description, "enabled_by_default": p.enabled_by_default}
        for p in all_providers().values()
    ]


@router.post("")
async def search(
    body: SearchRequest,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(get_optional_user),
):
    settings = get_settings()
    cache_key = f"search:{body.query}:{','.join(sorted(body.providers or []))}"
    cached = await cache_get(cache_key)
    if cached:
        return json.loads(cached)

    orchestrator = SearchOrchestrator()
    outcome = await orchestrator.search(body.query, get_providers(body.providers))

    payload = {
        "query": body.query,
        "results": [_result_out(r) for r in outcome.results],
        "providers": [
            ProviderStatus(name=rep.name, ok=rep.ok, latency_ms=rep.latency_ms,
                           result_count=rep.result_count, error=rep.error).model_dump()
            for rep in outcome.reports
        ],
        "latency_ms": outcome.total_latency_ms,
    }
    await cache_set(cache_key, json.dumps(payload), settings.cache_ttl_seconds)

    session.add(SearchRecord(
        user_id=user.id if user else None,
        query=body.query,
        providers=",".join(r.name for r in outcome.reports),
        result_count=len(outcome.results),
        latency_ms=outcome.total_latency_ms,
    ))
    await session.commit()
    return payload


@router.post("/stream")
async def search_stream(
    body: SearchRequest,
    session: AsyncSession = Depends(get_session),
    user: User | None = Depends(get_optional_user),
):
    """Server-sent events: `providers` → `results` → `answer` deltas → `done`."""

    async def event_stream():
        orchestrator = SearchOrchestrator()
        outcome = await orchestrator.search(body.query, get_providers(body.providers))

        yield _sse("providers", [
            {"name": r.name, "ok": r.ok, "latency_ms": r.latency_ms,
             "result_count": r.result_count, "error": r.error}
            for r in outcome.reports
        ])
        yield _sse("results", [_result_out(r) for r in outcome.results])

        answer_parts: list[str] = []
        async for delta in stream_answer(body.query, outcome.results):
            answer_parts.append(delta)
            yield _sse("answer", {"delta": delta})

        followups = await generate_followups(body.query, "".join(answer_parts))
        if followups:
            yield _sse("followups", followups)
        yield _sse("done", {"latency_ms": outcome.total_latency_ms})

        session.add(SearchRecord(
            user_id=user.id if user else None,
            query=body.query,
            providers=",".join(r.name for r in outcome.reports),
            result_count=len(outcome.results),
            latency_ms=outcome.total_latency_ms,
        ))
        await session.commit()

    return StreamingResponse(event_stream(), media_type="text/event-stream",
                             headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"
